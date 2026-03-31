"""Payments router — Stripe and PayPal endpoints."""

from typing import Literal

from fastapi import APIRouter, Depends, Header, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.services.payment_service import (
    capture_paypal_order,
    create_paypal_order,
    create_stripe_intent,
    get_billing_history,
    handle_paypal_webhook,
    handle_stripe_webhook,
)

router = APIRouter()


class CreateIntentRequest(BaseModel):
    plan: Literal["monthly", "annual"]


class CreatePayPalOrderRequest(BaseModel):
    plan: Literal["monthly", "annual"]


class CapturePayPalOrderRequest(BaseModel):
    order_id: str


# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------

@router.post("/create-intent")
async def create_intent(
    body: CreateIntentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a Stripe PaymentIntent for the given plan."""
    return await create_stripe_intent(current_user.id, body.plan, db)


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="stripe-signature"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Receive and process Stripe webhook events (public endpoint)."""
    payload = await request.body()
    await handle_stripe_webhook(payload, stripe_signature, db)
    return {"received": True}


# ---------------------------------------------------------------------------
# PayPal
# ---------------------------------------------------------------------------

@router.post("/paypal/create-order")
async def paypal_create_order(
    body: CreatePayPalOrderRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    """Create a PayPal order and return the approval URL."""
    return await create_paypal_order(current_user.id, body.plan)


@router.post("/paypal/capture")
async def paypal_capture(
    body: CapturePayPalOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Capture an approved PayPal order and activate the subscription."""
    return await capture_paypal_order(current_user.id, body.order_id, db)


@router.post("/webhooks/paypal")
async def paypal_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Receive and process PayPal webhook events (public endpoint)."""
    payload = await request.json()
    await handle_paypal_webhook(payload, db)
    return {"received": True}


# ---------------------------------------------------------------------------
# Billing history
# ---------------------------------------------------------------------------

@router.get("/history")
async def billing_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the current user's billing history and subscription status."""
    return await get_billing_history(current_user.id, db)
