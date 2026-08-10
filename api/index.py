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
    """Ensure app.state attributes exist safely in Vercel Serverless Function runtime."""
    if not hasattr(app.state, "db_engine") or app.state.db_engine is None:
        try:
            settings = app.state.settings
            engine = create_engine(settings)
            app.state.db_engine = engine
            app.state.db_session_factory = create_session_factory(engine)
        except Exception:
            app.state.db_engine = None
            app.state.db_session_factory = None

    if not hasattr(app.state, "redis") or app.state.redis is None:
        try:
            settings = app.state.settings
            app.state.redis = create_redis_client(settings)
        except Exception:
            app.state.redis = None


ensure_serverless_state()
