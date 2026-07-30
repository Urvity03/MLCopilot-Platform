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
        self._resolved_model: str | None = "qwen2.5:3b"

        # Persistent HTTP client connection pool for zero socket creation overhead & HTTP keep-alive
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(self._timeout_seconds, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
        )

        logger.info(
            "llm.ollama.client_configured",
            base_url=self._base_url,
            model=self._model_name,
        )

    async def _resolve_active_model(self) -> str:
        """Resolve available model preference: qwen2.5:3b -> llama3.2:3b -> configured default."""
        if self._resolved_model:
            return self._resolved_model

        try:
            available = await self.list_models()
            candidates = ["qwen2.5:3b", "qwen2.5-coder:3b", "llama3.2:3b", "llama3.2", self._model_name, "llama3.1:8b"]
            for cand in candidates:
                if any(m == cand or m.startswith(f"{cand}:") for m in available):
                    self._resolved_model = cand
                    logger.info("llm.ollama.model_resolved", selected=cand, available=available)
                    return cand
        except Exception:
            pass

        self._resolved_model = self._model_name
        return self._model_name

    async def _build_payload(
        self, system_prompt: str, user_prompt: str, stream: bool = False
    ) -> dict[str, Any]:
        """Construct standard Ollama REST API JSON payload with model keep-alive."""
        model = await self._resolve_active_model()
        payload: dict[str, Any] = {
            "model": model,
            "prompt": user_prompt,
            "stream": stream,
            "keep_alive": "15m",  # Keep model in RAM/VRAM memory between requests
            "options": {
                "temperature": 0.0,
                "num_ctx": 4096,
            },
        }
        if system_prompt and system_prompt.strip():
            payload["system"] = system_prompt.strip()
        return payload

    async def health_check(self) -> bool:
        """Check if the Ollama server is reachable and responding."""
        url = f"{self._base_url}/api/tags"
        try:
            response = await self._client.get(url, timeout=5.0)
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
            response = await self._client.get(url, timeout=10.0)
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
        payload = await self._build_payload(system_prompt, user_prompt, stream=False)
        start_time = time.perf_counter()

        logger.info(
            "llm.ollama.http_request",
            method="POST",
            url=url,
            provider="ollama",
            model=payload["model"],
        )

        try:
            response = await self._client.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )

            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.info(
                "llm.ollama.http_response",
                status_code=response.status_code,
                provider="ollama",
                model=payload["model"],
                latency_ms=latency_ms,
            )

            if response.status_code == 404:
                raise ValueError(
                    f"Ollama model '{payload['model']}' not found at {self._base_url}. "
                    f"Run 'ollama pull {payload['model']}' on the host."
                )

            if response.is_error:
                error_text = response.text
                logger.error(
                    "llm.ollama.generation.http_error",
                    status_code=response.status_code,
                    response_body=error_text[:500],
                    provider="ollama",
                    model=payload["model"],
                )
                response.raise_for_status()

            data = response.json()
            return data.get("response", "")
        except httpx.ConnectError as e:
            msg = (
                f"Ollama server is unavailable at {self._base_url}. "
                f"Ensure Ollama is running on the host ('ollama serve')."
            )
            logger.error("llm.ollama.connection_refused", details=msg, provider="ollama", model=payload["model"])
            raise RuntimeError(msg) from e
        except Exception as e:
            logger.error(
                "llm.ollama.generation.error",
                error_type=type(e).__name__,
                details=str(e),
                provider="ollama",
                model=payload["model"],
            )
            raise e

    async def generate_stream(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        """Execute a streaming text generation call returning token chunks via Ollama POST /api/generate stream API."""
        url = f"{self._base_url}/api/generate"
        payload = await self._build_payload(system_prompt, user_prompt, stream=True)
        start_time = time.perf_counter()

        logger.info(
            "llm.ollama.http_request_stream",
            method="POST",
            url=url,
            provider="ollama",
            model=payload["model"],
        )

        try:
            async with self._client.stream(
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
                    model=payload["model"],
                    latency_ms=latency_ms,
                )

                if response.status_code == 404:
                    await response.aread()
                    raise ValueError(
                        f"Ollama model '{payload['model']}' not found at {self._base_url}. "
                        f"Run 'ollama pull {payload['model']}' on the host."
                    )

                if response.is_error:
                    await response.aread()
                    error_text = response.text
                    logger.error(
                        "llm.ollama.generation_stream.http_error",
                        status_code=response.status_code,
                        response_body=error_text[:500],
                        provider="ollama",
                        model=payload["model"],
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
            logger.error("llm.ollama.connection_refused_stream", details=msg, provider="ollama", model=payload["model"])
            raise RuntimeError(msg) from e
        except Exception as e:
            logger.error(
                "llm.ollama.generation_stream.error",
                error_type=type(e).__name__,
                details=str(e),
                provider="ollama",
                model=payload["model"],
            )
            raise e
