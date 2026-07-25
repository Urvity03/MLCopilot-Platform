"""Google Gemini implementation of the BaseLLMProvider protocol using direct REST API calls."""

from __future__ import annotations

import json
import os
from typing import TYPE_CHECKING, Any

import httpx

from mlcopilot.core.logging import get_logger
from mlcopilot.infrastructure.llm.base import BaseLLMProvider

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

logger = get_logger("mlcopilot.infrastructure.llm.gemini")


class GeminiProvider(BaseLLMProvider):
    """Concrete implementation of BaseLLMProvider using direct async REST HTTP calls to Google Gemini API."""

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str = "gemini-3.6-flash",
        base_url: str = "https://generativelanguage.googleapis.com",
        timeout_seconds: float = 60.0,
    ) -> None:
        clean_key = (
            api_key.strip()
            if api_key and api_key.strip()
            else (
                os.environ.get("GEMINI_API_KEY", "").strip()
                or os.environ.get("GOOGLE_API_KEY", "").strip()
            )
        )
        self._api_key = clean_key
        self._model_name = model_name
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

        masked_key = (
            f"{clean_key[:6]}...{clean_key[-3:]}"
            if clean_key and len(clean_key) > 8
            else "None"
        )
        logger.info(
            "llm.gemini.client_configured",
            base_url=self._base_url,
            model=self._model_name,
            masked_api_key=masked_key,
            has_api_key=bool(clean_key),
        )

    def _build_payload(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """Construct standard Gemini API JSON payload with system instruction."""
        payload: dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": user_prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
            },
        }
        if system_prompt and system_prompt.strip():
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt.strip()}]
            }
        return payload

    def _get_effective_key(self) -> str:
        """Resolve non-empty API key from instance or environment."""
        key = (
            self._api_key
            or os.environ.get("GEMINI_API_KEY", "").strip()
            or os.environ.get("GOOGLE_API_KEY", "").strip()
        )
        if not key:
            raise ValueError(
                "GEMINI_API_KEY is unconfigured or empty. Please set GEMINI_API_KEY in your environment or .env file."
            )
        return key

    async def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Execute a blocking text generation call via Gemini REST generateContent API."""
        api_key = self._get_effective_key()
        url = f"{self._base_url}/v1beta/models/{self._model_name}:generateContent"
        params = {"key": api_key}

        payload = self._build_payload(system_prompt, user_prompt)
        safe_url = f"{self._base_url}/v1beta/models/{self._model_name}:generateContent?key=[MASKED]"

        logger.info(
            "llm.gemini.http_request",
            method="POST",
            url=safe_url,
            payload=payload,
        )

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(
                    url,
                    params=params,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

                logger.info(
                    "llm.gemini.http_response",
                    status_code=response.status_code,
                    response_body=response.text[:1000],
                )

                if response.is_error:
                    error_text = response.text
                    logger.error(
                        "llm.gemini.generation.http_error",
                        status_code=response.status_code,
                        response_body=error_text[:500],
                        model=self._model_name,
                    )
                    response.raise_for_status()
                data = response.json()

                candidates = data.get("candidates", [])
                if not candidates:
                    return ""
                parts = candidates[0].get("content", {}).get("parts", [])
                return "".join(p.get("text", "") for p in parts if "text" in p)
        except Exception as e:
            logger.error(
                "llm.gemini.generation.error",
                error_type=type(e).__name__,
                details=str(e),
                model=self._model_name,
            )
            raise e

    async def generate_stream(
        self, system_prompt: str, user_prompt: str
    ) -> AsyncIterator[str]:
        """Execute a streaming text generation call returning token chunks via Gemini REST SSE API."""
        api_key = self._get_effective_key()
        url = f"{self._base_url}/v1beta/models/{self._model_name}:streamGenerateContent"
        params = {"alt": "sse", "key": api_key}

        payload = self._build_payload(system_prompt, user_prompt)

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                async with client.stream(
                    "POST",
                    url,
                    params=params,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                ) as response:
                    if response.is_error:
                        await response.aread()
                        error_text = response.text
                        logger.error(
                            "llm.gemini.generation_stream.http_error",
                            status_code=response.status_code,
                            response_body=error_text[:500],
                            model=self._model_name,
                        )
                        response.raise_for_status()

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue

                        from datetime import datetime, timezone
                        now_iso = datetime.now(timezone.utc).isoformat()
                        logger.info("[TRACE-5-RAW-GOOGLE-SSE-LINE]", timestamp=now_iso, raw_line=line)

                        if not line.startswith("data:"):
                            continue

                        raw_json = line[len("data:") :].strip()
                        if not raw_json or raw_json == "[DONE]":
                            continue

                        try:
                            data = json.loads(raw_json)
                            candidates = data.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                chunk_text = "".join(
                                    p.get("text", "") for p in parts if "text" in p
                                )
                                if chunk_text:
                                    logger.info("[TRACE-4-GEMINI-PROVIDER-YIELD]", timestamp=now_iso, chunk_text=chunk_text)
                                    yield chunk_text
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(
                "llm.gemini.generation_stream.error",
                error_type=type(e).__name__,
                details=str(e),
                model=self._model_name,
            )
            raise e
