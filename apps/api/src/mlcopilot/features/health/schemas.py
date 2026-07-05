"""HTTP shapes for the health endpoints (docs/architecture/26-monitoring.md)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class LivenessResponse(BaseModel):
    """Process-is-up signal; performs no dependency checks."""

    status: Literal["ok"]
    version: str


class DependencyCheck(BaseModel):
    """Outcome of a single dependency probe."""

    status: Literal["ok", "error"]
    latency_ms: float
    error: str | None = None


class ReadinessResponse(BaseModel):
    """Aggregate readiness with per-dependency status.

    ``ok`` — all checked dependencies healthy.
    ``degraded`` — reserved for soft dependencies (neo4j, minio, MCP) once
    their clients are wired in; hard dependency failure yields HTTP 503.
    """

    status: Literal["ok", "degraded", "unavailable"]
    version: str
    checks: dict[str, DependencyCheck]
