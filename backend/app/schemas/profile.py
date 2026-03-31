"""Pydantic schemas for user profile endpoints."""

from enum import Enum

from pydantic import BaseModel, Field


class SkinType(str, Enum):
    normal = "normal"
    dry = "dry"
    oily = "oily"
    combination = "combination"
    sensitive = "sensitive"


class SensitivityLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ProfileResponse(BaseModel):
    email: str
    skin_type: SkinType | None = None
    known_allergies: str | None = None
    sensitivity_level: SensitivityLevel | None = None

    model_config = {"from_attributes": True}


class ProfileUpdateRequest(BaseModel):
    skin_type: SkinType | None = None
    known_allergies: str | None = Field(default=None, max_length=10000)
    sensitivity_level: SensitivityLevel | None = None
