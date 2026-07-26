"""Unit tests for Gemini REST LLM provider architecture and factory."""

from __future__ import annotations

from typing import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from pydantic import SecretStr

from mlcopilot.core.config import Settings
from mlcopilot.infrastructure.llm.base import BaseLLMProvider
from mlcopilot.infrastructure.llm.factory import LLMFactory
from mlcopilot.infrastructure.llm.gemini import GeminiProvider


class DummySuccessProvider(BaseLLMProvider):
    def __init__(self, name: str = "dummy"):
        self.name = name

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        return f"Response from {self.name}"

    async def generate_stream(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        yield f"Token from {self.name}"


@pytest.mark.asyncio
async def test_base_provider_aliases():
    provider = DummySuccessProvider("test")
    res = await provider.complete("sys", "user")
    assert res == "Response from test"

    tokens = []
    async for token in provider.stream_chat("sys", "user"):
        tokens.append(token)
    assert tokens == ["Token from test"]


def test_factory_creates_gemini():
    settings = Settings(
        llm_provider="gemini",
        gemini_api_key=SecretStr("test-key"),
        gemini_model="gemini-2.0-flash",
    )
    provider = LLMFactory.create_provider(settings)
    assert isinstance(provider, GeminiProvider)
    assert provider._model_name == "gemini-2.0-flash"


@pytest.mark.asyncio
async def test_gemini_rest_generate():
    provider = GeminiProvider(api_key="test-key", model_name="gemini-2.0-flash")

    req = httpx.Request("POST", "https://generativelanguage.googleapis.com")
    mock_response = httpx.Response(
        200,
        json={
            "candidates": [
                {"content": {"parts": [{"text": "Hello from Gemini REST"}]}}
            ]
        },
        request=req,
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.generate("system prompt", "user query")
        assert result == "Hello from Gemini REST"


@pytest.mark.asyncio
async def test_gemini_rest_generate_stream():
    provider = GeminiProvider(api_key="test-key", model_name="gemini-2.0-flash")

    mock_stream = AsyncMock()
    mock_stream.__aenter__.return_value.raise_for_status = MagicMock()

    async def mock_aiter_lines():
        yield 'data: {"candidates": [{"content": {"parts": [{"text": "Chunk 1 "}]}}]}'
        yield 'data: {"candidates": [{"content": {"parts": [{"text": "Chunk 2"}]}}]}'

    mock_stream.__aenter__.return_value.aiter_lines = mock_aiter_lines

    with patch.object(httpx.AsyncClient, "stream", return_value=mock_stream):
        tokens = []
        async for token in provider.generate_stream("system prompt", "user query"):
            tokens.append(token)

        assert tokens == ["Chunk 1 ", "Chunk 2"]
