"""Async SQLAlchemy engine with production-grade connection pooling."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import get_settings

settings = get_settings()

_is_pooler = "pooler.supabase.com" in settings.DATABASE_URL

# Supabase uses PgBouncer in transaction mode.
# PgBouncer transaction mode does NOT support prepared statements.
# Fix: set statement_cache_size=0 to disable asyncpg's prepared statement cache.
_connect_args = {
    "statement_cache_size": 0,
    "prepared_statement_cache_size": 0,
}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args=_connect_args,
    poolclass=NullPool if _is_pooler else None,
    **({} if _is_pooler else {
        "pool_size": 20,
        "max_overflow": 40,
        "pool_timeout": 30,
        "pool_recycle": 1800,
    }),
)

async_session_maker: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""


async def get_db() -> AsyncSession:  # type: ignore[return]
    """Yield a database session with automatic commit/rollback."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
