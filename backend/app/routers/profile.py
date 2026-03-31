"""Router for user profile endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest
from app.services.profile_service import get_profile, upsert_profile

router = APIRouter()


@router.get("", response_model=ProfileResponse)
async def read_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    """Return the authenticated user's profile."""
    return await get_profile(current_user, db)


@router.put("", response_model=ProfileResponse)
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    """Create or update the authenticated user's profile."""
    return await upsert_profile(current_user, data, db)
