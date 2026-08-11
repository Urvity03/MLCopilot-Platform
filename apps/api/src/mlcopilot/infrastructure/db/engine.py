"""Async engine and session factory construction.

The engine is created once per process in the application lifespan and
shared via ``app.state``; sessions are request-scoped and handed to
services through FastAPI dependencies.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

if TYPE_CHECKING:
    from mlcopilot.core.config import Settings


def create_engine(settings: Settings) -> AsyncEngine:
    """Build the process-wide async engine with pool health checking."""
    connect_args: dict[str, Any] = {}
    if "neon.tech" in settings.database_url or "sslmode=" in settings.database_url:
        connect_args["ssl"] = "require"

    if settings.is_production:
        return create_async_engine(
            settings.database_url,
            poolclass=NullPool,
            connect_args=connect_args,
            pool_pre_ping=True,
            echo=False,
        )

    return create_async_engine(
        settings.database_url,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_timeout=settings.database_pool_timeout_seconds,
        pool_pre_ping=True,
        connect_args=connect_args,
        echo=False,
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Session factory; ``expire_on_commit=False`` keeps entities usable after commit."""
    return async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
