from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List
from datetime import date, datetime, timedelta

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.models import (
    ChatSession, Task, Subject, Insight, TaskStatus, TaskSource
)
from app.schemas.schemas import (
    ChatRequest, ChatResponse, ChatSessionResponse, TaskCreate
)
from app.services.llm_service import llm_service

router = APIRouter(prefix="/chat", tags=["chat"])


async def get_user_context(user_id: int, db: AsyncSession) -> dict:
    """Gather context about the user's progress for the chatbot."""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    # Today's tasks
    result = await db.execute(
        select(func.count(Task.id)).where(
            and_(Task.user_id == user_id, Task.scheduled_date == today)
        )
    )
    today_total = result.scalar() or 0

    result = await db.execute(
        select(func.count(Task.id)).where(
            and_(
                Task.user_id == user_id,
                Task.scheduled_date == today,
                Task.status == TaskStatus.COMPLETED
            )
        )
    )
    today_completed = result.scalar() or 0

    # Week completion rate
    result = await db.execute(
        select(
            func.count(Task.id).label('total'),
            func.count(Task.id).filter(Task.status == TaskStatus.COMPLETED).label('completed')
        ).where(
            and_(
                Task.user_id == user_id,
                Task.scheduled_date >= week_start,
                Task.scheduled_date <= today
            )
        )
    )
    week_data = result.one()
    week_rate = (week_data.completed or 0) / (week_data.total or 1)

    # Calculate streak
    streak = 0
    check_date = today
    while True:
        result = await db.execute(
            select(func.count(Task.id)).where(
                and_(
                    Task.user_id == user_id,
                    Task.scheduled_date == check_date,
                    Task.status == TaskStatus.COMPLETED
                )
            )
        )
        if result.scalar() > 0:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            if check_date == today:
                # Today not complete yet, check yesterday
                check_date -= timedelta(days=1)
                continue
            break

    # Subject performance
    result = await db.execute(
        select(
            Subject.name,
            func.count(Task.id).label('total'),
            func.count(Task.id).filter(Task.status == TaskStatus.COMPLETED).label('completed')
        ).join(Task, Task.subject_id == Subject.id).where(
            Task.user_id == user_id
        ).group_by(Subject.id, Subject.name)
    )

    weak_subjects = []
    strong_subjects = []
    for row in result.all():
        rate = (row.completed or 0) / (row.total or 1)
        if rate < 0.5:
            weak_subjects.append(row.name)
        elif rate > 0.8:
            strong_subjects.append(row.name)

    # Recent insights
    result = await db.execute(
        select(Insight.content).where(
            and_(
                Insight.user_id == user_id,
                Insight.is_read == False
            )
        ).order_by(Insight.generated_at.desc()).limit(3)
    )
    insights = [row[0] for row in result.all()]

    return {
        "today_tasks_count": today_total,
        "today_completed": today_completed,
        "week_completion_rate": week_rate,
        "streak": streak,
        "weak_subjects": weak_subjects[:3] if weak_subjects else ["None identified"],
        "strong_subjects": strong_subjects[:3] if strong_subjects else ["None identified"],
        "recent_insights": "; ".join(insights) if insights else "No recent insights"
    }


@router.post("", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a message to the GATE mentor chatbot."""
    user_id = int(current_user["sub"])

    # Get or create session
    if request.session_id:
        result = await db.execute(
            select(ChatSession).where(
                and_(
                    ChatSession.id == request.session_id,
                    ChatSession.user_id == user_id
                )
            )
        )
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        session = ChatSession(
            user_id=user_id,
            title=request.message[:50] + "..." if len(request.message) > 50 else request.message,
            messages=[]
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    # Add user message to history
    messages = session.messages or []
    messages.append({
        "role": "user",
        "content": request.message,
        "timestamp": datetime.utcnow().isoformat()
    })

    # Get context
    context = await get_user_context(user_id, db)

    # Call LLM
    response_text, action = await llm_service.mentor_chat(
        request.message,
        messages[:-1],  # Exclude the message we just added
        context
    )

    # Handle actions
    tasks_created = None
    action_taken = None

    if action:
        if action.get("action") == "create_tasks":
            tasks_data = action.get("tasks", [])
            created = []
            for task_data in tasks_data:
                # Find subject
                subject_name = task_data.get("subject", "")
                result = await db.execute(
                    select(Subject).where(Subject.name.ilike(f"%{subject_name}%"))
                )
                subject = result.scalar_one_or_none()

                try:
                    scheduled_date = date.fromisoformat(task_data.get("scheduled_date", str(date.today())))
                except:
                    scheduled_date = date.today()

                task = Task(
                    user_id=user_id,
                    subject_id=subject.id if subject else None,
                    title=task_data.get("title", "Study task"),
                    description=task_data.get("description"),
                    topic=task_data.get("topic", ""),
                    scheduled_date=scheduled_date,
                    estimated_minutes=task_data.get("estimated_minutes", 60),
                    priority=task_data.get("priority", 2),
                    status=TaskStatus.PENDING,
                    source=TaskSource.LLM
                )
                db.add(task)
                created.append(task)

            await db.commit()
            tasks_created = created
            action_taken = f"Created {len(created)} tasks"

        elif action.get("action") == "reschedule":
            # Handle reschedule action
            action_taken = "Tasks rescheduled"

    # Add assistant response to history
    messages.append({
        "role": "assistant",
        "content": response_text,
        "timestamp": datetime.utcnow().isoformat()
    })

    session.messages = messages
    session.updated_at = datetime.utcnow()
    await db.commit()

    return ChatResponse(
        response=response_text,
        session_id=session.id,
        tasks_created=tasks_created,
        action_taken=action_taken
    )


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_chat_sessions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all chat sessions."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(ChatSession).where(
            ChatSession.user_id == user_id
        ).order_by(ChatSession.updated_at.desc())
    )

    return result.scalars().all()


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_chat_session(
    session_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific chat session."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    return session


@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(ChatSession).where(
            and_(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    await db.delete(session)
    await db.commit()

    return {"message": "Session deleted"}


@router.post("/quick-question")
async def quick_question(
    question: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ask a quick question without creating a session."""
    user_id = int(current_user["sub"])
    context = await get_user_context(user_id, db)

    response_text, action = await llm_service.mentor_chat(
        question,
        [],  # No history
        context
    )

    return {"response": response_text}
