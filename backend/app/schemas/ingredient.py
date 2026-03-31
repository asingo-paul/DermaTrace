"""Pydantic schemas for ingredient parsing."""

from pydantic import BaseModel, Field


class ParseIngredientsRequest(BaseModel):
    raw: str = Field(..., max_length=10000)


class ParseIngredientsResponse(BaseModel):
    ingredients: list[str]
