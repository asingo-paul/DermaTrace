"""Router for product endpoints."""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.product import ProductCreateRequest, ProductResponse
from app.services.product_service import (
    create_product,
    delete_product,
    list_products,
    upload_product_image,
)

router = APIRouter()


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product_endpoint(
    data: ProductCreateRequest,
    image: Optional[UploadFile] = File(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProductResponse:
    """Create a new product. Optionally upload an image."""
    if image is not None:
        file_bytes = await image.read()
        image_url = await upload_product_image(
            file_bytes=file_bytes,
            filename=image.filename or f"{uuid.uuid4()}",
            content_type=image.content_type or "application/octet-stream",
        )
        data = data.model_copy(update={"image_url": image_url})

    product = await create_product(current_user, data, db)
    return ProductResponse.model_validate(product)


@router.get("", response_model=list[ProductResponse], status_code=status.HTTP_200_OK)
async def list_products_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProductResponse]:
    """Return all products for the authenticated user."""
    products = await list_products(current_user, db)
    return [ProductResponse.model_validate(p) for p in products]


@router.delete(
    "/{product_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def delete_product_endpoint(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a product owned by the authenticated user."""
    await delete_product(product_id, current_user, db)
