"""Factory for creating LLM provider instances (Ollama, Gemini, OpenRouter)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from mlcopilot.core.logging import get_logger
from mlcopilot.infrastructure.llm.base import BaseLLMProvider
from mlcopilot.infrastructure.llm.gemini import GeminiProvider
from mlcopilot.infrastructure.llm.ollama import OllamaProvider

if TYPE_CHECKING:
    from mlcopilot.core.config import Settings

logger = get_logger("mlcopilot.infrastructure.llm.factory")


class LLMFactory:
    """Factory class responsible for instantiating configured LLM providers."""

    @staticmethod
    def create_provider(settings: Settings) -> BaseLLMProvider:
        """Create an LLM provider instance based on application settings."""
        provider_name = (settings.llm_provider or "ollama").lower()

        if provider_name == "ollama":
            model = settings.ollama_model or "qwen3:8b"
            base_url = settings.ollama_base_url or "http://host.docker.internal:11434"
            logger.info(
                "llm.factory.instantiated",
                provider="ollama",
                model=model,
                base_url=base_url,
            )
            return OllamaProvider(base_url=base_url, model_name=model)

        if provider_name == "gemini":
            key = settings.effective_gemini_api_key.get_secret_value().strip()
            model = settings.gemini_model or "gemini-3.6-flash"
            logger.info(
                "llm.factory.instantiated",
                provider="gemini",
                model=model,
                has_key=bool(key),
            )
            return GeminiProvider(api_key=key if key else None, model_name=model)

        if provider_name == "openrouter":
            raise NotImplementedError(
                "OpenRouter LLM provider is scheduled for a future release."
            )

        raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")
