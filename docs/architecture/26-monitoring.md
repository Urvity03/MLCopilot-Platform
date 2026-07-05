# 26 — Monitoring Strategy

## Health endpoints

| Endpoint | Semantics |
|---|---|
| `GET /health/live` | process is up; no dependency checks (restart signal) |
| `GET /health/ready` | dependency checks with per-dependency status: postgres, redis, neo4j, minio, outbox backlog (< threshold), MCP servers (degraded-tolerant) |

`ready` returns 200 with `{"status": "ok" | "degraded", "checks": {...}}`; only hard dependencies (postgres, redis) failing yield 503. Neo4j/MinIO/MCP failures mark `degraded` — the API still serves core reads.

## Metrics (Prometheus, `/metrics`, env-gated)

- HTTP: request count/duration histograms by route + status.
- Jobs: task duration, retries, failures by queue; outbox backlog gauge; dispatch latency.
- AI: LLM call duration, token usage, failover count by provider/model; embedding batch sizes.
- Domain: experiments started/completed, investigations completed, memory records created (product health, not just system health).

`prometheus-fastapi-instrumentator` for HTTP; custom collectors for the rest.

## Error tracking

Sentry SDK initialized only when `SENTRY_DSN` is set (API + workers), release-tagged, request-id linked, PII scrubbed. No hard dependency — the platform is fully functional without it.

## Alerting guidance (deployment-level, documented not enforced)

Page on: readiness failing > 2 min, outbox backlog > 1000 for > 5 min, task failure rate > 5%, LLM failover sustained > 10 min.
