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
    from mlcopilot.core.logging import get_logger
    logger = get_logger("mlcopilot.features.chat.deps")

    provider_type = (settings.ai_provider or "openai").lower()
    openai_key = settings.openai_api_key.get_secret_value()
    openrouter_key = settings.openrouter_api_key.get_secret_value()
    anthropic_key = settings.anthropic_api_key.get_secret_value()

    # Detect provider based on settings or key presence
    if provider_type == "openrouter" or (openrouter_key and not openai_key and not anthropic_key):
        base_url = "https://openrouter.ai/api/v1"
        model = settings.openrouter_model or "openai/gpt-4o-mini"
        logger.info("llm.provider.instantiated", provider="openrouter", base_url=base_url, model=model, has_key=bool(openrouter_key))
        return OpenAIProvider(api_key=openrouter_key, model_name=model, base_url=base_url)

    elif provider_type == "azure":
        base_url = settings.azure_openai_endpoint or None
        model = settings.azure_openai_deployment_name or "gpt-4o-mini"
        key = settings.azure_openai_api_key.get_secret_value()
        logger.info("llm.provider.instantiated", provider="azure", base_url=base_url, model=model, has_key=bool(key))
        return OpenAIProvider(api_key=key, model_name=model, base_url=base_url)

    elif provider_type == "ollama":
        base_url = settings.ollama_base_url or "http://host.docker.internal:11434/v1"
        model = "llama3"
        logger.info("llm.provider.instantiated", provider="ollama", base_url=base_url, model=model)
        return OpenAIProvider(api_key="ollama", model_name=model, base_url=base_url)

    else:
        base_url = settings.openai_base_url or None
        model = settings.openai_model or "gpt-4o-mini"
        logger.info("llm.provider.instantiated", provider="openai", base_url=base_url or "https://api.openai.com/v1", model=model, has_key=bool(openai_key))
        return OpenAIProvider(api_key=openai_key, model_name=model, base_url=base_url)


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
