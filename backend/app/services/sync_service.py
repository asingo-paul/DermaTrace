"""Service functions for offline sync (pull/push)."""

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.reaction import Reaction


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_product(p: Product) -> dict[str, Any]:
    return {
        "id": str(p.id),
        "user_id": str(p.user_id),
        "name": p.name,
        "brand": p.brand,
        "ingredients": p.ingredients,
        "image_url": p.image_url,
        "is_catalog": p.is_catalog,
        "created_at": p.created_at.isoformat(),
        "updated_at": p.updated_at.isoformat(),
    }


def _serialize_reaction(r: Reaction) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "user_id": str(r.user_id),
        "reaction_date": r.reaction_date.isoformat(),
        "severity": r.severity,
        "symptoms": r.symptoms,
        "notes": r.notes,
        "created_at": r.created_at.isoformat(),
        "updated_at": r.updated_at.isoformat(),
    }


async def pull(
    user_id: uuid.UUID,
    last_pulled_at: float | None,
    db: AsyncSession,
) -> dict[str, Any]:
    """Return changes since last_pulled_at timestamp (Unix epoch seconds).

    Returns:
    {
        "changes": {
            "products": {"created": [...], "updated": [...], "deleted": [str_id, ...]},
            "reactions": {"created": [...], "updated": [...], "deleted": [str_id, ...]}
        },
        "timestamp": int  # current Unix timestamp
    }
    """
    now = _utcnow()
    now_ts = int(now.timestamp())

    if last_pulled_at is None:
        # First sync — return everything as "created"
        products_result = await db.execute(
            select(Product).where(Product.user_id == user_id)
        )
        products = list(products_result.scalars().all())

        reactions_result = await db.execute(
            select(Reaction).where(Reaction.user_id == user_id)
        )
        reactions = list(reactions_result.scalars().all())

        return {
            "changes": {
                "products": {
                    "created": [_serialize_product(p) for p in products],
                    "updated": [],
                    "deleted": [],
                },
                "reactions": {
                    "created": [_serialize_reaction(r) for r in reactions],
                    "updated": [],
                    "deleted": [],
                },
            },
            "timestamp": now_ts,
        }

    # Incremental sync — split into created vs updated based on created_at
    since = datetime.fromtimestamp(last_pulled_at, tz=timezone.utc)

    products_result = await db.execute(
        select(Product).where(
            Product.user_id == user_id,
            Product.updated_at > since,
        )
    )
    products = list(products_result.scalars().all())

    reactions_result = await db.execute(
        select(Reaction).where(
            Reaction.user_id == user_id,
            Reaction.updated_at > since,
        )
    )
    reactions = list(reactions_result.scalars().all())

    products_created = [_serialize_product(p) for p in products if p.created_at > since]
    products_updated = [_serialize_product(p) for p in products if p.created_at <= since]

    reactions_created = [_serialize_reaction(r) for r in reactions if r.created_at > since]
    reactions_updated = [_serialize_reaction(r) for r in reactions if r.created_at <= since]

    return {
        "changes": {
            "products": {
                "created": products_created,
                "updated": products_updated,
                "deleted": [],
            },
            "reactions": {
                "created": reactions_created,
                "updated": reactions_updated,
                "deleted": [],
            },
        },
        "timestamp": now_ts,
    }


async def push(
    user_id: uuid.UUID,
    changes: dict[str, Any],
    db: AsyncSession,
) -> None:
    """Apply local changes from the mobile client using last-write-wins by updated_at."""

    # --- Products ---
    product_changes: dict[str, Any] = changes.get("products", {})

    for record in list(product_changes.get("created", [])) + list(product_changes.get("updated", [])):
        record_id = uuid.UUID(record["id"])
        client_updated_at = datetime.fromisoformat(record["updated_at"])
        if client_updated_at.tzinfo is None:
            client_updated_at = client_updated_at.replace(tzinfo=timezone.utc)

        result = await db.execute(select(Product).where(Product.id == record_id))
        existing = result.scalar_one_or_none()

        if existing is not None:
            server_updated_at = existing.updated_at
            if server_updated_at.tzinfo is None:
                server_updated_at = server_updated_at.replace(tzinfo=timezone.utc)
            if server_updated_at >= client_updated_at:
                continue  # server wins

            # Client wins — update fields
            existing.name = record.get("name", existing.name)
            existing.brand = record.get("brand", existing.brand)
            existing.ingredients = record.get("ingredients", existing.ingredients)
            existing.image_url = record.get("image_url", existing.image_url)
            existing.is_catalog = record.get("is_catalog", existing.is_catalog)
            existing.updated_at = client_updated_at
            existing.user_id = user_id  # enforce ownership
        else:
            product = Product(
                id=record_id,
                user_id=user_id,
                name=record.get("name", ""),
                brand=record.get("brand"),
                ingredients=record.get("ingredients", []),
                image_url=record.get("image_url"),
                is_catalog=record.get("is_catalog", False),
                updated_at=client_updated_at,
            )
            if "created_at" in record:
                created_at = datetime.fromisoformat(record["created_at"])
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                product.created_at = created_at
            db.add(product)

    for str_id in product_changes.get("deleted", []):
        record_id = uuid.UUID(str_id)
        result = await db.execute(select(Product).where(Product.id == record_id))
        existing = result.scalar_one_or_none()
        if existing is not None and existing.user_id == user_id:
            await db.delete(existing)

    # --- Reactions ---
    reaction_changes: dict[str, Any] = changes.get("reactions", {})

    for record in list(reaction_changes.get("created", [])) + list(reaction_changes.get("updated", [])):
        record_id = uuid.UUID(record["id"])
        client_updated_at = datetime.fromisoformat(record["updated_at"])
        if client_updated_at.tzinfo is None:
            client_updated_at = client_updated_at.replace(tzinfo=timezone.utc)

        result = await db.execute(select(Reaction).where(Reaction.id == record_id))
        existing = result.scalar_one_or_none()

        if existing is not None:
            server_updated_at = existing.updated_at
            if server_updated_at.tzinfo is None:
                server_updated_at = server_updated_at.replace(tzinfo=timezone.utc)
            if server_updated_at >= client_updated_at:
                continue  # server wins

            existing.reaction_date = datetime.fromisoformat(record["reaction_date"]).date() if "reaction_date" in record else existing.reaction_date
            existing.severity = record.get("severity", existing.severity)
            existing.symptoms = record.get("symptoms", existing.symptoms)
            existing.notes = record.get("notes", existing.notes)
            existing.updated_at = client_updated_at
            existing.user_id = user_id  # enforce ownership
        else:
            reaction_date_raw = record.get("reaction_date", datetime.now(timezone.utc).date().isoformat())
            reaction_date = datetime.fromisoformat(reaction_date_raw).date()

            reaction = Reaction(
                id=record_id,
                user_id=user_id,
                reaction_date=reaction_date,
                severity=record.get("severity", "mild"),
                symptoms=record.get("symptoms", []),
                notes=record.get("notes"),
                updated_at=client_updated_at,
            )
            if "created_at" in record:
                created_at = datetime.fromisoformat(record["created_at"])
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                reaction.created_at = created_at
            db.add(reaction)

    for str_id in reaction_changes.get("deleted", []):
        record_id = uuid.UUID(str_id)
        result = await db.execute(select(Reaction).where(Reaction.id == record_id))
        existing = result.scalar_one_or_none()
        if existing is not None and existing.user_id == user_id:
            await db.delete(existing)

    await db.commit()
