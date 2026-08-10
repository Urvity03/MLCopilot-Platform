# MLCopilot API — multi-stage image shared by api, worker, and beat
# (docs/architecture/21-docker.md). Builder resolves dependencies with uv;
# runtime is slim, compiler-free, and runs as a non-root user.

# ── Builder ────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /build

# Dependency layer: cached unless pyproject/lock change.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

# Project layer.
COPY src ./src
COPY tests ./tests
COPY README.md ./
RUN uv sync --frozen --no-editable
RUN /opt/venv/bin/python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# ── Runtime ────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:${PATH}" \
    LOG_FORMAT=json \
    HF_HOME="/home/app/.cache/huggingface"

RUN groupadd --system app && useradd --system --gid app --home-dir /home/app app && mkdir -p /home/app/.cache/huggingface

WORKDIR /app
RUN chown -R app:app /home/app /app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder --chown=app:app /root/.cache/huggingface /home/app/.cache/huggingface
COPY --chown=app:app alembic.ini ./alembic.ini
COPY --chown=app:app alembic ./alembic
COPY --chown=app:app tests ./tests
COPY --chown=app:app docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER app

EXPOSE 7860

HEALTHCHECK --interval=10s --timeout=5s --retries=12 CMD \
    python -c "import os, urllib.request; urllib.request.urlopen('http://localhost:' + str(os.environ.get('PORT', 7860)) + '/api/v1/health/live')"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["sh", "-c", "uvicorn mlcopilot.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
