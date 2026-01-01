from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum


# Enums
class TaskStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    IN_PROGRESS = "in_progress"


class TaskSource(str, Enum):
    LLM = "llm"
    MANUAL = "manual"


# Auth Schemas
class LoginRequest(BaseModel):
    pin: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Subject Schemas
class SubjectBase(BaseModel):
    name: str
    short_name: Optional[str] = None
    color: Optional[str] = "#3B82F6"
    weightage: Optional[float] = 0.0


class SubjectCreate(SubjectBase):
    pass


class SubjectResponse(SubjectBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Task Schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    topic: Optional[str] = None
    scheduled_date: date
    due_date: Optional[date] = None
    estimated_minutes: Optional[int] = 60
    priority: Optional[int] = 2
    is_revision: Optional[bool] = False
    notes: Optional[str] = None


class TaskCreate(TaskBase):
    subject_id: Optional[int] = None
    goal_id: Optional[int] = None
    source: Optional[TaskSource] = TaskSource.MANUAL


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    topic: Optional[str] = None
    scheduled_date: Optional[date] = None
    due_date: Optional[date] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    status: Optional[TaskStatus] = None
    priority: Optional[int] = None
    is_revision: Optional[bool] = None
    notes: Optional[str] = None
    subject_id: Optional[int] = None


class TaskResponse(TaskBase):
    id: int
    user_id: int
    goal_id: Optional[int]
    subject_id: Optional[int]
    status: TaskStatus
    source: TaskSource
    actual_minutes: Optional[int]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    subject: Optional[SubjectResponse] = None

    class Config:
        from_attributes = True


class TaskStatusUpdate(BaseModel):
    status: TaskStatus
    actual_minutes: Optional[int] = None


# Goal Schemas
class GoalBase(BaseModel):
    title: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    goal_type: Optional[str] = None


class GoalCreate(GoalBase):
    subject_id: Optional[int] = None
    raw_plan_text: Optional[str] = None


class GoalResponse(GoalBase):
    id: int
    user_id: int
    subject_id: Optional[int]
    is_active: bool
    raw_plan_text: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    subject: Optional[SubjectResponse] = None

    class Config:
        from_attributes = True


# Plan Parsing Schema
class PlanParseRequest(BaseModel):
    plan_text: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class GeneratedTask(BaseModel):
    title: str
    description: Optional[str] = None
    topic: str
    subject: str
    scheduled_date: date
    estimated_minutes: int = 60
    priority: int = 2
    is_revision: bool = False


class PlanParseResponse(BaseModel):
    goal_title: str
    subjects_identified: List[str]
    tasks: List[GeneratedTask]
    weekly_breakdown: Dict[str, List[str]]


# Progress Schemas
class DailyProgress(BaseModel):
    date: date
    tasks_planned: int
    tasks_completed: int
    tasks_skipped: int
    completion_rate: float
    minutes_planned: int
    minutes_actual: int


class SubjectProgress(BaseModel):
    subject_id: int
    subject_name: str
    color: str
    total_tasks: int
    completed_tasks: int
    completion_rate: float
    total_minutes: int


class ProgressSummary(BaseModel):
    current_streak: int
    longest_streak: int
    total_tasks_completed: int
    total_minutes_studied: int
    weekly_progress: List[DailyProgress]
    subject_progress: List[SubjectProgress]
    consistency_score: float


# Insight Schemas
class InsightResponse(BaseModel):
    id: int
    insight_type: str
    title: str
    content: str
    data: Optional[Dict[str, Any]]
    is_read: bool
    is_actionable: bool
    priority: int
    generated_at: datetime

    class Config:
        from_attributes = True


# Chat Schemas
class ChatMessage(BaseModel):
    role: str  # user or assistant
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None


class ChatResponse(BaseModel):
    response: str
    session_id: int
    tasks_created: Optional[List[TaskResponse]] = None
    action_taken: Optional[str] = None


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    messages: List[Dict[str, Any]]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Dashboard Schema
class DashboardData(BaseModel):
    today_tasks: List[TaskResponse]
    today_completed: int
    today_total: int
    week_completion_rate: float
    current_streak: int
    pending_insights: int
    subjects_overview: List[SubjectProgress]
    recent_insights: List[InsightResponse]


# Reschedule Request
class RescheduleRequest(BaseModel):
    task_ids: List[int]
    new_date: Optional[date] = None  # If None, LLM decides


class BulkTaskCreate(BaseModel):
    tasks: List[TaskCreate]
