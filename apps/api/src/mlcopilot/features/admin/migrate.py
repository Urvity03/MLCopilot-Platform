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
    """Run ``alembic upgrade head`` and return the output."""
    _check_token(x_migration_token)

    # Find alembic executable — try shutil.which first, then known locations
    alembic_exe = shutil.which("alembic")
    if not alembic_exe:
        # Vercel Python lambda puts executables next to the interpreter
        python_dir = os.path.dirname(sys.executable)
        candidate = os.path.join(python_dir, "alembic")
        if os.path.isfile(candidate):
            alembic_exe = candidate

    # Fall back to running as a module from the correct interpreter
    if alembic_exe:
        cmd = [alembic_exe, "upgrade", "head"]
    else:
        cmd = [sys.executable, "-c",
               "from alembic.config import main; main(argv=['upgrade', 'head'])"]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd="/var/task/apps/api",  # directory containing alembic.ini
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        output = stdout.decode("utf-8", errors="replace")
        return {
            "exit_code": proc.returncode,
            "success": proc.returncode == 0,
            "cmd": cmd[0],
            "output": output,
        }
    except asyncio.TimeoutError:
        return {"exit_code": -1, "success": False, "output": "Migration timed out after 120s"}
    except Exception as exc:  # noqa: BLE001
        return {"exit_code": -1, "success": False, "output": str(exc)}

