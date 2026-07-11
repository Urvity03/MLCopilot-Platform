"""OpenAI implementation of the LLMProvider protocol."""

from __future__ import annotations

from typing import TYPE_CHECKING

from openai import AsyncOpenAI

if TYPE_CHECKING:
    from collections.abc import AsyncIterator


class OpenAIProvider:
    """Concrete implementation of LLMProvider using OpenAI's AsyncOpenAI SDK client."""

    def __init__(self, api_key: str, model_name: str = "gpt-4o-mini") -> None:
        # Use a dummy key if none provided to allow startup/injection
        # checks to pass without breaking
        clean_key = api_key if api_key.strip() else "mocked-key"
        self._client = AsyncOpenAI(api_key=clean_key)
        self._model_name = model_name

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Execute a blocking complete text generation call."""
        response = await self._client.chat.completions.create(
            model=self._model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
        )
        return response.choices[0].message.content or ""

    async def generate_stream(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        """Execute a streaming text generation call returning token chunks."""
        stream = await self._client.chat.completions.create(
            model=self._model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.0,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
