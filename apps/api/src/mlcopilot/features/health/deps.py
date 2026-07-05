"""Dependency wiring for the health feature.

Probes are resolved through FastAPI dependencies so tests can override them
with fakes (docs/architecture/02-clean-architecture.md).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from mlcopilot.features.health.service import DependencyProbe, PostgresProbe, RedisProbe

if TYPE_CHECKING:
    from fastapi import Request

    from mlcopilot.core.config import Settings


def get_app_settings(request: Request) -> Settings:
    """The settings instance the application was constructed with."""
    settings: Settings = request.app.state.settings
    return settings


def get_readiness_probes(request: Request) -> list[DependencyProbe]:
    """Hard-dependency probes built from process-wide clients on app state."""
    return [
        PostgresProbe(engine=request.app.state.db_engine),
        RedisProbe(client=request.app.state.redis),
    ]
