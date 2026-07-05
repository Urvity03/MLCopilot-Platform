"""Contract-level guards on the generated OpenAPI schema.

Regression: a ``Request`` annotation that FastAPI cannot resolve at runtime
(e.g. imported only under ``TYPE_CHECKING``) silently degrades into a
required *query parameter*. These tests fail loudly if that ever happens
to any route.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from fastapi import FastAPI


def test_no_route_requires_a_request_query_parameter(app: FastAPI) -> None:
    """No endpoint may expose framework internals as query parameters."""
    schema = app.openapi()
    offenders: list[str] = []
    for path, methods in schema.get("paths", {}).items():
        for method, operation in methods.items():
            for parameter in operation.get("parameters", []):
                if parameter.get("name") in {"request", "response"}:
                    offenders.append(f"{method.upper()} {path}")
    assert offenders == [], f"framework objects leaked into query params: {offenders}"


def test_health_endpoints_have_no_required_parameters(app: FastAPI) -> None:
    """Probes are called by orchestrators with bare GETs — no params allowed."""
    schema = app.openapi()
    for path in ("/api/v1/health/live", "/api/v1/health/ready"):
        operation = schema["paths"][path]["get"]
        required = [p["name"] for p in operation.get("parameters", []) if p.get("required")]
        assert required == [], f"{path} unexpectedly requires parameters: {required}"


def test_openapi_document_is_served_under_api_prefix(app: FastAPI) -> None:
    """Contracts generation (make contracts) reads /api/v1/openapi.json."""
    assert app.openapi_url == "/api/v1/openapi.json"
