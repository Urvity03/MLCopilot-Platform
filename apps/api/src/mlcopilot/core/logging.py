"""structlog configuration (docs/architecture/25-logging.md).

JSON output in containers (``LOG_FORMAT=json``), pretty console locally.
Every log line carries ``timestamp``, ``level``, ``event``, ``logger`` and —
via contextvars bound by the request-ID middleware — ``request_id``.
A scrubbing processor defensively redacts known secret keys so credentials
never reach log sinks, regardless of caller mistakes.
"""

from __future__ import annotations

import logging
import sys
from typing import TYPE_CHECKING, Any

import structlog

if TYPE_CHECKING:
    from structlog.typing import EventDict, Processor

    from mlcopilot.core.config import Settings

_SECRET_KEY_MARKERS = (
    "password",
    "secret",
    "token",
    "api_key",
    "apikey",
    "authorization",
    "jwt",
    "credential",
    "cookie",
)

_REDACTED = "[REDACTED]"


def _scrub_secrets(_: Any, __: str, event_dict: EventDict) -> EventDict:
    """Redact values whose keys look secret-bearing. Defense in depth."""
    for key in event_dict:
        lowered = key.lower()
        if any(marker in lowered for marker in _SECRET_KEY_MARKERS):
            event_dict[key] = _REDACTED
    return event_dict


def configure_logging(settings: Settings) -> None:
    """Configure structlog and the stdlib root logger. Idempotent."""
    level = getattr(logging, settings.log_level)

    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        _scrub_secrets,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    renderer: Processor
    if settings.log_format == "json":
        shared_processors.append(structlog.processors.format_exc_info)
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=sys.stderr.isatty())

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        foreign_pre_chain=shared_processors,
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)

    # Route uvicorn's loggers through the structlog pipeline; access logs are
    # replaced by the request-logging middleware to avoid double logging.
    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers.clear()
        logging.getLogger(name).propagate = True
    logging.getLogger("uvicorn.access").handlers.clear()
    logging.getLogger("uvicorn.access").propagate = False


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Named structlog logger; the sole logging entry point for app code."""
    return structlog.get_logger(name)  # type: ignore[no-any-return]
