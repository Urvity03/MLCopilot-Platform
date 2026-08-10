import sys
from pathlib import Path

# Add apps/api/src to Python path so `mlcopilot` package imports work on Vercel
api_src = Path(__file__).resolve().parent.parent / "apps" / "api" / "src"
if str(api_src) not in sys.path:
    sys.path.insert(0, str(api_src))

from mlcopilot.main import app  # noqa: E402
from mlcopilot.infrastructure.db import create_engine, create_session_factory  # noqa: E402
from mlcopilot.infrastructure.cache import create_redis_client  # noqa: E402


def ensure_serverless_state():
    """Ensure app.state has db_engine, db_session_factory, and redis initialized in serverless runtime."""
    if not hasattr(app.state, "db_engine") or app.state.db_engine is None:
        settings = app.state.settings
        engine = create_engine(settings)
        app.state.db_engine = engine
        app.state.db_session_factory = create_session_factory(engine)
        app.state.redis = create_redis_client(settings)


class VercelPathMiddleware:
    """ASGI Middleware to normalize request paths for Vercel Python Serverless Functions."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            ensure_serverless_state()
            path = scope.get("path", "")
            if path and not path.startswith("/api/v1"):
                if path.startswith("/api"):
                    scope["path"] = path.replace("/api", "/api/v1", 1)
                else:
                    scope["path"] = f"/api/v1{path if path.startswith('/') else '/' + path}"
        await self.app(scope, receive, send)


# Export handler for Vercel Serverless Function
handler = VercelPathMiddleware(app)
