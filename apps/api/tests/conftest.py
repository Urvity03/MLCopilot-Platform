"""Shared test fixtures: app instance and ASGI-transport HTTP client."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest
from httpx import ASGITransport, AsyncClient

from mlcopilot.core.config import Settings
from mlcopilot.main import create_app

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from fastapi import FastAPI


@pytest.fixture
def app() -> FastAPI:
    """Application configured for tests; no external services are contacted."""
    settings = Settings(environment="test", log_format="console")
    return create_app(settings)


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    """In-process HTTP client (does not run the lifespan — tests override deps)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as http_client:
        yield http_client
