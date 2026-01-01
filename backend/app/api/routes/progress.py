from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List
from datetime import date, datetime, timedelta

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.models import Task, Subject, ProgressLog, TaskStatus
from app.schemas.schemas import (
    DailyProgress, SubjectProgress, ProgressSummary
)

router = APIRouter(prefix="/progress", tags=["progress"])


async def calculate_streak(user_id: int, db: AsyncSession) -> tuple[int, int]:
    """Calculate current and longest streak."""
    today = date.today()

    # Get all dates with at least one completed task
    query = select(
        func.date(Task.scheduled_date).label('task_date'),
        func.count(Task.id).label('completed')
    ).where(
        and_(
            Task.user_id == user_id,
            Task.status == TaskStatus.COMPLETED
        )
    ).group_by(func.date(Task.scheduled_date)).order_by(
        func.date(Task.scheduled_date).desc()
    )

    result = await db.execute(query)
    completed_dates = [row.task_date for row in result.all()]

    if not completed_dates:
        return 0, 0

    # Convert to set for faster lookup
    completed_set = set(completed_dates)

    # Calculate current streak
    current_streak = 0
    check_date = today

    # Check if today or yesterday had completions (to allow for incomplete today)
    if today not in completed_set and (today - timedelta(days=1)) not in completed_set:
        current_streak = 0
    else:
        if today not in completed_set:
            check_date = today - timedelta(days=1)

        while check_date in completed_set:
            current_streak += 1
            check_date -= timedelta(days=1)

    # Calculate longest streak
    if not completed_dates:
        return current_streak, current_streak

    sorted_dates = sorted(completed_set)
    longest_streak = 1
    temp_streak = 1

    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i-1]).days == 1:
            temp_streak += 1
            longest_streak = max(longest_streak, temp_streak)
        else:
            temp_streak = 1

    return current_streak, max(longest_streak, current_streak)


