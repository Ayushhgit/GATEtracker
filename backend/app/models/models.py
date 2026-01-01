from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, Float,
    ForeignKey, Enum, Boolean, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum
from datetime import datetime


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    IN_PROGRESS = "in_progress"


class TaskSource(str, enum.Enum):
    LLM = "llm"
    MANUAL = "manual"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    pin_hash = Column(String(255))
    name = Column(String(255), default="GATE Aspirant")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    progress_logs = relationship("ProgressLog", back_populates="user", cascade="all, delete-orphan")
    insights = relationship("Insight", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True)
    short_name = Column(String(50))
    color = Column(String(7), default="#3B82F6")  # Hex color
    weightage = Column(Float, default=0.0)  # GATE exam weightage
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    goals = relationship("Goal", back_populates="subject")
    tasks = relationship("Task", back_populates="subject")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    target_date = Column(Date)
    goal_type = Column(String(50))  # monthly, weekly, topic
    raw_plan_text = Column(Text)  # Original pasted plan
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="goals")
    subject = relationship("Subject", back_populates="goals")
    tasks = relationship("Task", back_populates="goal", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_id = Column(Integer, ForeignKey("goals.id"), nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)

    title = Column(String(500), nullable=False)
    description = Column(Text)
    topic = Column(String(255))

    scheduled_date = Column(Date, nullable=False, index=True)
    due_date = Column(Date)
    completed_at = Column(DateTime(timezone=True))

    estimated_minutes = Column(Integer, default=60)
    actual_minutes = Column(Integer)

    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, index=True)
    source = Column(Enum(TaskSource), default=TaskSource.MANUAL)

    priority = Column(Integer, default=2)  # 1=high, 2=medium, 3=low
    is_revision = Column(Boolean, default=False)
    parent_task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)  # For rescheduled tasks

    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="tasks")
    goal = relationship("Goal", back_populates="tasks")
    subject = relationship("Subject", back_populates="tasks")
    parent_task = relationship("Task", remote_side=[id], backref="rescheduled_tasks")


class ProgressLog(Base):
    __tablename__ = "progress_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    log_date = Column(Date, nullable=False, index=True)

    tasks_planned = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    tasks_skipped = Column(Integer, default=0)

    minutes_planned = Column(Integer, default=0)
    minutes_actual = Column(Integer, default=0)

    subjects_studied = Column(JSON)  # {"DSA": 120, "OS": 60}
    streak_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="progress_logs")


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    insight_type = Column(String(100))  # weak_subject, consistency_drop, overload, missed_revision
    title = Column(String(500))
    content = Column(Text, nullable=False)
    data = Column(JSON)  # Supporting data for the insight

    is_read = Column(Boolean, default=False)
    is_actionable = Column(Boolean, default=True)
    priority = Column(Integer, default=2)

    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True))

    # Relationships
    user = relationship("User", back_populates="insights")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(255), default="New Chat")
    messages = Column(JSON, default=list)  # List of {role, content, timestamp}

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
