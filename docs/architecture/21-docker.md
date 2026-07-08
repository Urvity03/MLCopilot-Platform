# 21 — Docker Architecture

## Compose topology (development)

```yaml
services:
  web:       # next dev, port 3000, volume-mounted for HMR
  api:       # uvicorn --reload, port 8000; entrypoint: migrate (advisory-locked) → serve
  worker:    # celery -A mlcopilot.workers worker (all queues)
  beat:      # celery beat
  postgres:  # pgvector/pgvector:pg16; healthcheck pg_isready
  neo4j:     # neo4j:5-community; healthcheck cypher RETURN 1
  redis:     # redis:7-alpine; healthcheck redis-cli ping
  minio:     # minio/minio + bucket bootstrap job; healthcheck /minio/health/live
```

- `depends_on: condition: service_healthy` gives deterministic startup ordering: databases → api → worker/beat → web.
- Named volumes: `pg_data`, `neo4j_data`, `minio_data`.
- One shared `.env`; compose interpolates. `make dev` = `docker compose up --build`.

## Images

**API/worker/beat** share one multi-stage Dockerfile:

```
FROM python:3.12-slim AS builder    # uv, build deps, wheels
FROM python:3.12-slim AS runtime    # non-root user, wheels only, no compilers
```

- Non-root `app` user, read-only filesystem except `/tmp`, healthcheck hits `/health/live` (API) / `celery inspect ping` (worker).
- **Web**: `node:22-alpine` build → Next.js standalone output runtime image.

## Dev vs prod differences

| Concern | Dev | Prod |
|---|---|---|
| API server | uvicorn `--reload`, code volume-mounted | uvicorn multi-worker, baked image |
| Web | `next dev` | standalone `next start` (or Vercel) |
| Secrets | `.env` file | injected by platform (Railway/Vercel) |
| Neo4j/MinIO | containers | managed instances or persistent volumes |

`docker-compose.prod.yml` overlay adjusts commands, removes volume mounts, and pins resource limits.
