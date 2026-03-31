"""Pydantic schemas for product endpoints."""

import uuid
from datetime import datetime
from typing import Annotated, Optional

from pydantic import BaseModel, ConfigDict, Field

_Str10k = Annotated[str, Field(max_length=10000)]


class ProductCreateRequest(BaseModel):
    name: _Str10k
    brand: Optional[_Str10k] = None
    ingredients: list[str] = []
    image_url: Optional[str] = None


class ProductResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    brand: Optional[str]
    ingredients: list[str]
    image_url: Optional[str]
    is_catalog: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
