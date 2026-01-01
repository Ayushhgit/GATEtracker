from .auth import router as auth_router
from .tasks import router as tasks_router
from .subjects import router as subjects_router
from .progress import router as progress_router
from .planner import router as planner_router
from .chat import router as chat_router
from .insights import router as insights_router
from .dashboard import router as dashboard_router

__all__ = [
    "auth_router",
    "tasks_router",
    "subjects_router",
    "progress_router",
    "planner_router",
    "chat_router",
    "insights_router",
    "dashboard_router",
]
