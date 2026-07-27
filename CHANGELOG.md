# Changelog

All notable changes to the MLCopilot platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-27

### Added
- **Confidence Routing Engine**: Implemented `rag_similarity_threshold` (0.35) check in `RAGService` to dynamically route queries between Grounded Workspace RAG and General Conversational Mode.
- **Ollama Keep-Alive & Connection Pooling**: Added persistent `httpx.AsyncClient` connection pooling and `"keep_alive": "15m"` payload options in `OllamaProvider`.
- **Dynamic Model Candidate Resolution**: Auto-selects preference candidate (`qwen2.5:3b` → `llama3.2:3b` → `llama3.1:8b`) via `/api/tags`.
- **ChatGPT / Claude Composer Redesign**: Floating glassmorphism composer container with smooth focus glow, shortcut pills (`@`, `/`), and circular send button.
- **Optimistic Conversation Deletion**: Instant sidebar purge in 0ms using React Query `onMutate` cache manipulation in `useChat.ts`.
- **Multi-Phase Progress Indicators**: UI streaming badges displaying `Searching workspace...` → `Thinking...` → `Generating response...`.
- **CI/CD Pipeline**: GitHub Actions workflow `.github/workflows/ci.yml` for automated linting, backend tests, frontend builds, and Docker image validation.

### Changed
- Refined system prompt in `PromptBuilder` to adhere to 6 explicit operating rules for partial questions, workspace missing data, and citations.
- Reduced default context window from 4 to 3 top-scoring deduplicated chunks to reduce token footprint.
- Scoped citations block to render strictly when RAG citations exist.

### Fixed
- Fixed UI blink on SSE stream completion by awaiting React Query invalidation before resetting stream state.
- Fixed stale sidebar state during conversation deletion.
- Fixed hardcoded model labels by connecting frontend dynamically to `/api/v1/health/llm`.

---

## [0.9.0] - 2026-07-22

### Added
- Initial release candidate of MLCopilot platform featuring PostgreSQL pgvector, Next.js App Router, FastAPI backend, and document parsing engine (PDF, DOCX, TXT).
