"""Ingredients router — ingredient parsing endpoints."""

from fastapi import APIRouter, Depends

from app.dependencies import require_pro
from app.models.user import User
from app.schemas.ingredient import ParseIngredientsRequest, ParseIngredientsResponse
from app.services.ingredient_parser import parse_ingredients

router = APIRouter()


@router.post("/parse", response_model=ParseIngredientsResponse)
async def parse_ingredients_endpoint(
    body: ParseIngredientsRequest,
    current_user: User = Depends(require_pro),
) -> ParseIngredientsResponse:
    """Parse a raw ingredient string into an ordered list of ingredient names."""
    ingredients = parse_ingredients(body.raw)
    return ParseIngredientsResponse(ingredients=ingredients)
