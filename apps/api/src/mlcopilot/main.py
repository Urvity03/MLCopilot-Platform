"""Application factory: lifespan, middleware, error handlers, routers.

Run with: ``uvicorn mlcopilot.main:app`` (docker-compose does exactly this).
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mlcopilot import __version__
from mlcopilot.core.config import Settings, get_settings
from mlcopilot.core.exceptions import register_exception_handlers
from mlcopilot.core.logging import configure_logging, get_logger
from mlcopilot.core.middleware import (
    RequestIDMiddleware,
    RequestLoggingMiddleware,
    SecurityHeadersMiddleware,
)
from mlcopilot.features.auth import api_keys_router
from mlcopilot.features.auth.router import router as auth_router
from mlcopilot.features.health.router import router as health_router
from mlcopilot.features.projects import projects_router
from mlcopilot.infrastructure.cache import create_redis_client
from mlcopilot.infrastructure.db import create_engine, create_session_factory

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

logger = get_logger("mlcopilot.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Create process-wide clients on startup; release them on shutdown."""
    settings: Settings = app.state.settings

    engine = create_engine(settings)
    app.state.db_engine = engine
    app.state.db_session_factory = create_session_factory(engine)
    app.state.redis = create_redis_client(settings)

    logger.info(
        "startup.complete",
        environment=settings.environment,
        version=__version__,
    )
    try:
        yield
    finally:
        await app.state.redis.aclose()
        await engine.dispose()
        logger.info("shutdown.complete")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build a fully configured application instance."""
    settings = settings or get_settings()
    configure_logging(settings)

    app = FastAPI(
        title="MLCopilot API",
        version=__version__,
        lifespan=lifespan,
        openapi_url=f"{settings.api_v1_prefix}/openapi.json",
        docs_url=f"{settings.api_v1_prefix}/docs" if not settings.is_production else None,
        redoc_url=None,
    )
    app.state.settings = settings

    # Middleware runs in reverse registration order: the request ID must be
    # bound before request logging so every line carries it.
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    register_exception_handlers(app)

    app.include_router(health_router, prefix=settings.api_v1_prefix)
    app.include_router(auth_router, prefix=settings.api_v1_prefix)
    app.include_router(api_keys_router, prefix=settings.api_v1_prefix)
    app.include_router(projects_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
