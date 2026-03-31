"""Auth router: register, login, logout."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.services.auth_service import create_access_token, hash_password, verify_password

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Create a new user account and return a JWT."""
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        subscription_tier="trial",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14),
    )
    db.add(user)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        tier=user.subscription_tier,
    )
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
@limiter.limit("10/minute")
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Verify credentials and return a JWT."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        user_id=str(user.id),
        email=user.email,
        tier=user.subscription_tier,
    )
    return TokenResponse(access_token=token)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout() -> dict[str, str]:
    """Stateless logout — client is responsible for dropping the token."""
    return {"message": "Logged out"}
