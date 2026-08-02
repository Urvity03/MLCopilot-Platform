"""Request-scoped database session dependency."""

from __future__ import annotations

from typing import TYPE_CHECKING
from fastapi import Request

if TYPE_CHECKING:
    from collections.abc import AsyncIterator
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    """Yield one session per request; commit on success, rollback on error, always close."""
    session_factory = getattr(request.app.state, "db_session_factory", None)
    if session_factory is None:
        from mlcopilot.core.config import get_settings
        from mlcopilot.infrastructure.db.engine import create_engine, create_session_factory
        settings = getattr(request.app.state, "settings", None) or get_settings()
        engine = create_engine(settings)
        session_factory = create_session_factory(engine)
        request.app.state.db_session_factory = session_factory

    session = session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
