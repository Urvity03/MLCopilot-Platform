import sys
from pathlib import Path

# Add apps/api/src to Python path so `mlcopilot` package imports work on Vercel
api_src = Path(__file__).resolve().parent.parent / "apps" / "api" / "src"
if str(api_src) not in sys.path:
    sys.path.insert(0, str(api_src))

from mlcopilot.main import app  # noqa: E402
