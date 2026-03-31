"""Subscription management router."""

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.services.subscription_service import (
    cancel_subscription,
    change_plan,
    get_subscription,
)

router = APIRouter()


class ChangePlanRequest(BaseModel):
    interval: Literal["monthly", "annual"]


@router.get("")
async def get_subscription_endpoint(
    current_user: User = Depends(get_current_user),
) -> dict:
    """Return the current user's subscription details."""
    return get_subscription(current_user)


@router.post("/cancel")
async def cancel_subscription_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Cancel renewal; access continues until end of billing period."""
    await cancel_subscription(current_user, db)
    return {"message": "Subscription cancelled. Access continues until end of billing period."}


@router.post("/change-plan")
async def change_plan_endpoint(
    body: ChangePlanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Switch between monthly and annual billing."""
    await change_plan(current_user, body.interval, db)
    return get_subscription(current_user)
