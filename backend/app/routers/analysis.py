"""Router for pattern analysis endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import require_pro, get_db
from app.models.user import User
from app.services.pattern_detector import detect_triggers

router = APIRouter()


@router.get("/triggers")
async def get_triggers(
    current_user: User = Depends(require_pro),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Run trigger analysis for the authenticated user.

    TODO: add require_pro guard in task 13.
    Returns ranked trigger ingredients with confidence scores.
    """
    triggers = await detect_triggers(current_user.id, db)

    analyzed_at: datetime | None = triggers[0]["analyzed_at"] if triggers else None
    analyzed_at_str = analyzed_at.isoformat() if analyzed_at else None

    return {
        "triggers": [
            {"ingredient": t["ingredient"], "confidence_score": t["confidence_score"]}
            for t in triggers
        ],
        "analyzed_at": analyzed_at_str,
    }
