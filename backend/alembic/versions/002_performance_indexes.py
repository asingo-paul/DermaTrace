"""Add performance indexes for high-traffic queries.

Revision ID: 002
Revises: 001
Create Date: 2026-04-03

"""
from typing import Sequence, Union
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Reactions ordered by date desc — most common query pattern
    op.create_index("ix_reactions_user_date", "reactions", ["user_id", "reaction_date"])

    # Products ordered by created_at desc
    op.create_index("ix_products_user_created", "products", ["user_id", "created_at"])

    # Trigger results — latest batch per user
    op.create_index("ix_trigger_results_user_analyzed", "trigger_results", ["user_id", "analyzed_at"])

    # Transactions ordered by created_at desc
    op.create_index("ix_transactions_user_created", "transactions", ["user_id", "created_at"])

    # Catalog products filter (used by recommendation engine)
    op.create_index("ix_products_catalog", "products", ["is_catalog"])

    # Users by email — login lookup
    op.create_index("ix_users_email", "users", ["email"])


def downgrade() -> None:
    op.drop_index("ix_reactions_user_date", "reactions")
    op.drop_index("ix_products_user_created", "products")
    op.drop_index("ix_trigger_results_user_analyzed", "trigger_results")
    op.drop_index("ix_transactions_user_created", "transactions")
    op.drop_index("ix_products_catalog", "products")
    op.drop_index("ix_users_email", "users")
