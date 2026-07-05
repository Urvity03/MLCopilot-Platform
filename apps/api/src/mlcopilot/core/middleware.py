"""Pure-ASGI middleware: request ID, request logging, security headers.

Written as raw ASGI (not ``BaseHTTPMiddleware``) so streaming responses —
required later for chat SSE — are never buffered.
"""

from __future__ import annotations

import time
import uuid
from typing import TYPE_CHECKING

import structlog

from mlcopilot.core.logging import get_logger

if TYPE_CHECKING:
    from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID_HEADER = b"x-request-id"
_MAX_REQUEST_ID_LENGTH = 128

logger = get_logger("mlcopilot.http")


def _new_request_id() -> str:
    return f"req_{uuid.uuid4().hex}"


def _incoming_request_id(scope: Scope) -> str | None:
    for name, value in scope.get("headers", []):
        if name == REQUEST_ID_HEADER:
            candidate = value.decode("latin-1").strip()
            if 0 < len(candidate) <= _MAX_REQUEST_ID_LENGTH:
                return candidate
    return None


class RequestIDMiddleware:
    """Honors ``X-Request-ID`` when supplied, otherwise generates one.

    The ID is bound into structlog contextvars (so every log line in the
    request carries it), stored in ``scope["state"]`` (so the error envelope
    can echo it), and returned in the response headers.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = _incoming_request_id(scope) or _new_request_id()
        scope.setdefault("state", {})
        scope["state"]["request_id"] = request_id

        structlog.contextvars.bind_contextvars(request_id=request_id)
        try:

            async def send_with_request_id(message: Message) -> None:
                if message["type"] == "http.response.start":
                    headers = list(message.get("headers", []))
                    headers.append((REQUEST_ID_HEADER, request_id.encode("latin-1")))
                    message["headers"] = headers
                await send(message)

            await self.app(scope, receive, send_with_request_id)
        finally:
            structlog.contextvars.unbind_contextvars("request_id")


class RequestLoggingMiddleware:
    """Logs request start/end with method, path, status, and duration_ms."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method: str = scope["method"]
        path: str = scope["path"]
        started_at = time.perf_counter()
        status_code = 500

        logger.debug("request.started", method=method, path=path)

        async def send_capturing_status(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_capturing_status)
        finally:
            duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
            logger.info(
                "request.completed",
                method=method,
                path=path,
                status=status_code,
                duration_ms=duration_ms,
            )


class SecurityHeadersMiddleware:
    """Response hardening headers (docs/architecture/24-security.md)."""

    _HEADERS: tuple[tuple[bytes, bytes], ...] = (
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
    )

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(self._HEADERS)
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_headers)
