# 01 — Repository Structure

MLCopilot is a **pnpm + Python monorepo**. The frontend and backend are separate deployable applications sharing one repository, one CI pipeline, and one contract package.

```
/
├── docker-compose.yml              # one-command startup: 8 services
├── Makefile                        # make dev / seed / test / lint / migrate / format
├── pnpm-workspace.yaml             # JS workspace: apps/web, packages/*
├── package.json                    # workspace root; delegates dev/build to apps/web
├── lefthook.yml                    # git hooks (JS lint-staged, Python ruff/mypy)
├── README.md                       # flagship readme: quickstart, architecture, screenshots
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE                         # Apache-2.0
├── .env.example                    # every variable, documented
├── .github/
│   ├── workflows/ci.yml            # lint + typecheck + test for web and api
│   ├── ISSUE_TEMPLATE/             # bug_report.yml, feature_request.yml, config.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
├── docs/
│   ├── PRD.md
│   ├── TDD.md
│   └── architecture/               # 28 numbered design documents
├── apps/
│   ├── web/                        # Next.js 15 + React 19 (see below)
│   └── api/                        # FastAPI backend (see below)
└── packages/
    └── contracts/                  # TS types generated from the API OpenAPI spec
```

## Backend — `apps/api`

```
apps/api/
├── pyproject.toml                  # deps, ruff, mypy, pytest, import-linter config
├── alembic.ini
├── alembic/                        # migrations
├── Dockerfile                      # multi-stage: builder → slim runtime
└── src/mlcopilot/
    ├── main.py                     # app factory, middleware, lifespan, router mounting
    ├── core/                       # cross-cutting, no business logic
    │   ├── config.py               # pydantic-settings, fail-fast validation
    │   ├── security.py             # password hashing, JWT, API key hashing
    │   ├── logging.py              # structlog configuration
    │   ├── exceptions.py           # domain error → HTTP mapping
    │   ├── ratelimit.py            # slowapi limiter
    │   ├── capabilities.py         # Capability Registry (V2/V3 gating)
    │   └── pagination.py           # cursor pagination primitives
    ├── domain/                     # PURE. Zero imports from other layers.
    │   ├── entities/               # dataclasses: User, Project, Dataset, Experiment, ...
    │   ├── values/                 # value objects: Role, MetricValue, MemoryKind, ...
    │   ├── events/                 # domain event dataclasses + event catalog
    │   └── errors.py               # domain error hierarchy
    ├── infrastructure/
    │   ├── db/                     # async engine, session, SQLAlchemy models, UoW
    │   ├── events/                 # event store + transactional outbox + publisher
    │   ├── graph/                  # Neo4j driver wrapper + Cypher repositories
    │   ├── storage/                # MinIO object storage client
    │   └── cache/                  # Redis client
    ├── ai/
    │   ├── providers/              # LLMProvider protocol + anthropic/openai/gemini/ollama/openrouter
    │   ├── embeddings/             # EmbeddingProvider protocol + implementations
    │   ├── mcp/                    # MCP client, server registry, agent tool adapter
    │   └── agents/                 # LangGraph graphs: state.py, tools.py, 11 agent modules
    ├── plugins/                    # plugin SDK: manifest, discovery, extension registries
    ├── features/                   # feature-first; each: router / schemas / service / repository
    │   ├── auth/  users/  api_keys/
    │   ├── projects/               # + membership + RBAC deps
    │   ├── datasets/               # + versions + analyzer orchestration
    │   ├── experiments/            # + metrics + timeline
    │   ├── uploads/                # notebooks + papers
    │   ├── integrations/           # github + mlflow (via MCP)
    │   ├── memory/  search/  graph/  chat/  investigations/
    │   ├── billing/ teams/ notifications/ audit/ model_cards/ docs_generator/   # V2/V3 contracts
    │   └── health/
    ├── workers/                    # celery_app.py + task modules per queue
    └── seed/                       # deterministic demo data seeder
tests/
├── unit/                           # domain, services (fakes), agents (FakeLLMProvider)
└── integration/                    # httpx + service containers
```

## Frontend — `apps/web`

```
apps/web/
├── app/                            # Next.js App Router
│   ├── (marketing)/                # landing page
│   ├── (auth)/login, register
│   └── (app)/                      # authenticated shell
│       ├── dashboard/
│       └── projects/[projectId]/   # overview, experiments, timeline, datasets,
│                                   # uploads, graph, chat, memory, search, settings
├── components/                     # design system + feature components
│   ├── ui/                         # shadcn primitives
│   ├── shell/                      # sidebar, topbar, command palette
│   └── <feature>/                  # experiments/, graph/, chat/, ...
├── lib/
│   ├── api/                        # typed client over packages/contracts
│   ├── auth/                       # token/session handling
│   └── hooks/                      # TanStack Query hooks per feature
└── styles/
```

## Rationale

1. **Feature-first backend**: a feature folder is deletable/extractable; layer folders (`routers/`, `services/`) scatter one feature across the tree.
2. **`domain/` is global, features are vertical**: entities are shared vocabulary; feature folders own use cases and IO.
3. **`packages/contracts`**: OpenAPI → TS generation makes frontend/backend drift a compile error, not a runtime bug.
4. **Docs live in-repo**: architecture evolves in the same PRs as code.
