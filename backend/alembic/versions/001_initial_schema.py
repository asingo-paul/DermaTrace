"""Initial schema — create all tables.

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("subscription_tier", sa.String(), nullable=False, server_default="trial"),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("subscription_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("billing_interval", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    # ------------------------------------------------------------------
    # profiles
    # ------------------------------------------------------------------
    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skin_type", sa.String(), nullable=True),
        sa.Column("known_allergies", sa.Text(), nullable=True),
        sa.Column("sensitivity_level", sa.String(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_profiles_user_id"),
    )
    op.create_index("ix_profiles_user_id", "profiles", ["user_id"])

    # ------------------------------------------------------------------
    # products
    # ------------------------------------------------------------------
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("brand", sa.String(), nullable=True),
        sa.Column("ingredients", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("image_url", sa.String(), nullable=True),
        sa.Column("is_catalog", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_products_user_id", "products", ["user_id"])

    # ------------------------------------------------------------------
    # reactions
    # ------------------------------------------------------------------
    op.create_table(
        "reactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reaction_date", sa.Date(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("symptoms", postgresql.ARRAY(sa.Text()), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_reactions_user_id", "reactions", ["user_id"])

    # ------------------------------------------------------------------
    # reaction_products  (association / junction table)
    # ------------------------------------------------------------------
    op.create_table(
        "reaction_products",
        sa.Column("reaction_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["reaction_id"], ["reactions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("reaction_id", "product_id"),
    )

    # ------------------------------------------------------------------
    # trigger_results
    # ------------------------------------------------------------------
    op.create_table(
        "trigger_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ingredient", sa.String(), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=False),
        sa.Column(
            "analyzed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_trigger_results_user_id", "trigger_results", ["user_id"])

    # ------------------------------------------------------------------
    # transactions
    # ------------------------------------------------------------------
    op.create_table(
        "transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payment_method", sa.String(), nullable=False),
        sa.Column("external_tx_id", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="usd"),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"])


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("trigger_results")
    op.drop_table("reaction_products")
    op.drop_table("reactions")
    op.drop_table("products")
    op.drop_table("profiles")
    op.drop_table("users")
