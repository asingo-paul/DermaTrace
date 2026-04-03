"""Router for dashboard aggregation endpoint — with TTL caching."""

from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import cache
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.services.dashboard_service import get_dashboard

router = APIRouter()


@router.get("", status_code=status.HTTP_200_OK)
async def dashboard_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return aggregated dashboard data — cached for 60 seconds per user."""
    cache_key = f"dashboard:{current_user.id}"
    return await cache.get_or_set(
        cache_key,
        lambda: get_dashboard(current_user, db),
        ttl=60,
    )
