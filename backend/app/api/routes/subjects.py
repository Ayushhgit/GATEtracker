from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.models import Subject
from app.schemas.schemas import SubjectCreate, SubjectResponse

router = APIRouter(prefix="/subjects", tags=["subjects"])

# Default GATE CSE subjects
DEFAULT_SUBJECTS = [
    {"name": "Data Structures and Algorithms", "short_name": "DSA", "color": "#EF4444", "weightage": 12.0},
    {"name": "Operating Systems", "short_name": "OS", "color": "#F97316", "weightage": 8.0},
    {"name": "Database Management Systems", "short_name": "DBMS", "color": "#EAB308", "weightage": 6.0},
    {"name": "Computer Networks", "short_name": "CN", "color": "#22C55E", "weightage": 8.0},
    {"name": "Theory of Computation", "short_name": "TOC", "color": "#14B8A6", "weightage": 8.0},
    {"name": "Compiler Design", "short_name": "CD", "color": "#06B6D4", "weightage": 6.0},
    {"name": "Computer Organization and Architecture", "short_name": "COA", "color": "#3B82F6", "weightage": 8.0},
    {"name": "Digital Logic", "short_name": "DL", "color": "#6366F1", "weightage": 5.0},
    {"name": "Discrete Mathematics", "short_name": "DM", "color": "#8B5CF6", "weightage": 8.0},
    {"name": "Engineering Mathematics", "short_name": "EM", "color": "#A855F7", "weightage": 13.0},
    {"name": "Programming and Data Structures", "short_name": "PDS", "color": "#EC4899", "weightage": 10.0},
    {"name": "Aptitude", "short_name": "APT", "color": "#F43F5E", "weightage": 15.0},
]


@router.get("", response_model=List[SubjectResponse])
async def get_subjects(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all subjects."""
    result = await db.execute(select(Subject).order_by(Subject.name))
    subjects = result.scalars().all()

    # If no subjects exist, create defaults
    if not subjects:
        for subj_data in DEFAULT_SUBJECTS:
            subject = Subject(**subj_data)
            db.add(subject)
        await db.commit()

        result = await db.execute(select(Subject).order_by(Subject.name))
        subjects = result.scalars().all()

    return subjects


@router.post("", response_model=SubjectResponse)
async def create_subject(
    subject_data: SubjectCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new subject."""
    # Check if subject already exists
    result = await db.execute(
        select(Subject).where(Subject.name == subject_data.name)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Subject already exists")

    subject = Subject(**subject_data.model_dump())
    db.add(subject)
    await db.commit()
    await db.refresh(subject)

    return subject


@router.get("/{subject_id}", response_model=SubjectResponse)
async def get_subject(
    subject_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific subject."""
    result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = result.scalar_one_or_none()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    return subject


@router.post("/init-defaults")
async def init_default_subjects(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Initialize default GATE CSE subjects."""
    created = []
    for subj_data in DEFAULT_SUBJECTS:
        result = await db.execute(
            select(Subject).where(Subject.name == subj_data["name"])
        )
        if not result.scalar_one_or_none():
            subject = Subject(**subj_data)
            db.add(subject)
            created.append(subj_data["name"])

    await db.commit()

    return {"created": created, "message": f"Created {len(created)} subjects"}
