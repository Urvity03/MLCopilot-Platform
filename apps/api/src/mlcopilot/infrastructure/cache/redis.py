"""Async Redis client construction.

One client per process, created in the application lifespan and shared via
``app.state``. redis-py maintains its own connection pool internally.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from redis.asyncio import Redis

if TYPE_CHECKING:
    from mlcopilot.core.config import Settings


def create_redis_client(settings: Settings) -> Redis:
    """Build the process-wide async Redis client from ``REDIS_URL``."""
    return Redis.from_url(  # type: ignore[no-untyped-call]
        settings.redis_url,
        decode_responses=True,
        socket_timeout=settings.redis_socket_timeout_seconds,
        socket_connect_timeout=settings.redis_socket_timeout_seconds,
        health_check_interval=30,
    )
