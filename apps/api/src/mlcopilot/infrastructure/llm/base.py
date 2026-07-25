"""Base class definition for LLM providers."""

from __future__ import annotations

import abc
from typing import TYPE_CHECKING

from mlcopilot.domain.chat import LLMProvider

if TYPE_CHECKING:
    from collections.abc import AsyncIterator


class BaseLLMProvider(abc.ABC, LLMProvider):
    """Abstract base class that all LLM providers must implement."""

    @abc.abstractmethod
    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Execute a blocking complete text generation call."""
        ...

    @abc.abstractmethod
    def generate_stream(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        """Execute a streaming text generation call returning token chunks."""
        ...

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        """Alias for generate method."""
        return await self.generate(system_prompt, user_prompt)

    def stream_chat(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        """Alias for generate_stream method."""
        return self.generate_stream(system_prompt, user_prompt)
