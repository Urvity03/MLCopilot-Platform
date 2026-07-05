"""Export the OpenAPI document to ``apps/api/openapi.json``.

Used by ``make contracts`` — the JSON feeds ``openapi-typescript`` in
``packages/contracts``. Deterministic output (sorted keys) so the file only
changes when the API surface actually changes.

Usage: ``python -m mlcopilot.tools.export_openapi [output_path]``
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from mlcopilot.core.config import Settings
from mlcopilot.core.logging import get_logger
from mlcopilot.main import create_app

logger = get_logger("mlcopilot.tools.export_openapi")

_DEFAULT_OUTPUT = Path(__file__).resolve().parents[3] / "openapi.json"


def export_openapi(output_path: Path) -> None:
    """Build the app without running the lifespan and write its schema."""
    app = create_app(Settings(environment="test", log_format="console"))
    schema = app.openapi()
    output_path.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n")
    logger.info(
        "openapi.exported",
        path=str(output_path),
        paths=len(schema.get("paths", {})),
    )


def main() -> None:
    output_path = Path(sys.argv[1]) if len(sys.argv) > 1 else _DEFAULT_OUTPUT
    export_openapi(output_path)


if __name__ == "__main__":
    main()
