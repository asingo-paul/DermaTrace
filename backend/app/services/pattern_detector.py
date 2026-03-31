"""Pattern detector service: co-occurrence frequency analysis for trigger ingredients."""

import uuid
from datetime import datetime, timezone

import pandas as pd
from fastapi import HTTPException, status
from sklearn.preprocessing import MultiLabelBinarizer
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.reaction import Reaction, ReactionProduct
from app.models.trigger_result import TriggerResult


async def detect_triggers(user_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    """Run co-occurrence analysis and return ranked trigger ingredients.

    Steps:
    1. Fetch all reactions + linked product ingredients for the user.
    2. Require >= 3 reactions (HTTP 400 otherwise).
    3. Build binary ingredient matrix via MultiLabelBinarizer.
    4. Compute raw_confidence = reaction_count / total_reactions.
    5. Compute catalog_frequency from is_catalog products.
    6. adjusted_confidence = max(0.0, raw_confidence - catalog_frequency).
    7. Sort descending, persist to trigger_results, return list of dicts.
    """
    # 1. Fetch all reactions for the user
    reactions_result = await db.execute(
        select(Reaction).where(Reaction.user_id == user_id)
    )
    reactions = reactions_result.scalars().all()

    # 2. Minimum data check
    if len(reactions) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient data: at least 3 reactions required for analysis",
        )

    # 3. For each reaction, collect the union of all ingredients across linked products
    reaction_ingredient_sets: list[list[str]] = []
    for reaction in reactions:
        product_ids_result = await db.execute(
            select(ReactionProduct.c.product_id).where(
                ReactionProduct.c.reaction_id == reaction.id
            )
        )
        product_ids = [row[0] for row in product_ids_result.all()]

        ingredients: list[str] = []
        if product_ids:
            products_result = await db.execute(
                select(Product).where(Product.id.in_(product_ids))
            )
            products = products_result.scalars().all()
            for product in products:
                if product.ingredients:
                    ingredients.extend(str(ing) for ing in product.ingredients)

        # Union (deduplicate) per reaction
        reaction_ingredient_sets.append(list(set(ingredients)))

    # 4. Build binary ingredient matrix
    mlb = MultiLabelBinarizer()
    matrix = mlb.fit_transform(reaction_ingredient_sets)
    ingredient_names: list[str] = list(mlb.classes_)

    df = pd.DataFrame(matrix, columns=ingredient_names)

    # 5. raw_confidence = reaction_count / total_reactions
    total_reactions = len(reactions)
    reaction_counts = df.sum(axis=0)  # number of reactions each ingredient appears in
    raw_confidence: pd.Series = reaction_counts / total_reactions

    # 6. catalog_frequency from is_catalog products
    catalog_result = await db.execute(
        select(Product).where(Product.is_catalog == True)  # noqa: E712
    )
    catalog_products = catalog_result.scalars().all()

    catalog_frequency: dict[str, float] = {ing: 0.0 for ing in ingredient_names}
    if catalog_products:
        total_catalog = len(catalog_products)
        catalog_ingredient_counts: dict[str, int] = {}
        for cp in catalog_products:
            if cp.ingredients:
                for ing in set(str(i) for i in cp.ingredients):
                    catalog_ingredient_counts[ing] = catalog_ingredient_counts.get(ing, 0) + 1
        for ing in ingredient_names:
            count = catalog_ingredient_counts.get(ing, 0)
            catalog_frequency[ing] = count / total_catalog

    # 7. adjusted_confidence = max(0.0, raw_confidence - catalog_frequency), clamped to [0, 1]
    analyzed_at = datetime.now(timezone.utc)
    results: list[dict] = []
    for ing in ingredient_names:
        adj = float(raw_confidence[ing]) - catalog_frequency[ing]
        adj = max(0.0, min(1.0, adj))
        results.append(
            {
                "ingredient": ing,
                "confidence_score": adj,
                "analyzed_at": analyzed_at,
            }
        )

    # 8. Sort by adjusted_confidence descending
    results.sort(key=lambda x: x["confidence_score"], reverse=True)

    # 9. Delete existing TriggerResult rows for this user, insert new ones
    await db.execute(delete(TriggerResult).where(TriggerResult.user_id == user_id))

    for item in results:
        db.add(
            TriggerResult(
                user_id=user_id,
                ingredient=item["ingredient"],
                confidence_score=item["confidence_score"],
                analyzed_at=analyzed_at,
            )
        )

    await db.commit()

    # 10. Return list of dicts
    return results
