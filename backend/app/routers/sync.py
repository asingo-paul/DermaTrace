"""Router for offline sync endpoints."""

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, require_pro
from app.models.user import User
from app.services.sync_service import pull, push

router = APIRouter()


@router.get("", status_code=200)
async def pull_endpoint(
    last_pulled_at: float | None = Query(default=None),
    current_user: User = Depends(require_pro),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Return server changes since last_pulled_at (Unix epoch seconds)."""
    return await pull(current_user.id, last_pulled_at, db)


@router.post("", status_code=200)
async def push_endpoint(
    body: dict[str, Any],
    current_user: User = Depends(require_pro),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Apply client changes to the server."""
    await push(current_user.id, body, db)
    return {"status": "ok"}
