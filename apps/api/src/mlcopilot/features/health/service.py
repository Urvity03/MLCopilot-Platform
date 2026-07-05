"""Readiness probes for hard dependencies (PostgreSQL, Redis).

Soft dependencies (Neo4j, MinIO, MCP servers) join these checks as
``degraded``-tolerant probes when their clients are wired in
(docs/architecture/26-monitoring.md).
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING, Protocol

from sqlalchemy import text

if TYPE_CHECKING:
    from redis.asyncio import Redis
    from sqlalchemy.ext.asyncio import AsyncEngine


@dataclass(frozen=True, slots=True)
class CheckResult:
    """Outcome of one dependency probe."""

    name: str
    ok: bool
    latency_ms: float
    error: str | None = None


class DependencyProbe(Protocol):
    """A named, awaitable dependency check."""

    @property
    def name(self) -> str: ...

    async def __call__(self) -> None: ...


@dataclass(frozen=True, slots=True)
class PostgresProbe:
    """Round-trips ``SELECT 1`` through the connection pool."""

    engine: AsyncEngine
    name: str = "postgres"

    async def __call__(self) -> None:
        async with self.engine.connect() as connection:
            await connection.execute(text("SELECT 1"))


@dataclass(frozen=True, slots=True)
class RedisProbe:
    """Round-trips ``PING``."""

    client: Redis
    name: str = "redis"

    async def __call__(self) -> None:
        await self.client.ping()


async def run_probe(probe: DependencyProbe, timeout_seconds: float) -> CheckResult:
    """Execute one probe with a hard timeout, capturing latency and failure."""
    started_at = time.perf_counter()
    try:
        await asyncio.wait_for(probe(), timeout=timeout_seconds)
    except TimeoutError:
        latency_ms = round((time.perf_counter() - started_at) * 1000, 2)
        return CheckResult(
            name=probe.name,
            ok=False,
            latency_ms=latency_ms,
            error=f"timed out after {timeout_seconds}s",
        )
    except Exception as exc:  # noqa: BLE001 — a probe failure must never crash readiness
        latency_ms = round((time.perf_counter() - started_at) * 1000, 2)
        return CheckResult(
            name=probe.name,
            ok=False,
            latency_ms=latency_ms,
            error=f"{type(exc).__name__}: {exc}",
        )
    latency_ms = round((time.perf_counter() - started_at) * 1000, 2)
    return CheckResult(name=probe.name, ok=True, latency_ms=latency_ms)


async def run_readiness_checks(
    probes: list[DependencyProbe],
    timeout_seconds: float,
) -> list[CheckResult]:
    """Run all probes concurrently."""
    return list(await asyncio.gather(*(run_probe(probe, timeout_seconds) for probe in probes)))
