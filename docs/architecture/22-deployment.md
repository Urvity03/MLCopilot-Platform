# 22 — Deployment Architecture

## Reference topology

| Component | Platform | Notes |
|---|---|---|
| `web` | **Vercel** | Next.js native; `NEXT_PUBLIC_API_URL` points at the API |
| `api`, `worker`, `beat` | **Railway** | three services from the same image, different commands |
| PostgreSQL + pgvector | Railway Postgres (pgvector enabled) | `DATABASE_URL` |
| Redis | Railway Redis | `REDIS_URL` |
| Neo4j | Neo4j Aura Free/Pro or Railway template | `NEO4J_URI`, `NEO4J_AUTH` |
| Object storage | Railway MinIO template or any S3-compatible (R2/S3) | `S3_*` vars — the storage client is S3-generic |

Self-hosting alternative: `docker-compose.prod.yml` runs the entire stack on one host.

## Release flow

1. Merge to `main` → CI green ([23-cicd.md](23-cicd.md)).
2. Vercel auto-deploys `apps/web` (preview deployments per PR).
3. Railway builds the API image from `apps/api/Dockerfile`; migration runs in the entrypoint under a Postgres advisory lock (safe with multiple replicas).
4. Rollback = redeploy previous image; migrations are backward-compatible for one release (expand → migrate → contract discipline).

## Configuration

All configuration via environment variables validated at boot (`core/config.py`). `.env.example` documents every variable with commentary. Secrets (LLM keys, `SECRET_KEY`, DB URLs) live only in platform secret stores.

## Scaling path

- API: horizontal replicas (stateless; SSE sessions are single-request).
- Workers: split queues across dedicated services (`-Q investigations`, `-Q embeddings`) without code changes.
- Postgres: read replicas for search/timeline reads when needed; the repository layer already isolates read paths.
- Neo4j: single instance suffices (projection, rebuildable); Aura scales vertically.
