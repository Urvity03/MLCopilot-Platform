"""Temporary one-shot database migration endpoint.

This module is ONLY included when the MIGRATION_TOKEN environment variable is
set.  It is never mounted in production unless that variable is explicitly
configured — so removing the variable from Vercel disables the endpoint
without a code change.

The endpoint runs ``alembic upgrade head`` inside the Vercel serverless
environment where DATABASE_URL is already configured, so the database
connection string never has to leave Vercel.

SECURITY:
- Protected by a Bearer token matched against MIGRATION_TOKEN (env var).
- Returns migration output, never environment variable values.
- Must be removed (and MIGRATION_TOKEN env var deleted) immediately after use.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import sys

from fastapi import APIRouter, Header, HTTPException, status

router = APIRouter(prefix="/_admin", tags=["_admin"])


def _check_token(x_migration_token: str) -> None:
    expected = os.environ.get("MIGRATION_TOKEN", "")
    if not expected or x_migration_token != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid migration token")


@router.get("/info")
async def migration_info(x_migration_token: str = Header(...)) -> dict:
    """Return runtime path info to help diagnose migration setup."""
    _check_token(x_migration_token)
    alembic_path = shutil.which("alembic")
    return {
        "python": sys.executable,
        "sys_path": sys.path,
        "cwd": os.getcwd(),
        "alembic_which": alembic_path,
        "api_dir_exists": os.path.isdir("/var/task/apps/api"),
        "alembic_ini_exists": os.path.isfile("/var/task/apps/api/alembic.ini"),
        "site_packages": [p for p in sys.path if "site-packages" in p],
    }


@router.post("/migrate")
async def run_migrations(x_migration_token: str = Header(...)) -> dict:
    """Run ``alembic upgrade head`` in-process and return the output.

    Runs alembic directly via its Python API so it inherits the same import
    context and sys.path as the running FastAPI app — no subprocess PATH issues.
    """
    _check_token(x_migration_token)

    import io
    import logging
    import traceback

    log_stream = io.StringIO()
    handler = logging.StreamHandler(log_stream)
    handler.setLevel(logging.DEBUG)
    alembic_logger = logging.getLogger("alembic")
    alembic_logger.addHandler(handler)
    alembic_logger.setLevel(logging.DEBUG)

    try:
        from alembic.config import Config
        from alembic import command as alembic_command

        alembic_cfg = Config("/var/task/apps/api/alembic.ini")
        # Override relative paths from alembic.ini with absolute paths so
        # Alembic works correctly regardless of the lambda's working directory.
        alembic_cfg.set_main_option("script_location", "/var/task/apps/api/alembic")
        alembic_cfg.set_main_option("prepend_sys_path", "/var/task/apps/api/src")

        # Run in a thread executor to avoid blocking the event loop
        loop = __import__("asyncio").get_event_loop()
        await loop.run_in_executor(None, alembic_command.upgrade, alembic_cfg, "head")

        return {
            "exit_code": 0,
            "success": True,
            "output": log_stream.getvalue() or "Migration completed successfully",
        }
    except Exception:  # noqa: BLE001
        return {
            "exit_code": 1,
            "success": False,
            "output": traceback.format_exc() + "\n\nAlembic log:\n" + log_stream.getvalue(),
        }
    finally:
        alembic_logger.removeHandler(handler)


