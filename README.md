# MLCopilot Platform

<p align="center">
  <h2 align="center">AI Workspace Copilot for Machine Learning Projects</h2>

  <p align="center">
    A full-stack AI workspace platform that combines local LLMs, Hybrid RAG,
    semantic document retrieval, and intelligent project management to assist
    with machine learning workflows.
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white" />
    <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white" />
    <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
    <img src="https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white" />
    <img src="https://img.shields.io/badge/Ollama-Primary%20LLM-black" />
    <img src="https://img.shields.io/badge/License-Apache%202.0-blue" />
  </p>
</p>

---

## Overview

MLCopilot is an AI-powered workspace designed to help users manage machine learning projects through intelligent conversations and document-aware assistance.

Users can create projects, upload technical documents, build searchable knowledge bases, and interact with an AI assistant capable of answering both general questions and workspace-specific queries using a Hybrid Retrieval-Augmented Generation (Hybrid RAG) pipeline.

The platform combines a modern ChatGPT-inspired interface with secure authentication, semantic search, persistent conversations, and local LLM inference powered primarily by Ollama.

---

# Features

| Feature | Description |
|---------|-------------|
| AI Chat | ChatGPT-inspired conversational interface with streaming AI responses and persistent conversations |
| Hybrid RAG | Workspace-aware semantic retrieval with confidence-based routing between document retrieval and general AI responses |
| Authentication | Email & Password, Google OAuth, GitHub OAuth, JWT authentication, and Password Reset |
| Knowledge Base | Upload PDF, DOCX and TXT documents with automatic chunking and embedding generation |
| Workspace Management | Multi-project organization with isolated conversations and documents |
| Local AI | Ollama-powered local inference with optional support for additional providers |

---

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- Framer Motion

### Backend

- FastAPI
- Python
- SQLAlchemy
- PostgreSQL
- Redis
- Uvicorn

### AI Stack

**Primary LLM**

- Ollama

**Embedding Model**

- Sentence Transformers (`all-MiniLM-L6-v2`)

**Vector Database**

- PostgreSQL + pgvector

**Optional Providers**

- Google Gemini
- OpenAI-compatible APIs

---

# Architecture

```text
                     User
                       │
                       ▼
                Next.js Frontend
                       │
                       ▼
                 FastAPI Backend
                       │
        ┌──────────────┴──────────────┐
        │                             │
 Authentication                 Chat Service
                                      │
                                Hybrid RAG
                                      │
               ┌──────────────────────┴──────────────────────┐
               │                                             │
      Semantic Retrieval                           Ollama (LLM)
               │
               ▼
      PostgreSQL + pgvector
```

---

# AI Response Pipeline

```text
                User Query
                     │
                     ▼
            Workspace Detection
                     │
                     ▼
           Embedding Generation
                     │
                     ▼
          Semantic Vector Search
                     │
                     ▼
             Similarity Score
                     │
          ┌──────────┴──────────┐
          │                     │
     High Confidence      Low Confidence
          │                     │
     Hybrid RAG            Ollama
          │                     │
          └──────────┬──────────┘
                     ▼
          Streaming AI Response
```

---

# Project Structure

```text
MLCopilot-Platform/

├── apps/
│   ├── api/          # FastAPI backend
│   ├── web/          # Next.js frontend
│   └── contracts/    # Shared API contracts
│
├── docs/
├── docker/
└── README.md
```
---

# Getting Started

## Prerequisites

Before running MLCopilot locally, make sure you have:

- Python 3.12+
- Node.js 20+
- pnpm
- PostgreSQL with pgvector
- Redis
- Ollama

---

## Clone the Repository

```bash
git clone https://github.com/Urvity03/MLCopilot-Platform.git
cd MLCopilot-Platform
```

---

## Backend Setup

```bash
cd apps/api

uv sync

uv run alembic upgrade head

uv run uvicorn mlcopilot.main:app --reload
```

Backend runs at:

```
http://localhost:8000
```

---

## Frontend Setup

```bash
cd apps/web

pnpm install

pnpm dev
```

Frontend runs at:

```
http://localhost:3000
```

---

## Environment Variables

Create a `.env` file using `.env.example` and configure the required values.

Important variables include:

```
DATABASE_URL=
JWT_SECRET=
OLLAMA_BASE_URL=
OLLAMA_MODEL=
REDIS_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

# Screenshots

> coming soon

---

# Current Capabilities

- AI-powered workspace assistant
- Hybrid Retrieval-Augmented Generation (Hybrid RAG)
- Streaming AI responses
- Multi-project workspace management
- Semantic document search
- Conversation history
- PDF, DOCX and TXT document support
- Secure authentication
- Google OAuth
- GitHub OAuth
- Password reset workflow
- PostgreSQL + pgvector integration
- Local LLM inference using Ollama

---

# Roadmap

- GitHub repository integration
- Code-aware Retrieval-Augmented Generation
- Repository chat assistant
- Model Context Protocol (MCP) integration
- Additional LLM provider support
- Team collaboration features
- Advanced workspace analytics

---

# Contributing

Contributions, bug reports, and feature suggestions are welcome.

If you'd like to contribute:

1. Fork the repository
2. Create a new feature branch
3. Commit your changes
4. Open a Pull Request

---

# License

This project is licensed under the Apache 2.0 License.

---

# Author

**Urvi Tyagi**

B.Tech in Artificial Intelligence & Machine Learning

MLCopilot is a personal project focused on building an AI-powered workspace for machine learning projects using modern full-stack development, Hybrid RAG, semantic search, and local LLM deployment.

---

If you find this project useful, consider giving it a ⭐ on GitHub.
