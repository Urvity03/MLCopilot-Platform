.PHONY: dev down seed migrate test lint format typecheck contracts help

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: ## Start the full stack (web, api, worker, beat, postgres, neo4j, redis, minio)
	docker compose up --build

down: ## Stop the stack and keep volumes
	docker compose down

seed: ## Load deterministic demo data into a running stack
	docker compose exec api python -m mlcopilot.seed

migrate: ## Apply database migrations
	docker compose exec api alembic upgrade head

migration: ## Autogenerate a migration: make migration m="add foo"
	docker compose exec api alembic revision --autogenerate -m "$(m)"

test: ## Run backend unit tests + frontend tests
	docker compose exec api pytest tests/unit -q
	pnpm -r test

test-integration: ## Run backend integration tests (requires running stack)
	docker compose exec api pytest tests/integration -q

lint: ## Lint backend and frontend
	docker compose exec api ruff check src tests
	pnpm lint

format: ## Format backend and frontend
	docker compose exec api ruff format src tests
	pnpm exec prettier --write "apps/web/**/*.{ts,tsx,css}"

typecheck: ## Typecheck backend and frontend
	docker compose exec api mypy src
	pnpm typecheck

contracts: ## Regenerate the TypeScript API contracts from OpenAPI
	docker compose exec api python -m mlcopilot.tools.export_openapi
	pnpm contracts:generate
