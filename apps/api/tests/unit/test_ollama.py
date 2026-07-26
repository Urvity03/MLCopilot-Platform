"""Unit tests for Ollama REST LLM provider implementation and factory."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from mlcopilot.core.config import Settings
from mlcopilot.infrastructure.llm.factory import LLMFactory
from mlcopilot.infrastructure.llm.ollama import OllamaProvider


def test_factory_creates_ollama():
    """Verify LLMFactory instantiates OllamaProvider when llm_provider='ollama'."""
    settings = Settings(
        llm_provider="ollama",
        ollama_base_url="http://host.docker.internal:11434",
        ollama_model="qwen3:8b",
    )
    provider = LLMFactory.create_provider(settings)
    assert isinstance(provider, OllamaProvider)
    assert provider._model_name == "qwen3:8b"
    assert provider._base_url == "http://host.docker.internal:11434"


def test_factory_raises_for_unsupported_provider():
    """Verify LLMFactory raises ValueError for invalid provider name."""
    settings = Settings(llm_provider="gemini")
    settings.llm_provider = "unsupported_provider"  # type: ignore[assignment]
    with pytest.raises(ValueError, match="Unsupported LLM provider"):
        LLMFactory.create_provider(settings)


def test_factory_raises_not_implemented_for_openrouter():
    """Verify LLMFactory raises NotImplementedError for openrouter."""
    settings = Settings(llm_provider="openrouter")
    with pytest.raises(NotImplementedError, match="OpenRouter LLM provider"):
        LLMFactory.create_provider(settings)


@pytest.mark.asyncio
async def test_ollama_generate_success():
    """Verify blocking generation call returns text response."""
    provider = OllamaProvider(
        base_url="http://localhost:11434", model_name="qwen3:8b"
    )

    req = httpx.Request("POST", "http://localhost:11434/api/generate")
    mock_response = httpx.Response(
        200,
        json={"model": "qwen3:8b", "response": "Hello from Ollama", "done": True},
        request=req,
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        result = await provider.generate("System prompt", "User query")
        assert result == "Hello from Ollama"
        mock_post.assert_called_once()


@pytest.mark.asyncio
async def test_ollama_generate_stream_success():
    """Verify streaming generation yields token chunks correctly."""
    provider = OllamaProvider(
        base_url="http://localhost:11434", model_name="qwen3:8b"
    )

    mock_stream = AsyncMock()
    mock_stream.__aenter__.return_value.status_code = 200
    mock_stream.__aenter__.return_value.is_error = False

    async def mock_aiter_lines():
        yield '{"model": "qwen3:8b", "response": "Chunk 1 ", "done": false}'
        yield '{"model": "qwen3:8b", "response": "Chunk 2", "done": true}'

    mock_stream.__aenter__.return_value.aiter_lines = mock_aiter_lines

    with patch.object(httpx.AsyncClient, "stream", return_value=mock_stream):
        tokens = []
        async for token in provider.generate_stream("System prompt", "User query"):
            tokens.append(token)

        assert tokens == ["Chunk 1 ", "Chunk 2"]


@pytest.mark.asyncio
async def test_ollama_health_check():
    """Verify health_check returns True on HTTP 200 and False on connection failure."""
    provider = OllamaProvider(base_url="http://localhost:11434")

    req = httpx.Request("GET", "http://localhost:11434/api/tags")
    mock_response = httpx.Response(200, json={"models": []}, request=req)

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        assert await provider.health_check() is True

    with patch.object(httpx.AsyncClient, "get", side_effect=httpx.ConnectError("Refused")):
        assert await provider.health_check() is False


@pytest.mark.asyncio
async def test_ollama_list_models():
    """Verify list_models returns list of model names."""
    provider = OllamaProvider(base_url="http://localhost:11434")

    req = httpx.Request("GET", "http://localhost:11434/api/tags")
    mock_response = httpx.Response(
        200,
        json={"models": [{"name": "qwen3:8b"}, {"name": "llama3:8b"}]},
        request=req,
    )

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        models = await provider.list_models()
        assert models == ["qwen3:8b", "llama3:8b"]


@pytest.mark.asyncio
async def test_ollama_generate_model_404():
    """Verify generate raises ValueError when model is not found (404)."""
    provider = OllamaProvider(
        base_url="http://localhost:11434", model_name="nonexistent:model"
    )

    req = httpx.Request("POST", "http://localhost:11434/api/generate")
    mock_response = httpx.Response(404, text="Model not found", request=req)

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(ValueError, match="not found"):
            await provider.generate("System", "User")


@pytest.mark.asyncio
async def test_ollama_generate_connection_error():
    """Verify generate raises RuntimeError when server is unreachable."""
    provider = OllamaProvider(base_url="http://localhost:11434")

    with patch.object(
        httpx.AsyncClient, "post", side_effect=httpx.ConnectError("Connection refused")
    ):
        with pytest.raises(RuntimeError, match="unavailable"):
            await provider.generate("System", "User")
