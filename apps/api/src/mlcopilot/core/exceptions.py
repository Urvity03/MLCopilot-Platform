"""Domain error → HTTP mapping and the API error envelope.

Every non-2xx response uses the envelope defined in
docs/architecture/11-api-contracts.md:

    {"error": {"code": ..., "message": ..., "details": [...], "request_id": ...}}

Errors are logged exactly once, here at the boundary that handles them.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from fastapi import status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from mlcopilot.core.logging import get_logger
from mlcopilot.domain.errors import (
    AuthenticationError,
    ConflictError,
    DomainError,
    IllegalStateTransitionError,
    NotFoundError,
    UnprocessableError,
)

if TYPE_CHECKING:
    from fastapi import FastAPI, Request

logger = get_logger("mlcopilot.errors")

_DOMAIN_STATUS_MAP: tuple[tuple[type[DomainError], int], ...] = (
    (NotFoundError, status.HTTP_404_NOT_FOUND),
    (AuthenticationError, status.HTTP_401_UNAUTHORIZED),
    (IllegalStateTransitionError, status.HTTP_409_CONFLICT),
    (ConflictError, status.HTTP_409_CONFLICT),
    (UnprocessableError, status.HTTP_422_UNPROCESSABLE_CONTENT),
)

_HTTP_STATUS_CODE_MAP: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: "validation_error",
    status.HTTP_401_UNAUTHORIZED: "unauthenticated",
    status.HTTP_403_FORBIDDEN: "permission_denied",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
    status.HTTP_409_CONFLICT: "conflict",
    status.HTTP_422_UNPROCESSABLE_CONTENT: "unprocessable",
    status.HTTP_429_TOO_MANY_REQUESTS: "rate_limited",
    status.HTTP_501_NOT_IMPLEMENTED: "capability_not_enabled",
}


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    request_id: str | None,
    details: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    """Build a response conforming to the API error envelope."""
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details or [],
                "request_id": request_id,
            }
        },
        headers=headers,
    )


async def _handle_domain_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, DomainError)
    status_code = status.HTTP_400_BAD_REQUEST
    for error_type, mapped_status in _DOMAIN_STATUS_MAP:
        if isinstance(exc, error_type):
            status_code = mapped_status
            break
    logger.info("domain_error", code=exc.code, status=status_code, path=request.url.path)
    return error_response(
        status_code=status_code,
        code=exc.code,
        message=exc.message,
        request_id=_request_id(request),
    )


async def _handle_validation_error(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    details = [
        {
            "field": ".".join(str(part) for part in error.get("loc", ())),
            "issue": str(error.get("msg", "invalid")),
        }
        for error in exc.errors()
    ]
    return error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="validation_error",
        message="Request validation failed.",
        request_id=_request_id(request),
        details=details,
    )


async def _handle_http_exception(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code = _HTTP_STATUS_CODE_MAP.get(exc.status_code, "error")
    headers = dict(exc.headers) if exc.headers else None
    return error_response(
        status_code=exc.status_code,
        code=code,
        message=str(exc.detail),
        request_id=_request_id(request),
        headers=headers,
    )


async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "unhandled_exception",
        path=request.url.path,
        exc_info=exc,
    )
    return error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="internal_error",
        message="An unexpected error occurred.",
        request_id=_request_id(request),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach all boundary error handlers to the application."""
    app.add_exception_handler(DomainError, _handle_domain_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(Exception, _handle_unexpected_error)
