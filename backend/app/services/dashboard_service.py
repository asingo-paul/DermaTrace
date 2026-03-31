"""Dashboard aggregation service."""

from datetime import date, timedelta
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.reaction import Reaction, ReactionProduct
from app.models.user import User


async def get_dashboard(user: User, db: AsyncSession) -> dict[str, Any]:
    """Run four aggregation queries and return the dashboard payload."""

    # ------------------------------------------------------------------
    # (a) Timeline: products + reactions merged and sorted by date asc
    # ------------------------------------------------------------------
    products_result = await db.execute(
        select(Product.id, Product.name, Product.created_at).where(
            Product.user_id == user.id
        )
    )
    products_rows = products_result.all()

    reactions_result = await db.execute(
        select(Reaction.id, Reaction.severity, Reaction.reaction_date, Reaction.symptoms).where(
            Reaction.user_id == user.id
        )
    )
    reactions_rows = reactions_result.all()

    timeline: list[dict[str, Any]] = []
    for row in products_rows:
        timeline.append(
            {
                "id": str(row.id),
                "name": row.name,
                "date": row.created_at.date().isoformat(),
                "type": "product",
            }
        )
    for row in reactions_rows:
        timeline.append(
            {
                "id": str(row.id),
                "severity": row.severity,
                "date": row.reaction_date.isoformat()
                if isinstance(row.reaction_date, date)
                else row.reaction_date,
                "symptoms": row.symptoms,
                "type": "reaction",
            }
        )
    timeline.sort(key=lambda x: x["date"])

    # ------------------------------------------------------------------
    # (b) Reaction chart: counts per day for the past 30 days
    # ------------------------------------------------------------------
    today = date.today()
    start_date = today - timedelta(days=29)

    chart_result = await db.execute(
        select(Reaction.reaction_date, func.count(Reaction.id).label("count"))
        .where(Reaction.user_id == user.id)
        .where(Reaction.reaction_date >= start_date)
        .where(Reaction.reaction_date <= today)
        .group_by(Reaction.reaction_date)
    )
    counts_by_date: dict[str, int] = {
        row.reaction_date.isoformat(): row.count for row in chart_result.all()
    }

    reaction_chart: list[dict[str, Any]] = []
    for i in range(30):
        d = (start_date + timedelta(days=i)).isoformat()
        reaction_chart.append({"date": d, "count": counts_by_date.get(d, 0)})

    # ------------------------------------------------------------------
    # (c) Top 3 products by reaction count
    # ------------------------------------------------------------------
    top_products_result = await db.execute(
        select(Product.id, Product.name, func.count(ReactionProduct.c.reaction_id).label("reaction_count"))
        .join(ReactionProduct, ReactionProduct.c.product_id == Product.id)
        .join(Reaction, Reaction.id == ReactionProduct.c.reaction_id)
        .where(Reaction.user_id == user.id)
        .group_by(Product.id, Product.name)
        .order_by(func.count(ReactionProduct.c.reaction_id).desc())
        .limit(3)
    )
    top_products: list[dict[str, Any]] = [
        {"id": str(row.id), "name": row.name, "reaction_count": row.reaction_count}
        for row in top_products_result.all()
    ]

    # ------------------------------------------------------------------
    # (d) Top 3 symptoms by frequency
    # ------------------------------------------------------------------
    top_symptoms_result = await db.execute(
        select(
            func.unnest(Reaction.symptoms).label("symptom"),
            func.count(text("*")).label("count"),
        )
        .where(Reaction.user_id == user.id)
        .group_by(text("symptom"))
        .order_by(func.count(text("*")).desc())
        .limit(3)
    )
    top_symptoms: list[dict[str, Any]] = [
        {"symptom": row.symptom, "count": row.count}
        for row in top_symptoms_result.all()
    ]

    return {
        "timeline": timeline,
        "reaction_chart": reaction_chart,
        "top_products": top_products,
        "top_symptoms": top_symptoms,
    }
