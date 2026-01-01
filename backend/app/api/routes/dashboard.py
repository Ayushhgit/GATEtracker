from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from datetime import date, timedelta

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.models import Task, Subject, Insight, TaskStatus
from app.schemas.schemas import DashboardData

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardData)
async def get_dashboard(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive dashboard data."""
    user_id = int(current_user["sub"])
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    # Today's tasks
    result = await db.execute(
        select(Task).where(
            and_(
                Task.user_id == user_id,
                Task.scheduled_date == today
            )
        ).options(selectinload(Task.subject)).order_by(Task.priority)
    )
    today_tasks = result.scalars().all()

    today_completed = sum(1 for t in today_tasks if t.status == TaskStatus.COMPLETED)
    today_total = len(today_tasks)

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

    # Current streak
    streak = 0
    check_date = today
    checked_today = False
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
        count = result.scalar()
        if count and count > 0:
            streak += 1
            check_date -= timedelta(days=1)
            checked_today = True
        else:
            if not checked_today and check_date == today:
                check_date -= timedelta(days=1)
                checked_today = True
                continue
            break

    # Pending insights count
    result = await db.execute(
        select(func.count(Insight.id)).where(
            and_(
                Insight.user_id == user_id,
                Insight.is_read == False
            )
        )
    )
    pending_insights = result.scalar() or 0

    # Subject overview
    result = await db.execute(
        select(
            Subject.id,
            Subject.name,
            Subject.color,
            func.count(Task.id).label('total'),
            func.count(Task.id).filter(Task.status == TaskStatus.COMPLETED).label('completed'),
            func.sum(Task.estimated_minutes).label('total_min')
        ).outerjoin(Task, and_(
            Task.subject_id == Subject.id,
            Task.user_id == user_id
        )).group_by(Subject.id, Subject.name, Subject.color)
    )

    subjects_overview = []
    for row in result.all():
        total = row.total or 0
        completed = row.completed or 0
        if total > 0:  # Only include subjects with tasks
            subjects_overview.append({
                "subject_id": row.id,
                "subject_name": row.name,
                "color": row.color,
                "total_tasks": total,
                "completed_tasks": completed,
                "completion_rate": completed / total,
                "total_minutes": row.total_min or 0
            })

    # Recent insights
    result = await db.execute(
        select(Insight).where(
            Insight.user_id == user_id
        ).order_by(Insight.generated_at.desc()).limit(3)
    )
    recent_insights = result.scalars().all()

    return DashboardData(
        today_tasks=today_tasks,
        today_completed=today_completed,
        today_total=today_total,
        week_completion_rate=week_rate,
        current_streak=streak,
        pending_insights=pending_insights,
        subjects_overview=subjects_overview,
        recent_insights=recent_insights
    )
