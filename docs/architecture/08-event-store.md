# 08 — Event Store

## Model

MLCopilot uses **event sourcing for history, relational tables for current state**. Aggregates persist state normally; every significant action *also* appends an immutable event in the same transaction. Events are the authoritative history that feeds Project Memory, the knowledge graph, timelines, and the Investigation Engine — and each projection is rebuildable by replay.

## DDL

```sql
CREATE TABLE events (
    sequence       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- global order
    id             uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    type           text NOT NULL,               -- 'experiment.completed'
    version        integer NOT NULL DEFAULT 1,  -- payload schema version
    project_id     uuid,                        -- nullable: user-scope events
    actor_id       uuid,                        -- user or NULL for system
    aggregate_type text NOT NULL,
    aggregate_id   uuid NOT NULL,
    payload        jsonb NOT NULL,
    occurred_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_project_seq_idx   ON events(project_id, sequence);
CREATE INDEX events_aggregate_idx     ON events(aggregate_type, aggregate_id, sequence);
CREATE INDEX events_type_idx          ON events(type);

CREATE TABLE outbox (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_sequence  bigint NOT NULL REFERENCES events(sequence),
    status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','dispatched','failed')),
    attempts        integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    dispatched_at   timestamptz
);
CREATE INDEX outbox_pending_idx ON outbox(next_attempt_at) WHERE status = 'pending';
```

## Envelope

Every event serializes to:

```json
{
  "id": "…", "type": "experiment.completed", "version": 1,
  "occurred_at": "2026-07-05T10:00:00Z",
  "actor_id": "…", "project_id": "…",
  "aggregate_type": "experiment", "aggregate_id": "…",
  "payload": { "final_metrics": {"accuracy": 0.941}, "duration_s": 812 }
}
```

Payload schemas are Pydantic models in `domain/events/`; `version` bumps on breaking payload changes and consumers handle all live versions (upcasting on read).

## Event catalog

The catalog in [03-domain-model.md](03-domain-model.md) is exhaustive; notable semantics:

- `metric.changed` is **derived**: emitted by the experiments service when a completed experiment's headline metric deviates from the project baseline (best previous value for that metric) beyond a configurable threshold. This event triggers the Investigation Engine.
- `ai.conversation_completed` captures prompt/response summaries so conversations become memory.
- Integration events (`git.commit_indexed`, `mlflow.run_imported`) are emitted by sync workers, `actor_id = NULL`.

## Write path

`UnitOfWork.record(events)` inside the service transaction:
1. INSERT into `events` (append-only; no UPDATE/DELETE grants on this table).
2. INSERT matching `outbox` rows.
3. COMMIT — state, event, and outbox are atomic.

The outbox dispatcher (Celery Beat, every 2 s + on-commit fast path) claims pending rows with `FOR UPDATE SKIP LOCKED` and routes each event to its consumer queues (see [13-event-bus.md](13-event-bus.md)).

## Replay & reconstruction

- Projections (memory, graph, timeline caches) each expose a `rebuild(project_id | all)` entry point that streams `events` ordered by `sequence` through the same consumers used live. Consumers are **idempotent** (MERGE/upsert semantics), so replay is safe at any time.
- The timeline feature reads the event store directly (paginated, filtered by `project_id`) — the timeline IS the event history, rendered.
