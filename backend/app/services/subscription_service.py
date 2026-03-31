"""Subscription service — tier resolution and lifecycle management."""

from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


def get_effective_tier(user: User) -> str:
    """Return the user's effective subscription tier, accounting for expiry."""
    now = datetime.now(timezone.utc)

    if user.subscription_tier == "trial":
        if user.trial_ends_at is not None and user.trial_ends_at < now:
            return "free"

    elif user.subscription_tier == "pro":
        if user.subscription_ends_at is not None and user.subscription_ends_at < now:
            return "free"

    return user.subscription_tier


def get_subscription(user: User) -> dict:
    """Return a dict describing the user's current subscription state."""
    return {
        "tier": get_effective_tier(user),
        "trial_ends_at": user.trial_ends_at,
        "subscription_ends_at": user.subscription_ends_at,
        "billing_interval": user.billing_interval,
    }


def activate_trial(user: User) -> None:
    """Set the user to trial tier with a 14-day window. Caller must commit."""
    now = datetime.now(timezone.utc)
    user.subscription_tier = "trial"
    user.trial_ends_at = now + timedelta(days=14)


def activate_pro(
    user: User,
    billing_interval: str,
    subscription_ends_at: datetime,
) -> None:
    """Upgrade the user to pro. Caller must commit."""
    user.subscription_tier = "pro"
    user.billing_interval = billing_interval
    user.subscription_ends_at = subscription_ends_at


async def cancel_subscription(user: User, db: AsyncSession) -> None:
    """Cancel renewal without revoking access immediately.

    Clears billing_interval so no renewal occurs; subscription_ends_at
    remains so access continues until the end of the billing period.
    """
    user.billing_interval = None
    await db.commit()


async def change_plan(user: User, new_interval: str, db: AsyncSession) -> None:
    """Switch the billing interval for an active pro subscription."""
    user.billing_interval = new_interval
    await db.commit()
