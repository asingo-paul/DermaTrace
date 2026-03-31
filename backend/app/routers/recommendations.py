"""Router for recommendation endpoints."""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import require_pro, get_db
from app.models.user import User
from app.services.recommendation_service import get_recommendations

router = APIRouter()


@router.get("", status_code=200)
async def recommendations_endpoint(
    current_user: User = Depends(require_pro),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """Return up to 10 catalog products free of the user's trigger ingredients.

    TODO: add require_pro guard in task 13.
    """
    return await get_recommendations(current_user.id, db)
