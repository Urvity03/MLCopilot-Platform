# 23 — CI/CD Architecture

## GitHub Actions — `ci.yml`

Path-filtered jobs so web-only PRs skip Python jobs and vice versa.

```
jobs:
  web-lint-type-test:       # pnpm install → eslint → tsc --noEmit → vitest
  api-lint:                 # uv sync → ruff check → ruff format --check
  api-typecheck:            # mypy --strict src/
  api-arch:                 # import-linter (Clean Architecture contracts)
  api-unit:                 # pytest tests/unit (no services required)
  api-integration:          # pytest tests/integration with service containers:
                            #   pgvector/pgvector:pg16, neo4j:5, redis:7, minio
  contracts-drift:          # generate OpenAPI → generate TS client → git diff --exit-code
  docker-build:             # build api + web images (no push) — Dockerfiles stay honest
```

All jobs required for merge to `main`. Concurrency group cancels superseded runs per PR.

## Git hooks (lefthook)

| Hook | Action |
|---|---|
| pre-commit | staged JS/TS → eslint --fix + prettier; staged Python → ruff check --fix + ruff format |
| pre-push | `tsc --noEmit` (if web changed), `mypy` on changed Python packages |
| commit-msg | conventional-commit format check |

Hooks are fast (< 5 s typical) — anything slower belongs in CI, not hooks.

## Versioning & releases

- Conventional commits → changelog generation.
- Tags `v*` trigger a release workflow: build + push images (GHCR), create GitHub release with generated notes.
