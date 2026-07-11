"""Generation service for RAG response output."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from mlcopilot.domain.chat import LLMProvider


class GenerationService:
    """Service layer responsible for invoking LLM completions and streaming text chunks."""

    def __init__(self, llm_provider: LLMProvider) -> None:
        self._llm_provider = llm_provider

    async def generate_response(
        self, system_prompt: str, user_prompt: str
    ) -> str:
        """Call the LLM provider for complete blocking generation."""
        return await self._llm_provider.generate(system_prompt, user_prompt)

    async def generate_response_stream(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        """Call the LLM provider for streaming response generation."""
        async for chunk in self._llm_provider.generate_stream(
            system_prompt, user_prompt
        ):
            yield chunk
