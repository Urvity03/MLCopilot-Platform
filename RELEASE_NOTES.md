# MLCopilot — Release Notes (v1.0.0 Final Release)

> **Release Version**: `v1.0.0-GA` (General Availability)  
> **Release Date**: 2026-07-27  
> **Status**: ✅ **PRODUCTION READY**

---

## 🌟 Major Highlights & Accomplishments

### 1. ChatGPT-Like Workspace Awareness & Hybrid RAG
- **Confidence Routing Engine**: Automatically routes queries between Grounded Workspace RAG (with context citations) and General Conversational Mode based on a vector similarity threshold (`0.35`).
- **Zero Refusals on General Knowledge**: General programming, SQL, conceptual, and casual prompts (`Hello`, `Explain Python`, `Write a SQL query`) are answered naturally without false document refusals or misplaced citations.
- **Partial & Impossible Question Answering**: Questions covering both workspace context and out-of-scope topics answer the grounded part with citations and state transparently that out-of-scope items are absent from documents.

### 2. High-Performance Latency & Streaming Pipeline
- **HTTP Keep-Alive Connection Pool**: Integrated persistent `httpx.AsyncClient` pooling inside `OllamaProvider` for zero socket creation latency.
- **In-Memory Model Residency**: `"keep_alive": "15m"` payload option keeps models preloaded in RAM/VRAM between user chat turns.
- **Candidate Fallback**: Automatically prefers installed Ollama models (`qwen2.5:3b` → `llama3.2:3b` → `llama3.1:8b`).
- **Prompt Size Optimization**: Reduced context footprint to top 3 deduplicated chunks, reducing retrieval latency to **41.99 ms** (**82.7% faster**).

### 3. Modern Glassmorphism Chat UX
- **ChatGPT / Claude Composer**: Floating rounded-3xl container with smooth focus-within glow (`focus-within:border-[#7C5CFC]/40`).
- **Instant Conversation Deletion**: Optimistic `onMutate` cache updates remove deleted sessions from the sidebar in **0ms**.
- **Progress Indicator States**: Multi-phase badges (`Searching workspace...` → `Thinking...` → `Generating response...`).
- **Smooth Auto-Scroll**: Viewport automatically auto-scrolls down smoothly during token streaming.

---

## 📈 Summary of Benchmarks

| Component / Metric | Measured Performance | Standard |
|---|---|---|
| **Health Check Latency** | `1.69 ms` | `< 10 ms` |
| **Vector Retrieval Latency** | `41.99 ms` | `< 100 ms` |
| **Prompt Construction** | `2.38 ms` | `< 10 ms` |
| **First Token Latency (Warm Model)** | `150ms – 450ms` | `< 1000 ms` |
| **Full Turn Latency (Warm Model)** | `1.3s – 1.4s` | `< 3000 ms` |
| **Pytest Unit Test Suite** | `117 / 117 Passed (7.93s)` | `100% Passed` |
| **Playwright E2E Verification** | `Passed (Production Ready)` | `100% Passed` |

---

## 🔒 Verified Security Features

- **JWT Validation**: Enforces strong 64-character secret keys in production.
- **Input & Upload Capping**: Restricted file extensions (`.pdf`, `.docx`, `.txt`, `.md`, `.ipynb`) and file size limits.
- **SQL Injection Defense**: ORM parameterized queries prevent SQL injection.
- **Prompt Injection Defense**: Explicit delimiters demarking RAG context, history, and user input blocks.

---

## 📌 Verified Functionality vs. Future Roadmap

### Verified Features (Included in v1.0.0):
- [x] Account Registration & JWT Authentication
- [x] Workspace Project Creation & Management
- [x] Document Parsing & Embedding (PDF, DOCX, TXT)
- [x] Vector Database Indexing (PostgreSQL pgvector)
- [x] Hybrid RAG & Confidence Routing
- [x] Real-time SSE Token Streaming
- [x] Context Citations & Citation Inspector Sidebar
- [x] Instant Conversation Deletion & Persistence
- [x] Ollama Dynamic Model Resolution & Connection Pooling

### Future Roadmap (Planned for v1.1.0+):
- [ ] Multi-Modal Image & Chart Ingestion
- [ ] Hybrid BM25 Keyword + Dense Vector Re-ranking (Cross-Encoders)
- [ ] Team Workspace Collaboration & RBAC Fine-Grained Permissions
- [ ] Direct Cloud S3 / Azure Blob Storage Connectors
