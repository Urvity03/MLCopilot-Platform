"""FastAPI dependencies for semantic search and vector generation."""

from __future__ import annotations

import functools
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from mlcopilot.core.config import get_settings
from mlcopilot.domain.embedding import EmbeddingProvider, EmbeddingRepository
from mlcopilot.features.embeddings.service import EmbeddingService
from mlcopilot.infrastructure.db.repositories.embedding import PostgresEmbeddingRepository
from mlcopilot.infrastructure.db.session import get_db_session
from mlcopilot.infrastructure.embeddings.sentence_transformer import (
    SentenceTransformerEmbeddingProvider,
)


@functools.lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    """Dependency to provide a process-wide cached EmbeddingProvider instance."""
    settings = get_settings()
    return SentenceTransformerEmbeddingProvider(
        model_name=settings.embedding_model_name,
    )


async def get_embedding_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> EmbeddingRepository:
    """Dependency to provide the PostgresEmbeddingRepository."""
    return PostgresEmbeddingRepository(session)


async def get_embedding_service(
    request: Request,
    provider: Annotated[EmbeddingProvider, Depends(get_embedding_provider)],
) -> EmbeddingService:
    """Dependency to provide the EmbeddingService."""
    settings = get_settings()
    session_factory: async_sessionmaker[AsyncSession] | None = getattr(
        request.app.state, "db_session_factory", None
    )
    return EmbeddingService(
        session_factory=session_factory,
        provider=provider,
        model_name=settings.embedding_model_name,
        dimension=settings.embedding_dimension,
    )
