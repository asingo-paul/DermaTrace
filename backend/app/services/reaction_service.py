"""Service functions for reaction management."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reaction import Reaction, ReactionProduct
from app.models.product import Product
from app.models.user import User
from app.schemas.reaction import ReactionCreateRequest


async def create_reaction(
    user: User, data: ReactionCreateRequest, db: AsyncSession
) -> dict:
    """Create a new reaction for the user, enforcing free tier limits."""
    # Check free tier limit
    if user.subscription_tier == "free":
        count_result = await db.execute(
            select(func.count()).select_from(Reaction).where(Reaction.user_id == user.id)
        )
        count = count_result.scalar_one()
        if count >= 20:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Free tier limit reached: maximum 20 reactions. "
                    "Upgrade to Pro for unlimited logging."
                ),
            )

    # Validate all product_ids belong to current user
    for product_id in data.product_ids:
        result = await db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        if product is None or product.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

    # Create Reaction record
    reaction = Reaction(
        user_id=user.id,
        reaction_date=data.reaction_date,
        severity=data.severity.value,
        symptoms=[symptom.value for symptom in data.symptoms],
        notes=data.notes,
    )
    db.add(reaction)
    await db.flush()  # Get the reaction.id before inserting associations

    # Insert rows into reaction_products association table
    for product_id in data.product_ids:
        await db.execute(
            insert(ReactionProduct).values(
                reaction_id=reaction.id,
                product_id=product_id,
            )
        )

    await db.commit()
    await db.refresh(reaction)

    # Return dict with reaction fields + product_ids list
    return {
        "id": reaction.id,
        "user_id": reaction.user_id,
        "reaction_date": reaction.reaction_date,
        "severity": reaction.severity,
        "symptoms": reaction.symptoms,
        "notes": reaction.notes,
        "product_ids": data.product_ids,
        "created_at": reaction.created_at,
    }


async def list_reactions(user: User, db: AsyncSession) -> list[dict]:
    """Return all reactions for user ordered by reaction_date desc."""
    # Fetch all reactions for user
    result = await db.execute(
        select(Reaction)
        .where(Reaction.user_id == user.id)
        .order_by(Reaction.reaction_date.desc())
    )
    reactions = result.scalars().all()

    # For each reaction, fetch linked product_ids
    reaction_list = []
    for reaction in reactions:
        product_result = await db.execute(
            select(ReactionProduct.c.product_id)
            .where(ReactionProduct.c.reaction_id == reaction.id)
        )
        product_ids = [row[0] for row in product_result.all()]

        reaction_list.append({
            "id": reaction.id,
            "user_id": reaction.user_id,
            "reaction_date": reaction.reaction_date,
            "severity": reaction.severity,
            "symptoms": reaction.symptoms,
            "notes": reaction.notes,
            "product_ids": product_ids,
            "created_at": reaction.created_at,
        })

    return reaction_list
