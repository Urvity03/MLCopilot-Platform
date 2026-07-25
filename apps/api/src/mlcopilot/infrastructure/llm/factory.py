"""Factory for creating the Gemini LLM provider instance."""

from __future__ import annotations

from typing import TYPE_CHECKING

from mlcopilot.core.logging import get_logger
from mlcopilot.infrastructure.llm.base import BaseLLMProvider
from mlcopilot.infrastructure.llm.gemini import GeminiProvider

if TYPE_CHECKING:
    from mlcopilot.core.config import Settings

logger = get_logger("mlcopilot.infrastructure.llm.factory")


class LLMFactory:
    """Factory class responsible for instantiating the Gemini LLM provider."""

    @staticmethod
    def create_provider(settings: Settings) -> BaseLLMProvider:
        """Create the Gemini LLM provider from application settings."""
        key = settings.effective_gemini_api_key.get_secret_value().strip()
        model = settings.gemini_model or "gemini-3.6-flash"
        logger.info(
            "llm.factory.instantiated",
            provider="gemini",
            model=model,
            has_key=bool(key),
        )
        return GeminiProvider(api_key=key if key else None, model_name=model)
