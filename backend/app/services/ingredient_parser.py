"""Ingredient parsing service."""

import re

from fastapi import HTTPException, status


def parse_ingredients(raw: str) -> list[str]:
    """Parse a raw ingredient string into an ordered list of ingredient names.

    Splits on commas and forward slashes, strips whitespace, and filters
    empty tokens. Raises HTTP 422 if the input is empty or whitespace-only.
    """
    if not raw or not raw.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Input must not be empty",
        )

    tokens = re.split(r"[,/]", raw)
    return [token.strip() for token in tokens if token.strip()]
