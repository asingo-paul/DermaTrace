"""Recommendation engine service."""

import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.trigger_result import TriggerResult

MAX_RECOMMENDATIONS = 10


async def get_recommendations(user_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    """Return up to 10 catalog products that contain none of the user's trigger ingredients.

    Raises HTTP 400 if no trigger analysis has been run yet.
    """
    # Fetch all trigger results for the user
    triggers_result = await db.execute(
        select(TriggerResult)
        .where(TriggerResult.user_id == user_id)
        .order_by(TriggerResult.analyzed_at.desc())
    )
    all_triggers = triggers_result.scalars().all()

    if not all_triggers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trigger analysis must be completed before recommendations can be generated",
        )

    # Get the most recent batch (same analyzed_at timestamp)
    latest_analyzed_at: datetime = all_triggers[0].analyzed_at
    trigger_ingredients = {
        t.ingredient.lower()
        for t in all_triggers
        if t.analyzed_at == latest_analyzed_at
    }

    # Fetch all catalog products
    catalog_result = await db.execute(
        select(Product).where(Product.is_catalog == True)  # noqa: E712
    )
    catalog_products = catalog_result.scalars().all()

    # Filter out products containing any trigger ingredient
    recommendations: list[dict] = []
    for product in catalog_products:
        product_ingredients_lower = {
            str(ing).lower() for ing in (product.ingredients or [])
        }
        if not trigger_ingredients.intersection(product_ingredients_lower):
            recommendations.append(
                {
                    "id": product.id,
                    "name": product.name,
                    "brand": product.brand,
                    "ingredients": product.ingredients or [],
                }
            )
        if len(recommendations) >= MAX_RECOMMENDATIONS:
            break

    return recommendations
