# MLCopilot API

FastAPI backend for the MLCopilot platform. See `docs/architecture/` at the
repository root for the full design; layering rules live in
`02-clean-architecture.md` and are enforced by import-linter.

## Local development

```bash
uv sync                                   # install runtime + dev dependencies
uv run uvicorn mlcopilot.main:app --reload
```

Configuration comes from environment variables (see `/.env.example` at the
repository root). With the compose stack running, PostgreSQL and Redis
defaults work out of the box.

## Commands

```bash
uv run pytest tests/unit -q               # unit tests
uv run ruff check src tests               # lint
uv run ruff format src tests              # format
uv run mypy src                           # typecheck
uv run lint-imports                       # architecture contracts
uv run python -m mlcopilot.tools.migrate  # advisory-locked alembic upgrade head
uv run alembic revision --autogenerate -m "message"
```

## Health

- `GET /api/v1/health/live` — liveness, no dependency checks
- `GET /api/v1/health/ready` — postgres + redis probes; 503 on hard failure
- OpenAPI: `GET /api/v1/openapi.json`, interactive docs at `/api/v1/docs`
  (disabled in production)
