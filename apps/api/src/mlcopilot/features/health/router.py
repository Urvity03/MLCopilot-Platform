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
    ReadinessResponse,
)
from mlcopilot.features.health.service import DependencyProbe, run_readiness_checks

router = APIRouter(prefix="/health", tags=["health"])


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
