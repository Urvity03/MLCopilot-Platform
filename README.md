# MLCopilot Platform

<p align="center">
  <b>Enterprise-Grade AI Copilot & Hybrid RAG Engine for Machine Learning Projects</b>
</p>

---

## ⚡ Overview

**MLCopilot** is an enterprise AI platform that provides an intelligent, ChatGPT-like workspace copilot with RAG (Retrieval-Augmented Generation) capabilities. Users can register accounts, manage workspace projects, upload knowledge base documents (PDF, DOCX, TXT), and engage in fast, grounded, streaming conversations powered by local LLM infrastructure (Ollama) or cloud providers (Gemini).

---

## ✨ Features

- 🤖 **ChatGPT-Like Workspace Awareness**: Ask general programming questions or workspace-specific document queries seamlessly.
- 🎯 **Confidence Routing & Hybrid RAG**: Automatically switches between Grounded Document RAG (with citations) and General Conversational Mode based on vector match score thresholds (`0.35`).
- ⚡ **High-Performance Streaming**: SSE (Server-Sent Events) streaming with persistent HTTP Keep-Alive connection pooling and model memory residency (`15m` keep-alive).
- 📚 **Document Indexing**: Multi-format document parser (PDF, DOCX, TXT) with automatic chunking and vector storage powered by PostgreSQL + `pgvector`.
- 🔄 **Ollama Fallback & Candidate Selection**: Automatically prefers installed models (`qwen2.5:3b` → `llama3.2:3b` → `llama3.1:8b`).
- 🎨 **Modern SaaS UX**: ChatGPT/Claude-style glassmorphism composer, multi-phase progress states (`Searching workspace...` → `Thinking...` → `Generating...`), and responsive layout.

---

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack React Query v5, Framer Motion, Lucide Icons.
- **Backend API**: FastAPI (Python 3.12, Pydantic v2, Uvicorn, AsyncIO).
- **Database & Storage**: PostgreSQL 16 + `pgvector`, Redis 7, MinIO S3 Object Storage.
- **AI & RAG Engine**: SentenceTransformers (`all-MiniLM-L6-v2`), Ollama API (`llama3.1:8b` / `qwen2.5:3b`), Gemini REST API.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Docker Engine v24.0+ & Docker Compose
- Ollama running locally (`ollama serve`) with at least one model pulled (`ollama pull llama3.1:8b`)

### 1. Clone & Setup Environment
```bash
git clone https://github.com/your-org/MLCopilot-Platform.git
cd MLCopilot-Platform
cp production.env.example .env
```

### 2. Start Full Stack via Docker Compose
```bash
docker compose up -d --build
```

Access the application components:
- **Web Application**: `http://localhost:3000`
- **FastAPI API Documentation**: `http://localhost:8000/docs`
- **API Health Endpoint**: `http://localhost:8000/api/v1/health/ready`

---

## 🧪 Running Tests

### Backend Pytest Suite
```bash
docker compose exec api pytest tests/ -o asyncio_mode=auto -v
```

### Playwright E2E Verification
```bash
node apps/web/run_final_verification.js
```

---

## 📁 Repository Folder Structure

```text
MLCopilot-Platform/
├── apps/
│   ├── api/                  # FastAPI Backend Application
│   │   ├── src/mlcopilot/    # Core Python Packages & Routers
│   │   ├── tests/            # Pytest Unit & Integration Suite
│   │   └── Dockerfile
│   └── web/                  # Next.js 14 Frontend Application
│       ├── app/              # Next.js App Router Pages & Components
│       ├── hooks/            # Custom React Query Hooks
│       └── Dockerfile
├── docs/                     # Technical Documentation & Architecture
│   └── architecture.md
├── .github/workflows/        # CI/CD Pipeline Definitions
├── docker-compose.yml        # Infrastructure Stack Compose Specification
├── DEPLOYMENT.md             # Production Deployment Instructions
├── RELEASE_NOTES.md          # Release Notes & Verified Features
├── CHANGELOG.md              # Project Version Change Log
└── FINAL_BENCHMARKS.md       # Latency & Performance Benchmarks
```

---

## 📖 Additional Documentation

- 📄 [Production Deployment Guide](DEPLOYMENT.md)
- 📐 [Architecture Specifications](docs/architecture.md)
- 🚀 [Release Notes](RELEASE_NOTES.md)
- 📊 [Performance Benchmarks](FINAL_BENCHMARKS.md)
- 📜 [Changelog](CHANGELOG.md)
