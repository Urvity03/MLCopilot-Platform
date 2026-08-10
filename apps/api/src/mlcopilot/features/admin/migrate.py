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
import shlex
import sys

from fastapi import APIRouter, Header, HTTPException, status

router = APIRouter(prefix="/_admin", tags=["_admin"])


@router.post("/migrate")
async def run_migrations(x_migration_token: str = Header(...)) -> dict:
    """Run ``alembic upgrade head`` and return the output.

    Protected by the MIGRATION_TOKEN environment variable.  This endpoint
    only exists while that variable is set in Vercel.
    """
    import os

    expected = os.environ.get("MIGRATION_TOKEN", "")
    if not expected or x_migration_token != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid migration token")

    try:
        # Run alembic from the api directory where alembic.ini lives.
        # sys.executable ensures we use the same Python as the FastAPI app.
        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            "-m",
            "alembic",
            "upgrade",
            "head",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd="/var/task/apps/api",  # directory containing alembic.ini
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        output = stdout.decode("utf-8", errors="replace")
        return {
            "exit_code": proc.returncode,
            "success": proc.returncode == 0,
            "output": output,
        }
    except asyncio.TimeoutError:
        return {"exit_code": -1, "success": False, "output": "Migration timed out after 120 seconds"}
    except Exception as exc:  # noqa: BLE001
        return {"exit_code": -1, "success": False, "output": str(exc)}
