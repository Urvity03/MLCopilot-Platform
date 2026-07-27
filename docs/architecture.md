# MLCopilot Platform — System Architecture & Technical Specifications

This document provides a comprehensive technical overview of the architecture, database schema, vector RAG pipeline, LLM orchestration, and real-time streaming pipeline powering MLCopilot.

---

## 1. System Architecture Diagram

```text
                                  ┌───────────────────────────┐
                                  │   Next.js 14 Frontend     │
                                  │   (TypeScript / Tailwind) │
                                  └─────────────┬─────────────┘
                                                │ REST / SSE
                                                ▼
                                  ┌───────────────────────────┐
                                  │   FastAPI Backend API     │
                                  │   (Python 3.12 / Async)   │
                                  └──────┬──────────┬─────────┘
                                         │          │
                     ┌───────────────────┘          └───────────────────┐
                     ▼                                                  ▼
      ┌─────────────────────────────┐                    ┌─────────────────────────────┐
      │   PostgreSQL 16 + pgvector  │                    │      Ollama LLM Engine      │
      │   (Embeddings & Metadata)   │                    │   (llama3.1 / qwen2.5)      │
      └─────────────────────────────┘                    └─────────────────────────────┘
                     ▲                                                  ▲
                     │                                                  │
                     └───────────────────┬──────────────────────────────┘
                                         │
                                ┌────────┴────────┐
                                │ MinIO S3 Object │
                                │ Document Store  │
                                └─────────────────┘
```

---

## 2. Core Subsystems

### A. Frontend Layer (`apps/web`)
- **Framework**: Next.js 14 App Router (TypeScript, React 18, Tailwind CSS, Lucide icons, Framer Motion).
- **State & Data Fetching**: TanStack React Query v5 for asynchronous cache management & optimistic UI updates.
- **Streaming UI**: Custom Fetch API SSE client with multi-phase progress states (`Searching workspace...` → `Thinking...` → `Generating response...`).

### B. Backend API Layer (`apps/api`)
- **Framework**: FastAPI (Python 3.12, Uvicorn, Pydantic v2).
- **Security**: Argon2id password hashing, JWT Bearer Access/Refresh tokens, API Key authentication.
- **Clean Architecture Pattern**:
  - `routers/`: HTTP Request handlers & SSE endpoints.
  - `features/`: Core business domain logic (`chat`, `projects`, `uploads`, `search`).
  - `infrastructure/`: LLM providers (`OllamaProvider`, `GeminiProvider`), Storage repositories, and Vector database drivers.

### C. Database & Vector Storage (`postgres` / `pgvector`)
- **Engine**: PostgreSQL 16 with native `pgvector` extension.
- **Embedding Model**: `SentenceTransformer` (`all-MiniLM-L6-v2`, 384 dimensions).
- **Index**: HNSW / IVFFlat vector index with Cosine similarity metric (`<=>`).

### D. Hybrid RAG & Confidence Routing Engine
- **Similarity Threshold**: `RAG_SIMILARITY_THRESHOLD = 0.35`.
- **Confidence Routing Workflow**:
  1. Vector similarity search retrieves top matching document chunks.
  2. If highest similarity score >= `0.35`:
     - System constructs Grounded RAG prompt with `[Source ID]` citations.
     - SSE metadata stream yields context citations.
  3. Else (No document match or score < `0.35`):
     - System switches to General Conversational Mode.
     - Answer is generated naturally without false document refusals or citations.

### E. LLM Provider Infrastructure & Connection Management
- **Ollama Provider (`OllamaProvider`)**:
  - **Connection Pooling**: Persistent `httpx.AsyncClient` pool with HTTP Keep-Alive.
  - **In-Memory Residency**: `"keep_alive": "15m"` payload option keeps models preloaded in RAM/VRAM.
  - **Candidate Resolution**: Auto-selects preference candidate (`qwen2.5:3b` → `llama3.2:3b` → `llama3.1:8b`).

---

## 3. Data Flow & Request Sequence

1. **Document Ingestion**: User uploads PDF/DOCX/TXT → Document Parsers extract plain text → Recursive Text Splitter generates 500-token chunks with 50-token overlap → SentenceTransformers calculates embeddings → Vectors saved to PostgreSQL `embeddings` table.
2. **User Chat Query**: User submits question → API executes vector search → RAG Confidence Router selects mode → Streamer yields SSE tokens to frontend → React Query updates state smoothly.
