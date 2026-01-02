from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List
from datetime import date, datetime, timedelta

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.models import Insight, Task, Subject, TaskStatus
from app.schemas.schemas import InsightResponse
from app.services.llm_service import llm_service

router = APIRouter(prefix="/insights", tags=["insights"])


# IMPORTANT: Static routes MUST come before dynamic routes like /{insight_id}
@router.delete("/clear-all")
async def clear_all_insights(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Clear all insights for the user."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(Insight).where(Insight.user_id == user_id)
    )
    insights = result.scalars().all()

    count = len(insights)
    for insight in insights:
        await db.delete(insight)

    await db.commit()

    return {"message": f"Cleared {count} insights", "count": count}


@router.patch("/mark-all-read")
async def mark_all_insights_read(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark all insights as read."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(Insight).where(
            and_(
                Insight.user_id == user_id,
                Insight.is_read == False
            )
        )
    )
    insights = result.scalars().all()

    count = len(insights)
    for insight in insights:
        insight.is_read = True

    await db.commit()

    return {"message": f"Marked {count} insights as read", "count": count}


@router.get("/summary")
async def get_insights_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get summary of insights."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(
            func.count(Insight.id).label('total'),
            func.count(Insight.id).filter(Insight.is_read == False).label('unread'),
            func.count(Insight.id).filter(Insight.priority == 1).label('high_priority')
        ).where(Insight.user_id == user_id)
    )
    row = result.one()

    return {
        "total": row.total or 0,
        "unread": row.unread or 0,
        "high_priority": row.high_priority or 0
    }


@router.get("", response_model=List[InsightResponse])
async def get_insights(
    unread_only: bool = False,
    limit: int = 10,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user insights."""
    user_id = int(current_user["sub"])

    query = select(Insight).where(Insight.user_id == user_id)

    if unread_only:
        query = query.where(Insight.is_read == False)

    query = query.order_by(Insight.priority, Insight.generated_at.desc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/generate", response_model=List[InsightResponse])
async def generate_insights(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate new insights based on progress data."""
    user_id = int(current_user["sub"])
    today = date.today()
    two_weeks_ago = today - timedelta(days=14)

    # Gather progress data
    # Overall stats
    result = await db.execute(
        select(
            func.count(Task.id).label('total'),
            func.count(Task.id).filter(Task.status == TaskStatus.COMPLETED).label('completed'),
            func.count(Task.id).filter(Task.status == TaskStatus.SKIPPED).label('skipped'),
            func.sum(Task.actual_minutes).label('total_minutes')
        ).where(
            and_(
                Task.user_id == user_id,
                Task.scheduled_date >= two_weeks_ago
            )
        )
    )
    overall = result.one()

    progress_data = {
        "period": f"{two_weeks_ago} to {today}",
        "total_tasks": overall.total or 0,
        "completed_tasks": overall.completed or 0,
        "skipped_tasks": overall.skipped or 0,
        "completion_rate": (overall.completed or 0) / (overall.total or 1),
        "total_minutes": overall.total_minutes or 0
    }

    # Daily completion rates
    daily_rates = []
    for i in range(14):
        day = two_weeks_ago + timedelta(days=i)
        result = await db.execute(
            select(
                func.count(Task.id).label('total'),
                func.count(Task.id).filter(Task.status == TaskStatus.COMPLETED).label('completed')
            ).where(
                and_(
                    Task.user_id == user_id,
                    Task.scheduled_date == day
                )
            )
        )
        row = result.one()
        daily_rates.append({
            "date": day.isoformat(),
            "total": row.total or 0,
            "completed": row.completed or 0,
            "rate": (row.completed or 0) / (row.total or 1) if row.total else 0
        })

    progress_data["daily_rates"] = daily_rates

    # Recent tasks
    result = await db.execute(
        select(Task).where(
            and_(
                Task.user_id == user_id,
                Task.scheduled_date >= two_weeks_ago
            )
        ).order_by(Task.scheduled_date.desc()).limit(50)
    )
    recent_tasks = [
        {
            "title": t.title,
            "subject_id": t.subject_id,
            "scheduled_date": t.scheduled_date.isoformat(),
            "status": t.status.value,
            "estimated_minutes": t.estimated_minutes,
            "is_revision": t.is_revision
        }
        for t in result.scalars().all()
    ]

    # Subject stats
    result = await db.execute(
        select(
            Subject.id,
            Subject.name,
            func.count(Task.id).label('total'),
            func.count(Task.id).filter(Task.status == TaskStatus.COMPLETED).label('completed'),
            func.count(Task.id).filter(Task.status == TaskStatus.SKIPPED).label('skipped')
        ).join(Task, Task.subject_id == Subject.id).where(
            and_(
                Task.user_id == user_id,
                Task.scheduled_date >= two_weeks_ago
            )
        ).group_by(Subject.id, Subject.name)
    )

    subject_stats = [
        {
            "id": row.id,
            "name": row.name,
            "total": row.total,
            "completed": row.completed,
            "skipped": row.skipped,
            "completion_rate": row.completed / row.total if row.total > 0 else 0
        }
        for row in result.all()
    ]

    # Call LLM to generate insights
    insights_data = await llm_service.generate_insights(
        progress_data,
        recent_tasks,
        subject_stats
    )

    # Store insights
    created_insights = []
    for insight_data in insights_data:
        insight = Insight(
            user_id=user_id,
            insight_type=insight_data.get("insight_type", "general"),
            title=insight_data.get("title", "Insight"),
            content=insight_data.get("content", ""),
            data=insight_data.get("data"),
            priority=insight_data.get("priority", 2),
            is_actionable=True,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(insight)
        created_insights.append(insight)

    await db.commit()

    # Refresh to get IDs
    for insight in created_insights:
        await db.refresh(insight)

    return created_insights


@router.patch("/{insight_id}/read")
async def mark_insight_read(
    insight_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark an insight as read."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(Insight).where(
            and_(
                Insight.id == insight_id,
                Insight.user_id == user_id
            )
        )
    )
    insight = result.scalar_one_or_none()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_read = True
    await db.commit()

    return {"message": "Insight marked as read"}


@router.delete("/{insight_id}")
async def delete_insight(
    insight_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete an insight."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(Insight).where(
            and_(
                Insight.id == insight_id,
                Insight.user_id == user_id
            )
        )
    )
    insight = result.scalar_one_or_none()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    await db.delete(insight)
    await db.commit()

    return {"message": "Insight deleted"}
