from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from app.db.database import get_db
from app.core.config import settings
from app.core.security import create_access_token, verify_pin, get_current_user
from app.schemas.schemas import LoginRequest, TokenResponse
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Single-user login with PIN."""
    if not verify_pin(request.pin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN"
        )

    # Get or create the single user
    result = await db.execute(
        select(User).where(User.email == settings.USER_EMAIL)
    )
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=settings.USER_EMAIL,
            pin_hash=request.pin,  # In production, hash this
            name="GATE Aspirant"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(access_token=access_token)


@router.get("/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user info."""
    result = await db.execute(
        select(User).where(User.id == int(current_user["sub"]))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "created_at": user.created_at
    }


@router.post("/verify")
async def verify_token_endpoint(current_user: dict = Depends(get_current_user)):
    """Verify if token is valid."""
    return {"valid": True, "user_id": current_user["sub"]}
