"""FastAPI dependencies for Project Memory."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from mlcopilot.features.memory.repository import MemoryRepository
from mlcopilot.features.memory.service import MemoryService
from mlcopilot.infrastructure.db.repositories.memory import (
    SqlAlchemyMemoryRepository,
)
from mlcopilot.infrastructure.db.session import get_db_session


async def get_memory_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> MemoryRepository:
    """FastAPI dependency to resolve MemoryRepository."""
    return SqlAlchemyMemoryRepository(session)


async def get_memory_service(
    memory_repo: Annotated[MemoryRepository, Depends(get_memory_repository)],
) -> MemoryService:
    """FastAPI dependency to resolve MemoryService."""
    return MemoryService(memory_repo)
