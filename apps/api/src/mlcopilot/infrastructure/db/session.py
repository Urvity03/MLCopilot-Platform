"""Request-scoped database session dependency."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from fastapi import Request
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    """Yield one session per request; rollback on error, always close.

    Commits are the responsibility of the unit of work / service layer,
    never of this dependency.
    """
    session_factory: async_sessionmaker[AsyncSession] = request.app.state.db_session_factory
    session = session_factory()
    try:
        yield session
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
