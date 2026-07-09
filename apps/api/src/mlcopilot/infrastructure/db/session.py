"""Request-scoped database session dependency."""

from __future__ import annotations

from typing import TYPE_CHECKING

# FastAPI resolves dependency annotations at runtime, so ``Request`` must be
# a real runtime import (see features/health/deps.py for details).
from fastapi import Request

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    """Yield one session per request; commit on success, rollback on error, always close.
    """
    session_factory: async_sessionmaker[AsyncSession] = request.app.state.db_session_factory
    session = session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
