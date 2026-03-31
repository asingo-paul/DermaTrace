"""Service functions for user profile management."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import Profile
from app.models.user import User
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest


async def get_profile(user: User, db: AsyncSession) -> ProfileResponse:
    """Fetch the Profile for the given user and return a ProfileResponse."""
    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()

    return ProfileResponse(
        email=user.email,
        skin_type=profile.skin_type if profile else None,
        known_allergies=profile.known_allergies if profile else None,
        sensitivity_level=profile.sensitivity_level if profile else None,
    )


async def upsert_profile(
    user: User, data: ProfileUpdateRequest, db: AsyncSession
) -> ProfileResponse:
    """Insert or update the Profile record for the given user."""
    result = await db.execute(select(Profile).where(Profile.user_id == user.id))
    profile = result.scalar_one_or_none()

    if profile is None:
        profile = Profile(
            user_id=user.id,
            skin_type=data.skin_type,
            known_allergies=data.known_allergies,
            sensitivity_level=data.sensitivity_level,
        )
        db.add(profile)
    else:
        profile.skin_type = data.skin_type
        profile.known_allergies = data.known_allergies
        profile.sensitivity_level = data.sensitivity_level

    await db.commit()
    await db.refresh(profile)

    return ProfileResponse(
        email=user.email,
        skin_type=profile.skin_type,
        known_allergies=profile.known_allergies,
        sensitivity_level=profile.sensitivity_level,
    )
