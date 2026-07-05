"""Async engine and session factory construction.

The engine is created once per process in the application lifespan and
shared via ``app.state``; sessions are request-scoped and handed to
services through FastAPI dependencies.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

if TYPE_CHECKING:
    from mlcopilot.core.config import Settings


def create_engine(settings: Settings) -> AsyncEngine:
    """Build the process-wide async engine with pool health checking."""
    return create_async_engine(
        settings.database_url,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_timeout=settings.database_pool_timeout_seconds,
        pool_pre_ping=True,
        echo=False,
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Session factory; ``expire_on_commit=False`` keeps entities usable after commit."""
    return async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
