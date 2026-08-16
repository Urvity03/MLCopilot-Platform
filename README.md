# MLCopilot Platform

<p align="center">
  <h2 align="center">AI Workspace Copilot for Machine Learning Projects</h2>

  <p align="center">
    A full-stack AI workspace platform combining intelligent AI chat, Hybrid RAG, semantic document retrieval, project management, and code intelligence for machine learning workflows.
  </p>

  <p align="center">
    <a href="https://github.com/Urvity03/MLCopilot-Platform/actions"><img src="https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white" alt="CI/CD Status" /></a>
    <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white" alt="Python Version" />
    <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <a href="https://deepmind.google/technologies/gemini/"><img src="https://img.shields.io/badge/LLM-Google%20Gemini-8E75B2?logo=google&logoColor=white" alt="Google Gemini LLM" /></a>
    <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL pgvector" />
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white" alt="Docker Ready" />
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue" alt="License" />
  </p>
</p>

---

##  Live Demo

- **Production URL**: [https://mlcopilot-two.vercel.app](https://mlcopilot-two.vercel.app)

MLCopilot is deployed live on Vercel with a Neon PostgreSQL/pgvector cloud database and active Google Gemini AI model integration. You can register an account or log in via Google/GitHub OAuth to create projects, upload documents, and interact with the real-time AI assistant.

---

##  Overview

MLCopilot is an enterprise-grade AI workspace designed to help developers, data scientists, and ML engineers organize research, analyze technical documentation, and collaborate with an AI assistant.

Key highlights:
- **AI Chat & Streaming**: Real-time Server-Sent Events (SSE) token streaming with multi-turn conversation persistence.
- **Hybrid RAG Pipeline**: Grounded workspace document retrieval with dynamic confidence routing.
- **Multi-Project Workspace**: Organize documents, code, and chat threads by workspace.
- **Document & Code Intelligence**: Parse, chunk, and embed PDF, DOCX, TXT, Markdown, Jupyter Notebooks (`.ipynb`), and GitHub repository structures.
- **OAuth & Security**: Argon2id password hashing, JWT session management, Google OAuth, GitHub OAuth, and password reset flows.
- **Configurable LLM Backends**: Seamless support for Google Gemini API (`gemini-3.6-flash`), local Ollama models, and OpenAI-compatible providers.
- **Theme System**: Modern dark & light theme modes with responsive glassmorphism UI.

---

##  Screenshots

### Authentication
![MLCopilot Login](docs/screenshots/login.png)

MLCopilot authentication with email/password and Google/GitHub OAuth.

### Dashboard
![MLCopilot Dashboard](docs/screenshots/dashboard.png)

Workspace overview with system status, active workspaces, AI insights, and quick actions.

### AI Workspace
![MLCopilot Workspace](docs/screenshots/workspace-overview.png)

Knowledge-base and RAG workspace overview.

### AI Chat
![MLCopilot AI Chat](docs/screenshots/ai-chat.png)

Conversational RAG interface for interacting with the workspace knowledge base.

### Workspace Settings
![MLCopilot Settings](docs/screenshots/settings.png)

Workspace configuration and AI/RAG infrastructure settings.

---

##  Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI Library**: React 19, Tailwind CSS, Lucide Icons, Framer Motion
- **State Management**: TanStack Query (React Query) v5, Zustand, `next-themes`
- **Language**: TypeScript 5

### Backend
- **Framework**: FastAPI (Async Python 3.12)
- **Database / ORM**: PostgreSQL 16 + `pgvector` extension, SQLAlchemy 2.0 (AsyncIO), Alembic
- **Task Broker / Cache**: Redis 7, Celery
- **Security & Auth**: Argon2id (`pwdlib`), PyJWT, Google & GitHub OAuth 2.0

### AI & Embeddings Stack
- **Active Production LLM**: Google Gemini API (`gemini-3.6-flash` REST / streaming)
- **Local / Fallback LLM**: Ollama (`qwen2.5:3b`, `llama3.2:3b`, `llama3.1:8b`)
- **Embedding Model**: Sentence Transformers (`all-MiniLM-L6-v2`, 384-dimensional dense vectors)
- **Vector Search**: PostgreSQL `pgvector` index with cosine similarity

---

##  Architecture & Data Flow

```mermaid
flowchart TD
    User([User / Browser])
    Web[Next.js 16 Web App\nReact / Tailwind CSS]
    API[FastAPI Backend\nAsync Python 3.12]
    Services[Core Services\nAuth / Project / Document / Chat]
    DB[(PostgreSQL 16 + pgvector\nUsers / Projects / Chunks & Vectors)]
    Embed[Sentence Transformers\nall-MiniLM-L6-v2]
    RAG[Hybrid RAG Engine\nConfidence Routing & Semantic Search]
    LLM[Configurable LLM Provider\nGoogle Gemini / Ollama]

    User <-->|HTTP / SSE Stream| Web
    Web <-->|REST API / JSON| API
    API --> Services
    Services <--> DB
    Services --> Embed
    Services --> RAG
    RAG --> DB
    Services <-->|Streaming Response| LLM
```

---

##  How It Works

1. **Workspace Creation**: The user creates or selects an isolated project workspace.
2. **Document Ingestion**: The user uploads technical documents (PDF, DOCX, TXT, MD, `.ipynb`) or repository files.
3. **Parsing & Chunking**: Content is sanitized, extracted, and split into semantic chunks with overlap.
4. **Vector Embedding**: Chunks pass through the embedding engine (`all-MiniLM-L6-v2`) generating 384-d dense vectors.
5. **Vector Indexing**: Chunks and vectors are stored in PostgreSQL using `pgvector`.
6. **Query Processing**: When the user sends a message, a query vector is generated.
7. **Semantic Search**: Cosine similarity search retrieves the top matching workspace chunks.
8. **Confidence Routing**: The system checks similarity against `rag_similarity_threshold` (0.35). High-scoring matches trigger Grounded RAG mode with citations; low scores route to General Conversational Mode.
9. **Context Assembly**: Relevant chunks and recent conversation history are injected into the LLM system prompt.
10. **Token Streaming**: Response tokens stream to the UI in real-time via Server-Sent Events (SSE).
11. **State Persistence**: Message state, context citations, and token usage are saved to the database.

---

##  Authentication & Security

- **Email & Password**: Registration and login using Argon2id password hashing.
- **JWT Sessions**: Access tokens and refresh tokens signed with strong SHA-256 HMAC keys.
- **Google OAuth 2.0**: One-click Google sign-in and account linking.
- **GitHub OAuth 2.0**: One-click GitHub sign-in for developer workflows.
- **Password Reset**: Token-based password recovery via email flow.
- **Security Protections**: Parameterized SQL queries, prompt injection boundaries, CORS isolation, and strict input validation.

---

##  Implemented Features vs. Roadmap

###  Implemented Capabilities
- [x] Full-Stack Next.js 16 + FastAPI architecture
- [x] AI Chat UI with real-time SSE token streaming
- [x] Hybrid RAG & confidence-based similarity routing
- [x] Document Parsing & Embedding (PDF, DOCX, TXT, MD, Notebook `.ipynb`)
- [x] GitHub Repository Integration & Code-Aware Intelligence
- [x] PostgreSQL + `pgvector` Vector Indexing
- [x] Argon2id Password Hashing & JWT Authentication
- [x] Google OAuth & GitHub OAuth 2.0 Integration
- [x] Password Reset & Account Management
- [x] Configurable LLM Provider System (Google Gemini, Ollama, OpenAI API)
- [x] Dark & Light Theme Engine with Glassmorphism Design
- [x] Vercel Production Deployment & Automated CI/CD Pipeline

###  Future Roadmap
- [ ] Model Context Protocol (MCP) server & tool integrations
- [ ] Multi-modal image, diagram & chart ingestion
- [ ] Hybrid BM25 keyword + dense vector re-ranking (Cross-Encoders)
- [ ] Fine-grained team RBAC permissions & organization sharing
- [ ] Automated ML model evaluation dashboards

---

##  Environment Configuration

Copy the sample environment file to configure your local setup:

```bash
cp .env.example .env
```

>  **CRITICAL SECURITY NOTE**: Never commit `.env` files, production database URLs, API keys, or OAuth secrets to Git.

### Key Environment Variables

| Variable | Description | Default / Format |
|---|---|---|
| `DATABASE_URL` | PostgreSQL Async connection string | `postgresql+asyncpg://user:pass@localhost:5432/mlcopilot` |
| `JWT_SECRET` | Secret key for signing JWT tokens | 64-character hex string |
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `GEMINI_MODEL` | Active Gemini Model name | `gemini-3.6-flash` |
| `OLLAMA_BASE_URL` | Local Ollama endpoint | `http://localhost:11434` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `*.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Secret string |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | Client ID string |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | Secret string |
| `ENVIRONMENT` | Runtime environment | `development` / `production` / `test` |

---

##  Local Development Setup

### Prerequisites
- **Python**: 3.12+
- **Node.js**: 20+
- **Package Manager**: `pnpm` (`npm install -g pnpm`)
- **Database**: PostgreSQL 16 with `pgvector` extension (or Docker)

### 1. Clone Repository
```bash
git clone https://github.com/Urvity03/MLCopilot-Platform.git
cd MLCopilot-Platform
```

### 2. Backend Setup
```bash
cd apps/api

# Install dependencies using uv
python -m pip install uv
python -m uv sync --group dev

# Run Database Migrations
python -m uv run python -m mlcopilot.tools.migrate

# Start Backend Server (runs on http://localhost:8000)
python -m uv run uvicorn mlcopilot.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
# In a new terminal window
cd apps/web

# Install dependencies
pnpm install

# Start Next.js Development Server (runs on http://localhost:3000)
pnpm dev
```

### 4. Docker Option
To run the full stack via Docker Compose:
```bash
docker compose up --build
```

---

##  Testing & Quality Assurance

### Backend Unit Tests & Linting
```bash
cd apps/api

# Run Pytest suite
python -m uv run pytest tests/ -o asyncio_mode=auto -v

# Run Code Formatting & Type Checks
python -m uv run ruff check src/ tests/
python -m uv run mypy src/
```

### Frontend Build & Typecheck
```bash
cd apps/web

# Production build and TypeScript validation
pnpm build
```

---

##  CI/CD Pipeline

The repository includes an automated GitHub Actions quality pipeline defined in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml):

- **Backend Unit Tests & Lint**: Runs Pytest against a live `pgvector/pgvector:pg16` database service.
- **Frontend Build & Typecheck**: Compiles the Next.js application using `pnpm` and validates TypeScript definitions.
- **Verify Docker Container Builds**: Builds production Docker images for both `api` and `web`.
- **GitGuardian Security Scanning**: Automated secret scanning on every pull request and push.

---

##  Production Deployment

Refer to [`DEPLOYMENT.md`](./DEPLOYMENT.md) for full production deployment guidelines.

The frontend is currently deployed to Vercel Production:
- **Live URL**: [https://mlcopilot-two.vercel.app](https://mlcopilot-two.vercel.app)

---

##  Project Structure

```text
MLCopilot-Platform/
├── apps/
│   ├── api/                    # FastAPI Backend Application
│   │   ├── alembic/            # Database schema migrations
│   │   ├── src/mlcopilot/      # Clean Architecture source code
│   │   │   ├── core/           # Config, logging, security
│   │   │   ├── domain/         # Domain entities & interfaces
│   │   │   ├── infrastructure/ # DB, vector store, LLMs, OAuth
│   │   │   └── features/       # Auth, Chat, Projects, RAG, Health
│   │   ├── tests/              # Pytest test suite
│   │   └── Dockerfile          # Multi-stage API container definition
│   │
│   └── web/                    # Next.js 16 Web Application
│       ├── app/                # Next.js App Router pages & layout
│       ├── components/         # React UI components & design system
│       ├── hooks/              # Custom React hooks & state
│       ├── public/             # Static brand assets & favicon
│       └── Dockerfile          # Multi-stage Web container definition
│
├── packages/
│   └── contracts/              # Shared API definitions & contracts
│
├── docs/                       # Architecture documentation & guides
├── .github/workflows/          # GitHub Actions CI/CD workflows
├── docker-compose.yml          # Multi-container local orchestration
├── docker-compose.prod.yml     # Production orchestration
├── DEPLOYMENT.md               # Production deployment guide
├── CHANGELOG.md                # Version release history
└── README.md                   # Repository documentation
```

---

##  License

Licensed under the Apache License, Version 2.0. See [Apache License 2.0](LICENSE) for details.

---

## Author & Maintainer

**Urvi Tyagi**
*B.Tech in Artificial Intelligence & Machine Learning*
- GitHub: [@Urvity03](https://github.com/Urvity03)
- Production App: [MLCopilot Platform](https://mlcopilot-two.vercel.app)
