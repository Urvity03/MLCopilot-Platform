# 27 — Testing Strategy

## Pyramid

| Layer | Scope | Infrastructure |
|---|---|---|
| Unit — domain | entity invariants, state machines, value objects | none (pure) |
| Unit — services | use cases with in-memory fake repositories + `FakeUnitOfWork` | none |
| Unit — agents | graph nodes with `FakeLLMProvider` + fake tools; assert structured outputs, tool permissions, citation discipline | none |
| Integration — API | httpx `AsyncClient` against the real app: auth flows, RBAC matrix, CRUD, error envelope, pagination | Postgres, Redis (service containers) |
| Integration — projections | event → outbox → consumer → assert graph/memory/embedding state | + Neo4j, MinIO |
| Contract | OpenAPI generation drift check | CI-only |

Frontend: vitest + Testing Library for hooks and critical components (auth guard, command palette, SSE chat reducer); typed client generation is itself the main contract test.

## Key fixtures

```python
@pytest.fixture def fake_llm() -> FakeLLMProvider: ...
    # scripted: queue structured responses per agent; records every CompletionRequest
@pytest.fixture async def uow() -> FakeUnitOfWork: ...
    # in-memory repos + captured events list
@pytest.fixture async def client(app) -> AsyncClient: ...
@pytest.fixture async def project_with_member(...) -> ProjectFixture: ...
    # factory: users at each role for RBAC matrix tests
```

`FakeLLMProvider` implements the full `LLMProvider` protocol; agent tests never touch the network. Deterministic seeds everywhere; no sleeps — async conditions awaited via polling helpers with timeouts.

## Non-negotiables

1. Every feature PR includes unit tests for its service and integration tests for its router.
2. RBAC: a parametrized matrix test asserts every project endpoint × role → expected status.
3. Event consumers: idempotency test (apply twice, assert same state) is mandatory per consumer.
4. Coverage gate: 85% on `domain/` + `features/*/service.py`; measured, not worshiped — assertions over percentages.
