"""Ollama implementation of the BaseLLMProvider protocol using direct REST API calls."""

from __future__ import annotations

import json
import time
from typing import TYPE_CHECKING, Any

import httpx

from mlcopilot.core.logging import get_logger
from mlcopilot.infrastructure.llm.base import BaseLLMProvider

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

logger = get_logger("mlcopilot.infrastructure.llm.ollama")


class OllamaProvider(BaseLLMProvider):
    """Concrete implementation of BaseLLMProvider using direct async REST HTTP calls to Ollama API."""

    def __init__(
        self,
        base_url: str = "http://host.docker.internal:11434",
        model_name: str = "qwen3:8b",
        timeout_seconds: float = 120.0,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model_name = model_name
        self._timeout_seconds = timeout_seconds

        logger.info(
            "llm.ollama.client_configured",
            base_url=self._base_url,
            model=self._model_name,
        )

    def _build_payload(
        self, system_prompt: str, user_prompt: str, stream: bool = False
    ) -> dict[str, Any]:
        """Construct standard Ollama REST API JSON payload."""
        payload: dict[str, Any] = {
            "model": self._model_name,
            "prompt": user_prompt,
            "stream": stream,
            "options": {
                "temperature": 0.0,
            },
        }
        if system_prompt and system_prompt.strip():
            payload["system"] = system_prompt.strip()
        return payload

    async def health_check(self) -> bool:
        """Check if the Ollama server is reachable and responding."""
        url = f"{self._base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(url)
                return response.status_code == 200
        except Exception as e:
            logger.debug(
                "llm.ollama.health_check_failed",
                base_url=self._base_url,
                error=str(e),
            )
            return False

    async def list_models(self) -> list[str]:
        """Retrieve available model tag names from the Ollama server."""
        url = f"{self._base_url}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                if response.is_error:
                    response.raise_for_status()
                data = response.json()
                models = data.get("models", [])
                return [m.get("name", "") for m in models if m.get("name")]
        except Exception as e:
            logger.error(
                "llm.ollama.list_models_failed",
                base_url=self._base_url,
                error=str(e),
            )
            raise e

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Execute a blocking complete text generation call via Ollama POST /api/generate API."""
        url = f"{self._base_url}/api/generate"
        payload = self._build_payload(system_prompt, user_prompt, stream=False)
        start_time = time.perf_counter()

        logger.info(
            "llm.ollama.http_request",
            method="POST",
            url=url,
            provider="ollama",
            model=self._model_name,
        )

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                logger.info(
                    "llm.ollama.http_response",
                    status_code=response.status_code,
                    provider="ollama",
                    model=self._model_name,
                    latency_ms=latency_ms,
                )

                if response.status_code == 404:
                    raise ValueError(
                        f"Ollama model '{self._model_name}' not found at {self._base_url}. "
                        f"Run 'ollama pull {self._model_name}' on the host."
                    )

                if response.is_error:
                    error_text = response.text
                    logger.error(
                        "llm.ollama.generation.http_error",
                        status_code=response.status_code,
                        response_body=error_text[:500],
                        provider="ollama",
                        model=self._model_name,
                    )
                    response.raise_for_status()

                data = response.json()
                return data.get("response", "")
        except httpx.ConnectError as e:
            msg = (
                f"Ollama server is unavailable at {self._base_url}. "
                f"Ensure Ollama is running on the host ('ollama serve')."
            )
            logger.error("llm.ollama.connection_refused", details=msg, provider="ollama", model=self._model_name)
            raise RuntimeError(msg) from e
        except Exception as e:
            logger.error(
                "llm.ollama.generation.error",
                error_type=type(e).__name__,
                details=str(e),
                provider="ollama",
                model=self._model_name,
            )
            raise e

    async def generate_stream(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        """Execute a streaming text generation call returning token chunks via Ollama POST /api/generate stream API."""
        url = f"{self._base_url}/api/generate"
        payload = self._build_payload(system_prompt, user_prompt, stream=True)
        start_time = time.perf_counter()

        logger.info(
            "llm.ollama.http_request_stream",
            method="POST",
            url=url,
            provider="ollama",
            model=self._model_name,
        )

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                async with client.stream(
                    "POST",
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                ) as response:
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                    logger.info(
                        "llm.ollama.http_response_stream_started",
                        status_code=response.status_code,
                        provider="ollama",
                        model=self._model_name,
                        latency_ms=latency_ms,
                    )

                    if response.status_code == 404:
                        await response.aread()
                        raise ValueError(
                            f"Ollama model '{self._model_name}' not found at {self._base_url}. "
                            f"Run 'ollama pull {self._model_name}' on the host."
                        )

                    if response.is_error:
                        await response.aread()
                        error_text = response.text
                        logger.error(
                            "llm.ollama.generation_stream.http_error",
                            status_code=response.status_code,
                            response_body=error_text[:500],
                            provider="ollama",
                            model=self._model_name,
                        )
                        response.raise_for_status()

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue

                        try:
                            data = json.loads(line)
                            token = data.get("response", "")
                            if token:
                                yield token
                            if data.get("done") is True:
                                break
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError as e:
            msg = (
                f"Ollama server is unavailable at {self._base_url}. "
                f"Ensure Ollama is running on the host ('ollama serve')."
            )
            logger.error("llm.ollama.connection_refused_stream", details=msg, provider="ollama", model=self._model_name)
            raise RuntimeError(msg) from e
        except Exception as e:
            logger.error(
                "llm.ollama.generation_stream.error",
                error_type=type(e).__name__,
                details=str(e),
                provider="ollama",
                model=self._model_name,
            )
            raise e
