# 12 — Background Job Architecture

## Celery topology

Broker and result backend: Redis. One worker container runs all queues by default (`-Q` splits them across containers at scale without code changes).

| Queue | Tasks | Notes |
|---|---|---|
| `outbox` | dispatch pending outbox rows to consumer queues | beat every 2 s + on-commit trigger |
| `embeddings` | embed memory records, chunks, experiments, commits | batched (≤ 64 texts/call) |
| `parsing` | notebook (`nbformat`) and paper (`pypdf`) parsing → chunks | CPU-bound; `acks_late` |
| `graph-sync` | event → Cypher projection handlers | strictly idempotent MERGE |
| `investigations` | evidence collection + Investigation Agent reasoning | longest-running; soft limit 120 s |
| `integrations` | GitHub/MLflow sync via MCP | beat-scheduled polling + manual trigger |
| `analysis` | dataset analyzer runs (profiling, quality, leakage) | plugin extension point |
| `maintenance` | embedding reconciliation, token cleanup, outbox GC | nightly beat |

## Reliability rules

1. **Idempotency**: every task takes stable natural keys (event id, artifact id) and upserts. Redelivery is harmless.
2. **Retries**: exponential backoff with jitter (`max_retries=5` default); terminal failures mark the outbox row `failed` and log with full context — never silently drop.
3. **`acks_late = True`** + `task_reject_on_worker_lost = True`: worker crashes requeue, not lose.
4. **Time limits**: soft/hard limits per queue; investigation tasks checkpoint status (`collecting` → `reasoning`) so the UI shows progress and restarts resume cleanly.
5. **No ORM objects across the boundary**: task payloads are primitive ids only; tasks reload state.
6. **Async inside sync**: each worker process owns one event loop (`asgiref.async_to_sync` wrapper) so tasks reuse the same async services as the API.

## Scheduling (Celery Beat)

| Schedule | Task |
|---|---|
| every 2 s | outbox sweep (cheap indexed query, exits fast when empty) |
| every 5 min | integration polling for links with auto-sync enabled |
| nightly | embedding reconciliation, refresh-token GC, dispatched-outbox GC (> 7 days) |
