"""FastAPI dependency functions shared across routers."""

from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db as _get_db
from app.models.user import User
from app.services.auth_service import decode_token

_bearer = HTTPBearer()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session. Delegates to database.get_db."""
    async for session in _get_db():
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and verify the Bearer JWT; return the authenticated User."""
    payload = decode_token(credentials.credentials)
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_pro(current_user: User = Depends(get_current_user)) -> User:
    """Raise 403 if the user's effective tier is 'free'."""
    from app.services.subscription_service import get_effective_tier
    if get_effective_tier(current_user) == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This feature requires a Pro subscription.",
        )
    return current_user
