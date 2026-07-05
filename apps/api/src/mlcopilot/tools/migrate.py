"""Advisory-locked migration runner: ``python -m mlcopilot.tools.migrate``.

Used by the container entrypoint before serving (docs/architecture/21-docker.md).
A PostgreSQL advisory lock serializes concurrent ``alembic upgrade head`` runs
so multiple containers starting at once (api, worker, beat) cannot race.
Retries while the database is still starting, then fails hard.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from mlcopilot.core.config import get_settings
from mlcopilot.core.logging import configure_logging, get_logger

logger = get_logger("mlcopilot.tools.migrate")

# Stable, arbitrary key identifying "schema migration" in pg_locks.
_MIGRATION_LOCK_KEY = 730_915_001
_CONNECT_ATTEMPTS = 30
_CONNECT_RETRY_DELAY_SECONDS = 2.0


def _alembic_config() -> Config:
    api_root = Path(__file__).resolve().parents[3]
    config = Config(str(api_root / "alembic.ini"))
    config.set_main_option("script_location", str(api_root / "alembic"))
    return config


def _upgrade_to_head() -> None:
    command.upgrade(_alembic_config(), "head")


async def _run() -> None:
    settings = get_settings()
    configure_logging(settings)

    engine = create_async_engine(settings.database_url, isolation_level="AUTOCOMMIT")
    try:
        connection = None
        for attempt in range(1, _CONNECT_ATTEMPTS + 1):
            try:
                connection = await engine.connect()
                break
            except Exception as exc:
                logger.warning(
                    "migrate.database_unavailable",
                    attempt=attempt,
                    max_attempts=_CONNECT_ATTEMPTS,
                    error=f"{type(exc).__name__}: {exc}",
                )
                if attempt == _CONNECT_ATTEMPTS:
                    raise
                await asyncio.sleep(_CONNECT_RETRY_DELAY_SECONDS)
        assert connection is not None

        try:
            await connection.execute(
                text("SELECT pg_advisory_lock(:key)"), {"key": _MIGRATION_LOCK_KEY}
            )
            logger.info("migrate.lock_acquired")
            await asyncio.get_running_loop().run_in_executor(None, _upgrade_to_head)
            logger.info("migrate.upgraded_to_head")
        finally:
            await connection.execute(
                text("SELECT pg_advisory_unlock(:key)"), {"key": _MIGRATION_LOCK_KEY}
            )
            await connection.close()
    finally:
        await engine.dispose()


def main() -> None:
    try:
        asyncio.run(_run())
    except Exception:
        logger.error("migrate.failed", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
