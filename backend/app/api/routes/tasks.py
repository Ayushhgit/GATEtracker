from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.models import Task, Subject, TaskStatus, TaskSource
from app.schemas.schemas import (
    TaskCreate, TaskUpdate, TaskResponse, TaskStatusUpdate,
    BulkTaskCreate, RescheduleRequest
)
from app.services.llm_service import llm_service

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=List[TaskResponse])
async def get_tasks(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[TaskStatus] = None,
    subject_id: Optional[int] = None,
    limit: int = Query(default=100, le=500),
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tasks with optional filters."""
    user_id = int(current_user["sub"])

    query = select(Task).where(Task.user_id == user_id).options(
        selectinload(Task.subject)
    )

    if start_date:
        query = query.where(Task.scheduled_date >= start_date)
    if end_date:
        query = query.where(Task.scheduled_date <= end_date)
    if status:
        query = query.where(Task.status == status)
    if subject_id:
        query = query.where(Task.subject_id == subject_id)

    query = query.order_by(Task.scheduled_date, Task.priority).offset(offset).limit(limit)

    result = await db.execute(query)
    tasks = result.scalars().all()

    return tasks


@router.get("/today", response_model=List[TaskResponse])
async def get_today_tasks(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get today's tasks."""
    user_id = int(current_user["sub"])
    today = date.today()

    query = select(Task).where(
        and_(
            Task.user_id == user_id,
            Task.scheduled_date == today
        )
    ).options(selectinload(Task.subject)).order_by(Task.priority, Task.id)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/week", response_model=List[TaskResponse])
async def get_week_tasks(
    week_offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tasks for a specific week (0 = current week)."""
    user_id = int(current_user["sub"])
    today = date.today()

    # Calculate week start (Monday) and end (Sunday)
    week_start = today - timedelta(days=today.weekday()) + timedelta(weeks=week_offset)
    week_end = week_start + timedelta(days=6)

    query = select(Task).where(
        and_(
            Task.user_id == user_id,
            Task.scheduled_date >= week_start,
            Task.scheduled_date <= week_end
        )
    ).options(selectinload(Task.subject)).order_by(Task.scheduled_date, Task.priority)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific task."""
    user_id = int(current_user["sub"])

    query = select(Task).where(
        and_(Task.id == task_id, Task.user_id == user_id)
    ).options(selectinload(Task.subject))

    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


@router.post("", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new task."""
    user_id = int(current_user["sub"])

    task = Task(
        user_id=user_id,
        **task_data.model_dump()
    )

    db.add(task)
    await db.commit()
    await db.refresh(task)

    # Reload with subject
    query = select(Task).where(Task.id == task.id).options(selectinload(Task.subject))
    result = await db.execute(query)
    return result.scalar_one()


@router.post("/bulk", response_model=List[TaskResponse])
async def create_bulk_tasks(
    bulk_data: BulkTaskCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create multiple tasks at once."""
    user_id = int(current_user["sub"])

    tasks = []
    for task_data in bulk_data.tasks:
        task = Task(
            user_id=user_id,
            **task_data.model_dump()
        )
        tasks.append(task)
        db.add(task)

    await db.commit()

    # Refresh all tasks
    for task in tasks:
        await db.refresh(task)

    return tasks


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a task."""
    user_id = int(current_user["sub"])

    query = select(Task).where(
        and_(Task.id == task_id, Task.user_id == user_id)
    )
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    # If status changed to completed, set completed_at
    if task_data.status == TaskStatus.COMPLETED and not task.completed_at:
        task.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(task)

    # Reload with subject
    query = select(Task).where(Task.id == task.id).options(selectinload(Task.subject))
    result = await db.execute(query)
    return result.scalar_one()


@router.patch("/{task_id}/status", response_model=TaskResponse)
async def update_task_status(
    task_id: int,
    status_data: TaskStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Quick status update for a task."""
    user_id = int(current_user["sub"])

    query = select(Task).where(
        and_(Task.id == task_id, Task.user_id == user_id)
    )
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = status_data.status
    if status_data.actual_minutes:
        task.actual_minutes = status_data.actual_minutes

    if status_data.status == TaskStatus.COMPLETED:
        task.completed_at = datetime.utcnow()
    elif status_data.status == TaskStatus.PENDING:
        task.completed_at = None

    await db.commit()
    await db.refresh(task)

    # Reload with subject
    query = select(Task).where(Task.id == task.id).options(selectinload(Task.subject))
    result = await db.execute(query)
    return result.scalar_one()


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a task."""
    user_id = int(current_user["sub"])

    query = select(Task).where(
        and_(Task.id == task_id, Task.user_id == user_id)
    )
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.delete(task)
    await db.commit()

    return {"message": "Task deleted"}


@router.post("/reschedule")
async def reschedule_tasks(
    request: RescheduleRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reschedule skipped/pending tasks using LLM."""
    user_id = int(current_user["sub"])

    # Get the tasks to reschedule
    query = select(Task).where(
        and_(
            Task.id.in_(request.task_ids),
            Task.user_id == user_id
        )
    ).options(selectinload(Task.subject))
    result = await db.execute(query)
    tasks_to_reschedule = result.scalars().all()

    if not tasks_to_reschedule:
        raise HTTPException(status_code=404, detail="No tasks found")

    # Get upcoming schedule
    today = date.today()
    next_week = today + timedelta(days=7)
    query = select(Task).where(
        and_(
            Task.user_id == user_id,
            Task.scheduled_date >= today,
            Task.scheduled_date <= next_week,
            Task.status == TaskStatus.PENDING
        )
    ).options(selectinload(Task.subject))
    result = await db.execute(query)
    upcoming_tasks = result.scalars().all()

    # Prepare data for LLM
    skipped_data = [
        {
            "id": t.id,
            "title": t.title,
            "subject": t.subject.name if t.subject else "General",
            "estimated_minutes": t.estimated_minutes,
            "priority": t.priority
        }
        for t in tasks_to_reschedule
    ]

    upcoming_data = [
        {
            "date": t.scheduled_date.isoformat(),
            "title": t.title,
            "subject": t.subject.name if t.subject else "General",
            "estimated_minutes": t.estimated_minutes
        }
        for t in upcoming_tasks
    ]

    available_dates = [today + timedelta(days=i) for i in range(1, 14)]

    # Call LLM for intelligent rescheduling
    reschedule_plan = await llm_service.reschedule_tasks(
        skipped_data, upcoming_data, available_dates
    )

    # Apply reschedule
    rescheduled = []
    for item in reschedule_plan:
        task_id = item.get("original_task_id")
        new_date_str = item.get("new_scheduled_date")

        if task_id and new_date_str:
            for task in tasks_to_reschedule:
                if task.id == task_id:
                    task.scheduled_date = date.fromisoformat(new_date_str)
                    task.status = TaskStatus.PENDING
                    rescheduled.append({
                        "task_id": task_id,
                        "new_date": new_date_str,
                        "reason": item.get("reason", "")
                    })
                    break

    await db.commit()

    return {
        "rescheduled_count": len(rescheduled),
        "details": rescheduled
    }


@router.get("/skipped/auto-reschedule")
async def get_skipped_for_reschedule(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get skipped tasks that need rescheduling."""
    user_id = int(current_user["sub"])
    today = date.today()

    # Get tasks that are past due and still pending/skipped
    query = select(Task).where(
        and_(
            Task.user_id == user_id,
            Task.scheduled_date < today,
            or_(
                Task.status == TaskStatus.PENDING,
                Task.status == TaskStatus.SKIPPED
            )
        )
    ).options(selectinload(Task.subject)).order_by(Task.scheduled_date)

    result = await db.execute(query)
    tasks = result.scalars().all()

    return {
        "count": len(tasks),
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "subject": t.subject.name if t.subject else "General",
                "original_date": t.scheduled_date.isoformat(),
                "days_overdue": (today - t.scheduled_date).days
            }
            for t in tasks
        ]
    }
