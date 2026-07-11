"""FastAPI dependency injection provider for Chat & RAG features."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from mlcopilot.core.config import Settings, get_settings
from mlcopilot.domain.chat import ConversationRepository, LLMProvider
from mlcopilot.domain.embedding import EmbeddingProvider, EmbeddingRepository
from mlcopilot.features.chat.generation import GenerationService
from mlcopilot.features.chat.retrieval import RetrievalService
from mlcopilot.features.chat.service import RAGService
from mlcopilot.features.embeddings.deps import (
    get_embedding_provider,
    get_embedding_repository,
)
from mlcopilot.infrastructure.db.repositories.chat import (
    SqlAlchemyConversationRepository,
)
from mlcopilot.infrastructure.db.session import get_db_session
from mlcopilot.infrastructure.llm.openai import OpenAIProvider


async def get_llm_provider(
    settings: Annotated[Settings, Depends(get_settings)],
) -> LLMProvider:
    """Dependency injection wrapper providing the LLMProvider instance."""
    return OpenAIProvider(
        api_key=settings.openai_api_key.get_secret_value(),
        model_name="gpt-4o-mini",
    )


async def get_conversation_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ConversationRepository:
    """Dependency injection wrapper providing the SqlAlchemyConversationRepository."""
    return SqlAlchemyConversationRepository(session)


async def get_retrieval_service(
    embedding_provider: Annotated[
        EmbeddingProvider, Depends(get_embedding_provider)
    ],
    embedding_repo: Annotated[
        EmbeddingRepository, Depends(get_embedding_repository)
    ],
) -> RetrievalService:
    """Dependency injection wrapper providing the RetrievalService."""
    return RetrievalService(
        embedding_provider=embedding_provider,
        embedding_repo=embedding_repo,
    )


async def get_generation_service(
    llm_provider: Annotated[LLMProvider, Depends(get_llm_provider)],
) -> GenerationService:
    """Dependency injection wrapper providing the GenerationService."""
    return GenerationService(llm_provider=llm_provider)


async def get_rag_service(
    conversation_repo: Annotated[
        ConversationRepository, Depends(get_conversation_repository)
    ],
    retrieval_service: Annotated[
        RetrievalService, Depends(get_retrieval_service)
    ],
    generation_service: Annotated[
        GenerationService, Depends(get_generation_service)
    ],
) -> RAGService:
    """Dependency injection wrapper providing the RAGService orchestrator."""
    return RAGService(
        conversation_repo=conversation_repo,
        retrieval_service=retrieval_service,
        generation_service=generation_service,
    )