@router.get("/summary", response_model=ProgressSummary)
async def get_progress_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive progress summary."""
    user_id = int(current_user["sub"])
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    # Calculate streaks
    current_streak, longest_streak = await calculate_streak(user_id, db)

    # Total completed tasks
    result = await db.execute(
        select(func.count(Task.id)).where(
            and_(
                Task.user_id == user_id,
                Task.status == TaskStatus.COMPLETED
            )
        )
    )
    total_completed = result.scalar() or 0

    # Total minutes studied
    result = await db.execute(
        select(func.sum(Task.actual_minutes)).where(
            and_(
                Task.user_id == user_id,
                Task.status == TaskStatus.COMPLETED
            )
        )
    )
    total_minutes = result.scalar() or 0

    # Weekly progress (last 7 days)
    weekly_progress = []
    for i in range(7):
        day = today - timedelta(days=6-i)

        # Tasks for this day
        result = await db.execute(
            select(
                func.count(Task.id).filter(Task.status == TaskStatus.COMPLETED).label('completed'),
                func.count(Task.id).filter(Task.status == TaskStatus.SKIPPED).label('skipped'),
                func.count(Task.id).label('total'),
                func.sum(Task.estimated_minutes).label('planned_min'),
                func.sum(Task.actual_minutes).label('actual_min')
            ).where(
                and_(
                    Task.user_id == user_id,
                    Task.scheduled_date == day
                )
            )
        )
        row = result.one()

        completed = row.completed or 0
        total = row.total or 0
        skipped = row.skipped or 0

        weekly_progress.append(DailyProgress(
            date=day,
            tasks_planned=total,
            tasks_completed=completed,
            tasks_skipped=skipped,
            completion_rate=completed / total if total > 0 else 0,
            minutes_planned=row.planned_min or 0,
            minutes_actual=row.actual_min or 0
        ))

    # Subject-wise progress
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

    subject_progress = []
    for row in result.all():
        total = row.total or 0
        completed = row.completed or 0
        subject_progress.append(SubjectProgress(
            subject_id=row.id,
            subject_name=row.name,
            color=row.color,
            total_tasks=total,
            completed_tasks=completed,
            completion_rate=completed / total if total > 0 else 0,
            total_minutes=row.total_min or 0
        ))

    # Calculate consistency score (based on last 14 days)
    result = await db.execute(
        select(func.count(func.distinct(Task.scheduled_date))).where(
            and_(
                Task.user_id == user_id,
                Task.status == TaskStatus.COMPLETED,
                Task.scheduled_date >= today - timedelta(days=13),
                Task.scheduled_date <= today
            )
        )
    )
    active_days = result.scalar() or 0
    consistency_score = active_days / 14

    # Calculate week completion rate
    week_completed = sum(d.tasks_completed for d in weekly_progress)
    week_total = sum(d.tasks_planned for d in weekly_progress)
    week_rate = week_completed / week_total if week_total > 0 else 0

    return ProgressSummary(
        current_streak=current_streak,
        longest_streak=longest_streak,
        total_tasks_completed=total_completed,
        total_minutes_studied=total_minutes,
        weekly_progress=weekly_progress,
        subject_progress=subject_progress,
        consistency_score=consistency_score
    )


@router.get("/daily/{target_date}")
async def get_daily_progress(
    target_date: date,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed progress for a specific date."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(
            Task.status,
            func.count(Task.id).label('count'),
            func.sum(Task.estimated_minutes).label('est_min'),
            func.sum(Task.actual_minutes).label('act_min')
        ).where(
            and_(
                Task.user_id == user_id,
                Task.scheduled_date == target_date
            )
        ).group_by(Task.status)
    )

    stats = {row.status.value: {
        "count": row.count,
        "estimated_minutes": row.est_min or 0,
        "actual_minutes": row.act_min or 0
    } for row in result.all()}

    # Subject breakdown for the day
    result = await db.execute(
        select(
            Subject.name,
            Subject.color,
            func.count(Task.id).label('total'),
            func.count(Task.id).filter(Task.status == TaskStatus.COMPLETED).label('completed')
        ).join(Task, Task.subject_id == Subject.id).where(
            and_(
                Task.user_id == user_id,
                Task.scheduled_date == target_date
            )
        ).group_by(Subject.id, Subject.name, Subject.color)
    )

    subjects = [
        {
            "name": row.name,
            "color": row.color,
            "total": row.total,
            "completed": row.completed
        }
        for row in result.all()
    ]

    return {
        "date": target_date,
        "status_breakdown": stats,
        "subject_breakdown": subjects
    }


@router.get("/subjects")
async def get_subject_progress(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed subject-wise progress."""
    user_id = int(current_user["sub"])

    result = await db.execute(
        select(
            Subject.id,
            Subject.name,
            Subject.short_name,
            Subject.color,
            Subject.weightage,
            func.count(Task.id).label('total_tasks'),
            func.count(Task.id).filter(Task.status == TaskStatus.COMPLETED).label('completed'),
            func.count(Task.id).filter(Task.status == TaskStatus.SKIPPED).label('skipped'),
            func.sum(Task.estimated_minutes).filter(Task.status == TaskStatus.COMPLETED).label('minutes_studied'),
            func.count(Task.id).filter(Task.is_revision == True).label('revision_tasks'),
            func.count(Task.id).filter(
                and_(Task.is_revision == True, Task.status == TaskStatus.COMPLETED)
            ).label('revisions_done')
        ).outerjoin(Task, and_(
            Task.subject_id == Subject.id,
            Task.user_id == user_id
        )).group_by(Subject.id, Subject.name, Subject.short_name, Subject.color, Subject.weightage)
    )

    subjects = []
    for row in result.all():
        total = row.total_tasks or 0
        completed = row.completed or 0
        subjects.append({
            "id": row.id,
            "name": row.name,
            "short_name": row.short_name,
            "color": row.color,
            "weightage": row.weightage,
            "total_tasks": total,
            "completed_tasks": completed,
            "skipped_tasks": row.skipped or 0,
            "completion_rate": completed / total if total > 0 else 0,
            "minutes_studied": row.minutes_studied or 0,
            "revision_tasks": row.revision_tasks or 0,
            "revisions_completed": row.revisions_done or 0
        })

    return {"subjects": subjects}


@router.get("/trends")
async def get_progress_trends(
    days: int = 30,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get progress trends over time."""
    user_id = int(current_user["sub"])
    today = date.today()
    start_date = today - timedelta(days=days-1)

    daily_data = []
    for i in range(days):
        day = start_date + timedelta(days=i)

        result = await db.execute(
            select(
                func.count(Task.id).label('total'),
                func.count(Task.id).filter(Task.status == TaskStatus.COMPLETED).label('completed'),
                func.sum(Task.actual_minutes).label('minutes')
            ).where(
                and_(
                    Task.user_id == user_id,
                    Task.scheduled_date == day
                )
            )
        )
        row = result.one()

        daily_data.append({
            "date": day.isoformat(),
            "total": row.total or 0,
            "completed": row.completed or 0,
            "minutes": row.minutes or 0,
            "rate": (row.completed or 0) / (row.total or 1)
        })

    # Calculate weekly averages
    weekly_avg = []
    for i in range(0, days, 7):
        week_data = daily_data[i:i+7]
        if week_data:
            avg_rate = sum(d["rate"] for d in week_data) / len(week_data)
            total_min = sum(d["minutes"] for d in week_data)
            weekly_avg.append({
                "week_start": week_data[0]["date"],
                "avg_completion_rate": avg_rate,
                "total_minutes": total_min
            })

    return {
        "daily": daily_data,
        "weekly_averages": weekly_avg
    }
