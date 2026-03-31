"""Pydantic schemas for reaction endpoints."""

import uuid
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Severity(str, Enum):
    """Severity levels for reactions."""
    mild = "mild"
    moderate = "moderate"
    severe = "severe"


class Symptom(str, Enum):
    """Possible symptoms for reactions."""
    rash = "rash"
    itching = "itching"
    acne = "acne"
    swelling = "swelling"
    redness = "redness"
    dryness = "dryness"
    burning = "burning"
    hives = "hives"


class ReactionCreateRequest(BaseModel):
    """Request schema for creating a reaction."""
    reaction_date: date
    severity: Severity
    symptoms: list[Symptom] = Field(min_length=1)
    product_ids: list[uuid.UUID] = Field(min_length=1)
    notes: str | None = Field(default=None, max_length=10000)


class ReactionResponse(BaseModel):
    """Response schema for reaction data."""
    id: uuid.UUID
    user_id: uuid.UUID
    reaction_date: date
    severity: str
    symptoms: list[str]
    notes: str | None
    product_ids: list[uuid.UUID]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
