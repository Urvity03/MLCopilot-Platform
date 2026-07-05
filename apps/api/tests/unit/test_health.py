"""Health endpoint behavior with fake dependency probes."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import TYPE_CHECKING

from mlcopilot.features.health.deps import get_readiness_probes

if TYPE_CHECKING:
    from fastapi import FastAPI
    from httpx import AsyncClient


@dataclass(frozen=True)
class HealthyProbe:
    name: str

    async def __call__(self) -> None:
        return None


@dataclass(frozen=True)
class FailingProbe:
    name: str

    async def __call__(self) -> None:
        msg = "connection refused"
        raise ConnectionError(msg)


@dataclass(frozen=True)
class HangingProbe:
    name: str

    async def __call__(self) -> None:
        await asyncio.sleep(60)


async def test_live_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health/live")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"]


async def test_ready_ok_when_all_probes_pass(app: FastAPI, client: AsyncClient) -> None:
    app.dependency_overrides[get_readiness_probes] = lambda: [
        HealthyProbe("postgres"),
        HealthyProbe("redis"),
    ]
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["postgres"]["status"] == "ok"
    assert body["checks"]["redis"]["status"] == "ok"


async def test_ready_503_when_hard_dependency_fails(app: FastAPI, client: AsyncClient) -> None:
    app.dependency_overrides[get_readiness_probes] = lambda: [
        HealthyProbe("postgres"),
        FailingProbe("redis"),
    ]
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "unavailable"
    assert body["checks"]["postgres"]["status"] == "ok"
    assert body["checks"]["redis"]["status"] == "error"
    assert "ConnectionError" in body["checks"]["redis"]["error"]


async def test_ready_times_out_hanging_probe(app: FastAPI, client: AsyncClient) -> None:
    app.dependency_overrides[get_readiness_probes] = lambda: [HangingProbe("postgres")]
    response = await client.get("/api/v1/health/ready")
    assert response.status_code == 503
    body = response.json()
    assert "timed out" in body["checks"]["postgres"]["error"]
