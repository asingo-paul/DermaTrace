"""Payment service — Stripe and PayPal integration."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import stripe
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.transaction import Transaction
from app.models.user import User
from app.services.subscription_service import activate_pro, get_effective_tier

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY

PAYPAL_BASE_URL = "https://api-m.sandbox.paypal.com"

PLAN_AMOUNTS: dict[str, int] = {
    "monthly": 499,   # $4.99 in cents
    "annual": 3999,   # $39.99 in cents
}

PLAN_VALUES: dict[str, str] = {
    "monthly": "4.99",
    "annual": "39.99",
}


def _subscription_ends_at(billing_interval: str) -> datetime:
    now = datetime.now(timezone.utc)
    if billing_interval == "annual":
        return now + timedelta(days=365)
    return now + timedelta(days=30)


# ---------------------------------------------------------------------------
# Stripe
# ---------------------------------------------------------------------------

async def create_stripe_intent(
    user_id: uuid.UUID, plan: str, db: AsyncSession
) -> dict:
    """Create a Stripe PaymentIntent and return client_secret + amount."""
    amount = PLAN_AMOUNTS.get(plan)
    if amount is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {plan}. Must be 'monthly' or 'annual'.",
        )

    pi = stripe.PaymentIntent.create(
        amount=amount,
        currency="usd",
        metadata={"user_id": str(user_id), "plan": plan},
    )

    return {
        "client_secret": pi.client_secret,
        "amount": amount,
        "currency": "usd",
    }


async def handle_stripe_webhook(
    payload: bytes, sig_header: str, db: AsyncSession
) -> None:
    """Verify and process a Stripe webhook event."""
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Stripe webhook signature.",
        )

    if event["type"] == "payment_intent.succeeded":
        pi_obj = event["data"]["object"]
        metadata = pi_obj.get("metadata", {})
        user_id_str = metadata.get("user_id")
        plan = metadata.get("plan")

        if not user_id_str or not plan:
            return

        result = await db.execute(select(User).where(User.id == uuid.UUID(user_id_str)))
        user = result.scalar_one_or_none()
        if user is None:
            return

        billing_interval = plan  # "monthly" or "annual"
        ends_at = _subscription_ends_at(billing_interval)
        activate_pro(user, billing_interval, ends_at)

        amount_received = pi_obj.get("amount_received", pi_obj.get("amount", 0))
        tx = Transaction(
            user_id=user.id,
            payment_method="debit_card",
            external_tx_id=pi_obj["id"],
            amount=amount_received / 100,
            currency=pi_obj.get("currency", "usd"),
            status="succeeded",
        )
        db.add(tx)
        await db.commit()


# ---------------------------------------------------------------------------
# PayPal
# ---------------------------------------------------------------------------

async def _get_paypal_access_token() -> str:
    """Obtain a PayPal OAuth2 access token using client credentials."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PAYPAL_BASE_URL}/v1/oauth2/token",
            data={"grant_type": "client_credentials"},
            auth=(settings.PAYPAL_CLIENT_ID, settings.PAYPAL_CLIENT_SECRET),
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
        return response.json()["access_token"]


async def create_paypal_order(user_id: uuid.UUID, plan: str) -> dict:
    """Create a PayPal order and return order_id + approval_url."""
    value = PLAN_VALUES.get(plan)
    if value is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan: {plan}. Must be 'monthly' or 'annual'.",
        )

    access_token = await _get_paypal_access_token()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders",
            json={
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "amount": {
                            "currency_code": "USD",
                            "value": value,
                        },
                        "custom_id": f"{user_id}:{plan}",
                    }
                ],
            },
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        data = response.json()

    order_id = data["id"]
    approval_url = next(
        (link["href"] for link in data.get("links", []) if link["rel"] == "approve"),
        None,
    )

    return {"order_id": order_id, "approval_url": approval_url}


async def capture_paypal_order(
    user_id: uuid.UUID, order_id: str, db: AsyncSession
) -> dict:
    """Capture a PayPal order and activate pro subscription on success."""
    access_token = await _get_paypal_access_token()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        data = response.json()

    capture_status = data.get("status")
    if capture_status != "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"PayPal capture not completed: {capture_status}",
        )

    # Extract plan from custom_id stored in purchase_units
    custom_id: str = ""
    capture_id: str = order_id
    amount_value: float = 0.0
    currency: str = "usd"

    purchase_units = data.get("purchase_units", [])
    if purchase_units:
        pu = purchase_units[0]
        custom_id = pu.get("custom_id", "")
        payments = pu.get("payments", {})
        captures = payments.get("captures", [])
        if captures:
            cap = captures[0]
            capture_id = cap.get("id", order_id)
            amt = cap.get("amount", {})
            amount_value = float(amt.get("value", 0))
            currency = amt.get("currency_code", "USD").lower()

    plan = "monthly"
    if ":" in custom_id:
        plan = custom_id.split(":", 1)[1]

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    billing_interval = plan
    ends_at = _subscription_ends_at(billing_interval)
    activate_pro(user, billing_interval, ends_at)

    tx = Transaction(
        user_id=user.id,
        payment_method="paypal",
        external_tx_id=capture_id,
        amount=amount_value,
        currency=currency,
        status="succeeded",
    )
    db.add(tx)
    await db.commit()

    return {"status": "succeeded", "order_id": order_id}


async def handle_paypal_webhook(payload: dict, db: AsyncSession) -> None:
    """Process PayPal webhook events (PAYMENT.CAPTURE.COMPLETED)."""
    event_type = payload.get("event_type")
    if event_type != "PAYMENT.CAPTURE.COMPLETED":
        return

    resource = payload.get("resource", {})
    capture_id = resource.get("id")
    if not capture_id:
        return

    # Update transaction status if the record already exists
    result = await db.execute(
        select(Transaction).where(Transaction.external_tx_id == capture_id)
    )
    tx = result.scalar_one_or_none()
    if tx is not None and tx.status != "succeeded":
        tx.status = "succeeded"
        await db.commit()


# ---------------------------------------------------------------------------
# Billing history
# ---------------------------------------------------------------------------

async def get_billing_history(user_id: uuid.UUID, db: AsyncSession) -> dict:
    """Return tier, subscription_ends_at, and transaction history for a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    tx_result = await db.execute(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.created_at.desc())
    )
    transactions = tx_result.scalars().all()

    return {
        "tier": get_effective_tier(user),
        "subscription_ends_at": user.subscription_ends_at,
        "transactions": [
            {
                "id": str(tx.id),
                "payment_method": tx.payment_method,
                "external_tx_id": tx.external_tx_id,
                "amount": float(tx.amount),
                "currency": tx.currency,
                "status": tx.status,
                "created_at": tx.created_at,
            }
            for tx in transactions
        ],
    }
