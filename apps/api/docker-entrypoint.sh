#!/bin/sh
# Entrypoint shared by api, worker, and beat containers.
# Applies migrations (serialized by a PostgreSQL advisory lock) and then
# execs the container command (docs/architecture/21-docker.md).
set -eu

echo "entrypoint: applying database migrations"
python -m mlcopilot.tools.migrate

echo "entrypoint: starting: $*"
exec "$@"
