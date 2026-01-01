from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from datetime import date, datetime

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.models import Goal, Task, Subject, TaskStatus, TaskSource
from app.schemas.schemas import (
    GoalCreate, GoalResponse, PlanParseRequest, PlanParseResponse
)
from app.services.llm_service import llm_service

router = APIRouter(prefix="/planner", tags=["planner"])


@router.post("/parse-plan", response_model=PlanParseResponse)
async def parse_study_plan(
    request: PlanParseRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Parse a long-term study plan into structured tasks."""
    user_id = int(current_user["sub"])

    # Call LLM to parse the plan
    parsed = await llm_service.parse_study_plan(
        request.plan_text,
        request.start_date,
        request.end_date
    )

    return PlanParseResponse(
        goal_title=parsed.get("goal_title", "GATE Preparation"),
        subjects_identified=parsed.get("subjects_identified", []),
        tasks=[],  # Don't populate until confirmed
        weekly_breakdown=parsed.get("weekly_breakdown", {})
    )


@router.post("/create-from-plan")
async def create_tasks_from_plan(
    request: PlanParseRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Parse plan and create all tasks in database."""
    user_id = int(current_user["sub"])

    # Parse the plan
    parsed = await llm_service.parse_study_plan(
        request.plan_text,
        request.start_date,
        request.end_date
    )

    # Get or create subjects
    subject_map = {}
    for subj_name in parsed.get("subjects_identified", []):
        result = await db.execute(
            select(Subject).where(Subject.name == subj_name)
        )
        subject = result.scalar_one_or_none()

        if not subject:
            # Try partial match
            result = await db.execute(
                select(Subject).where(Subject.name.ilike(f"%{subj_name}%"))
            )
            subject = result.scalar_one_or_none()

        if subject:
            subject_map[subj_name] = subject.id
            subject_map[subj_name.lower()] = subject.id

    # Create goal
    goal = Goal(
        user_id=user_id,
        title=parsed.get("goal_title", "GATE Preparation"),
        description=f"Generated from plan with {len(parsed.get('tasks', []))} tasks",
        raw_plan_text=request.plan_text,
        goal_type="yearly",
        is_active=True
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)

    # Create tasks
    created_tasks = []
    for task_data in parsed.get("tasks", []):
        subject_name = task_data.get("subject", "")
        subject_id = subject_map.get(subject_name) or subject_map.get(subject_name.lower())

        try:
            scheduled_date = date.fromisoformat(task_data.get("scheduled_date", str(date.today())))
        except (ValueError, TypeError):
            scheduled_date = date.today()

        task = Task(
            user_id=user_id,
            goal_id=goal.id,
            subject_id=subject_id,
            title=task_data.get("title", "Study task"),
            description=task_data.get("description"),
            topic=task_data.get("topic", ""),
            scheduled_date=scheduled_date,
            estimated_minutes=task_data.get("estimated_minutes", 60),
            priority=task_data.get("priority", 2),
            is_revision=task_data.get("is_revision", False),
            status=TaskStatus.PENDING,
            source=TaskSource.LLM
        )
        db.add(task)
        created_tasks.append(task)

    await db.commit()

    return {
        "goal_id": goal.id,
        "goal_title": goal.title,
        "tasks_created": len(created_tasks),
        "subjects_identified": list(set(subject_map.keys())),
        "date_range": {
            "start": request.start_date or date.today(),
            "end": request.end_date or (date.today().replace(year=date.today().year + 1))
        }
    }


@router.get("/goals", response_model=List[GoalResponse])
async def get_goals(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all goals."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(Goal).where(Goal.user_id == user_id).order_by(Goal.created_at.desc())
    )

    return result.scalars().all()


@router.post("/goals", response_model=GoalResponse)
async def create_goal(
    goal_data: GoalCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new goal."""
    user_id = int(current_user["sub"])

    goal = Goal(
        user_id=user_id,
        **goal_data.model_dump()
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)

    return goal


@router.get("/goals/{goal_id}")
async def get_goal_with_tasks(
    goal_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a goal with its associated tasks."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(Goal).where(and_(Goal.id == goal_id, Goal.user_id == user_id))
    )
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Get associated tasks
    result = await db.execute(
        select(Task).where(Task.goal_id == goal_id).order_by(Task.scheduled_date)
    )
    tasks = result.scalars().all()

    # Calculate stats
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)

    return {
        "goal": goal,
        "tasks_count": total,
        "tasks_completed": completed,
        "completion_rate": completed / total if total > 0 else 0,
        "tasks": tasks
    }


@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: int,
    delete_tasks: bool = False,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a goal and optionally its tasks."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(Goal).where(and_(Goal.id == goal_id, Goal.user_id == user_id))
    )
    goal = result.scalar_one_or_none()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if delete_tasks:
        # Delete associated tasks
        result = await db.execute(
            select(Task).where(Task.goal_id == goal_id)
        )
        tasks = result.scalars().all()
        for task in tasks:
            await db.delete(task)

    await db.delete(goal)
    await db.commit()

    return {"message": "Goal deleted", "tasks_deleted": delete_tasks}


@router.post("/generate-week")
async def generate_week_tasks(
    week_offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate tasks for a specific week based on goals and progress."""
    user_id = int(current_user["sub"])

    # Get active goal
    result = await db.execute(
        select(Goal).where(
            and_(Goal.user_id == user_id, Goal.is_active == True)
        ).order_by(Goal.created_at.desc())
    )
    goal = result.scalar_one_or_none()

    if not goal or not goal.raw_plan_text:
        return {"message": "No active plan found. Please create a plan first."}

    # This would typically use more sophisticated logic
    # For now, just return a message
    return {
        "message": "Week generation based on existing plan",
        "goal_id": goal.id,
        "goal_title": goal.title
    }
