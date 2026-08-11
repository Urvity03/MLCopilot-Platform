"""Health endpoints (docs/architecture/26-monitoring.md).

``GET /health/live``  — process is up; no dependency checks (restart signal).
``GET /health/ready`` — dependency checks with per-dependency status; hard
dependency failure (postgres, redis) yields HTTP 503.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from mlcopilot import __version__
from mlcopilot.core.config import Settings, get_settings
from mlcopilot.features.health.deps import get_readiness_probes
from mlcopilot.features.health.schemas import (
    DependencyCheck,
    LivenessResponse,
    LLMInfoResponse,
    ReadinessResponse,
)
from mlcopilot.features.health.service import DependencyProbe, run_readiness_checks

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/llm", response_model=LLMInfoResponse)
async def get_llm_info(
    settings: Annotated[Settings, Depends(get_settings)],
) -> LLMInfoResponse:
    """Return active LLM provider and model configuration."""
    provider = (settings.llm_provider or "ollama").lower()
    if provider == "ollama":
        model = settings.ollama_model
        display_name = f"Ollama • {model}"
    elif provider == "gemini":
        model = settings.gemini_model
        display_name = f"Gemini • {model}"
    else:
        model = "openrouter"
        display_name = f"OpenRouter • {model}"

    return LLMInfoResponse(
        provider=provider,
        model=model,
        display_name=display_name,
    )


@router.get("/llm/check")
async def check_llm_models(
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict:
    """Diagnostic check: query Google Generative AI API model list and test candidate models."""
    import httpx

    key = settings.effective_gemini_api_key.get_secret_value().strip()
    if not key:
        return {"error": "No GEMINI_API_KEY set", "has_key": False}

    has_key = bool(key)
    masked_key = f"{key[:4]}...{key[-3:]}" if len(key) > 7 else "SET"

    models_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
    models_list = []
    models_status_code = 0

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(models_url)
            models_status_code = resp.status_code
            if resp.status_code == 200:
                data = resp.json()
                for m in data.get("models", []):
                    name = m.get("name", "").removeprefix("models/")
                    methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in methods:
                        models_list.append(name)
    except Exception as exc:  # noqa: BLE001
        models_list = [f"Error listing models: {exc}"]

    # Test candidates for generateContent
    candidates_to_test = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    ]
    test_results = {}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            for cand in candidates_to_test:
                test_url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand}:generateContent?key={key}"
                body = {
                    "contents": [{"role": "user", "parts": [{"text": "Hello"}]}]
                }
                t_resp = await client.post(test_url, json=body, headers={"Content-Type": "application/json"})
                test_results[cand] = {
                    "status_code": t_resp.status_code,
                    "ok": t_resp.status_code == 200,
                    "sample_text": t_resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")[:50] if t_resp.status_code == 200 else t_resp.text[:100],
                }
    except Exception as exc:  # noqa: BLE001
        test_results["error"] = str(exc)

    return {
        "has_key": has_key,
        "masked_key": masked_key,
        "configured_model": settings.gemini_model,
        "models_list_status": models_status_code,
        "available_generate_content_models": models_list,
        "candidate_tests": test_results,
    }


@router.get("/live", response_model=LivenessResponse)
async def live() -> LivenessResponse:
    """Liveness: the process is running and can serve responses."""
    return LivenessResponse(status="ok", version=__version__)


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    responses={status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ReadinessResponse}},
)
async def ready(
    response: Response,
    probes: Annotated[list[DependencyProbe], Depends(get_readiness_probes)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ReadinessResponse:
    """Readiness: every hard dependency answers within the check timeout."""
    results = await run_readiness_checks(probes, settings.health_check_timeout_seconds)
    checks = {
        result.name: DependencyCheck(
            status="ok" if result.ok else "error",
            latency_ms=result.latency_ms,
            error=result.error,
        )
        for result in results
    }
    all_ok = all(result.ok for result in results)
    if not all_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ReadinessResponse(
        status="ok" if all_ok else "unavailable",
        version=__version__,
        checks=checks,
    )
