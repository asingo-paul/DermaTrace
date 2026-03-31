"""Router for reaction endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.reaction import ReactionCreateRequest, ReactionResponse
from app.services.reaction_service import create_reaction, list_reactions

router = APIRouter()


@router.post("", response_model=ReactionResponse, status_code=status.HTTP_201_CREATED)
async def create_reaction_endpoint(
    data: ReactionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new reaction for the authenticated user."""
    return await create_reaction(current_user, data, db)


@router.get("", response_model=list[ReactionResponse], status_code=status.HTTP_200_OK)
async def list_reactions_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Return all reactions for the authenticated user."""
    return await list_reactions(current_user, db)
