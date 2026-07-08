# 13 — Event Bus Architecture

## Flow

```
service (in tx) ──► events table + outbox rows            (atomic)
outbox dispatcher ──► routes event type → consumer queues (Celery)
consumers        ──► projections & reactions              (idempotent)
```

There is **no in-process pub/sub for side effects** — anything that must survive a crash goes through the outbox. In-process listeners are allowed only for logging/metrics.

## Routing table

Declared centrally in `infrastructure/events/routing.py` — one place to see every reaction in the system:

```python
ROUTES: dict[str, tuple[ConsumerQueue, ...]] = {
    "dataset.version_uploaded":  (EMBEDDINGS, GRAPH_SYNC, MEMORY_PROJECTION, ANALYSIS),
    "experiment.completed":      (EMBEDDINGS, GRAPH_SYNC, MEMORY_PROJECTION, METRIC_WATCH),
    "metric.changed":            (INVESTIGATIONS, MEMORY_PROJECTION, GRAPH_SYNC),
    "upload.paper_parsed":       (EMBEDDINGS, GRAPH_SYNC, MEMORY_PROJECTION),
    "git.commit_indexed":        (EMBEDDINGS, GRAPH_SYNC),
    "ai.conversation_completed": (EMBEDDINGS, MEMORY_PROJECTION, GRAPH_SYNC),
    # … full table lives in code; every catalog event has an entry (possibly empty)
}
```

## Consumers (projections & reactions)

| Consumer | Effect |
|---|---|
| `MEMORY_PROJECTION` | derive `MemoryRecord`s from events ([17-memory.md](17-memory.md)) |
| `GRAPH_SYNC` | MERGE nodes/relationships in Neo4j ([07](07-neo4j-graph-model.md)) |
| `EMBEDDINGS` | embed new/changed content ([06](06-pgvector-schema.md)) |
| `METRIC_WATCH` | compare final metrics vs project baseline → may emit `metric.changed` |
| `INVESTIGATIONS` | start evidence collection ([28](28-investigation-engine.md)) |
| `ANALYSIS` | trigger default dataset analyzers |

Consumers receive the full envelope, are idempotent, and never emit synchronous calls back into request handling.

## Ordering & delivery guarantees

- **At-least-once** delivery; exactly-once *effects* via idempotent consumers.
- Global order exists (`events.sequence`); consumers that care (graph sync) process a project's events serially via a per-project Redis lock; others are order-independent.
- Poison events: after max retries the outbox row is marked `failed` and surfaced in `/health/ready` details and logs; `make outbox-retry` requeues.

## Emitting new events

Adding a reaction = adding a routing entry + an idempotent consumer function. No service code changes — this is the seam plugins and V2/V3 features (notifications, audit) hook into.
