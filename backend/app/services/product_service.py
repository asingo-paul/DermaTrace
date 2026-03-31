"""Service functions for product management."""

import uuid
from typing import Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductCreateRequest

settings = get_settings()

FREE_TIER_PRODUCT_LIMIT = 10


async def create_product(
    user: User, data: ProductCreateRequest, db: AsyncSession
) -> Product:
    """Create a new product for the user, enforcing free tier limits."""
    if user.subscription_tier == "free":
        count_result = await db.execute(
            select(func.count()).select_from(Product).where(Product.user_id == user.id)
        )
        count = count_result.scalar_one()
        if count >= FREE_TIER_PRODUCT_LIMIT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Free tier limit reached: maximum 10 products. "
                    "Upgrade to Pro for unlimited logging."
                ),
            )

    product = Product(
        user_id=user.id,
        name=data.name,
        brand=data.brand,
        ingredients=data.ingredients,
        image_url=data.image_url,
        is_catalog=False,
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


async def list_products(user: User, db: AsyncSession) -> list[Product]:
    """Return all products belonging to the user."""
    result = await db.execute(
        select(Product).where(Product.user_id == user.id).order_by(Product.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_product(
    product_id: uuid.UUID, user: User, db: AsyncSession
) -> None:
    """Delete a product, raising 403 if not found or not owned by user."""
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()

    if product is None or product.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    await db.delete(product)
    await db.commit()


async def upload_product_image(
    file_bytes: bytes, filename: str, content_type: str
) -> str:
    """Upload an image to Supabase Storage and return its public URL."""
    upload_url = (
        f"{settings.SUPABASE_URL}/storage/v1/object/product-images/{filename}"
    )
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "Content-Type": content_type,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(upload_url, content=file_bytes, headers=headers)

    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Image upload failed",
        )

    public_url = (
        f"{settings.SUPABASE_URL}/storage/v1/object/public/product-images/{filename}"
    )
    return public_url
