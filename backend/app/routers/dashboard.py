"""Router for dashboard aggregation endpoint."""

from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.services.dashboard_service import get_dashboard

router = APIRouter()


@router.get("", status_code=status.HTTP_200_OK)
async def dashboard_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return aggregated dashboard data for the authenticated user."""
    return await get_dashboard(current_user, db)
