# 02 — Clean Architecture Boundaries

## Layers

```
┌────────────────────────────────────────────────────────┐
│ Presentation      features/*/router.py, schemas.py     │  FastAPI, Pydantic IO
├────────────────────────────────────────────────────────┤
│ Application       features/*/service.py                │  use cases, orchestration
├────────────────────────────────────────────────────────┤
│ Domain            domain/                              │  entities, values, events, errors
├────────────────────────────────────────────────────────┤
│ Infrastructure    infrastructure/, ai/, workers/       │  DB, graph, storage, LLMs, queues
└────────────────────────────────────────────────────────┘
```

## Dependency Rules (enforced by import-linter)

1. `domain/` imports **nothing** from `core/`, `infrastructure/`, `ai/`, `features/`, `workers/`. Standard library + typing only.
2. `features/*/service.py` depends on **domain** and on **repository/provider protocols** — never on SQLAlchemy models, Neo4j sessions, or LLM SDKs directly.
3. `features/*/router.py` contains zero business logic: parse request → call service → shape response. Routers never touch repositories.
4. `infrastructure/` implements protocols defined by the application layer; it may import `domain/` (to map rows → entities) but never `features/`.
5. No feature imports another feature's `repository` or SQLAlchemy models. Cross-feature interaction happens through services or domain events.
6. `ai/providers/` is the only package allowed to import vendor LLM SDKs.

`pyproject.toml` carries the import-linter contracts; CI fails on violation.

## Repository Pattern

Each feature defines a repository `Protocol` next to its service:

```python
class ExperimentRepository(Protocol):
    async def get(self, experiment_id: UUID) -> Experiment | None: ...
    async def list_for_project(self, project_id: UUID, page: Cursor) -> Page[Experiment]: ...
    async def add(self, experiment: Experiment) -> None: ...
```

`infrastructure/db/repositories/` provides the SQLAlchemy implementation. Services receive repositories through FastAPI dependency wiring (`deps.py` per feature), so unit tests inject in-memory fakes.

## Unit of Work

A single `UnitOfWork` protocol wraps: DB session, event recording, and outbox append. Services do:

```python
async with uow:
    experiment = Experiment.start(...)          # domain logic + domain event
    await uow.experiments.add(experiment)
    uow.record(experiment.events)               # events → event store + outbox, same tx
    await uow.commit()
```

This guarantees state change + event append are atomic (see [08](08-event-store.md), [13](13-event-bus.md)).

## Where logic lives

| Concern | Location |
|---|---|
| Invariants ("experiment can't finish before starting") | `domain/entities` |
| Use-case orchestration ("start experiment, record event, enqueue analysis") | `features/*/service.py` |
| Persistence mapping | `infrastructure/db` |
| HTTP shapes / validation | `features/*/schemas.py` |
| AuthZ decisions | RBAC dependencies (`features/projects/deps.py`) evaluated before service call |
| LLM prompts / agent logic | `ai/agents` (application-layer, provider-agnostic) |

## Async policy

The API is async end-to-end (asyncpg, async SQLAlchemy, httpx, neo4j async driver). Celery tasks are sync entry points that run an event loop per task for reuse of async services.
