#  MLCopilot Platform

```{=html}
<p align="center">
```
`<b>`{=html}A production-ready AI Knowledge Platform built with FastAPI,
PostgreSQL, pgvector, Retrieval-Augmented Generation (RAG), and Clean
Architecture.`</b>`{=html}
```{=html}
</p>
```
```{=html}
<p align="center">
```
![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED)
![License](https://img.shields.io/badge/License-MIT-green)

```{=html}
</p>
```

------------------------------------------------------------------------

#  Table of Contents

-   Overview
-   Features
-   Architecture
-   AI Pipelines
-   Tech Stack
-   Project Structure
-   API Overview
-   Getting Started
-   Development
-   Testing
-   Screenshots
-   Roadmap
-   Release History
-   Author
-   License

------------------------------------------------------------------------

#  Overview

MLCopilot Platform is a modular AI platform for managing projects,
ingesting documents, generating embeddings, performing semantic search,
and powering Retrieval-Augmented Generation (RAG) conversations.

The backend follows **Clean Architecture**, separating domain logic from
infrastructure while keeping the system scalable, testable, and easy to
extend.

------------------------------------------------------------------------

#  Features

## Platform

-   Clean Architecture
-   Monorepo
-   Docker Compose
-   Configuration management

## Authentication

-   JWT Authentication
-   Refresh Token Rotation
-   API Keys
-   RBAC
-   Swagger Authorization

## Project Management

-   Project workspaces
-   Membership management
-   Ownership transfer
-   Tenant isolation

## Knowledge Base

-   PDF parsing
-   DOCX parsing
-   Markdown parsing
-   TXT parsing
-   Intelligent chunking
-   MinIO storage

## AI

-   Sentence Transformer embeddings
-   pgvector vector storage
-   HNSW indexing
-   Semantic search
-   RAG backend
-   Conversation persistence
-   Streaming responses
-   Citation support

## Engineering

-   SQLAlchemy
-   Alembic
-   Pytest
-   Ruff
-   MyPy
-   Import Linter

------------------------------------------------------------------------

#  Clean Architecture

``` mermaid
flowchart TD
A[FastAPI Routers]
B[Application Services]
C[Domain Layer]
D[Infrastructure]

A-->B
B-->C
C-->D
```

------------------------------------------------------------------------

#  Knowledge Base Pipeline

``` mermaid
flowchart LR
User-->Upload
Upload-->MinIO
MinIO-->Parser
Parser-->Chunking
Chunking-->Embeddings
Embeddings-->pgvector
```

------------------------------------------------------------------------

#  Embedding Pipeline

``` mermaid
flowchart LR
Chunks-->SentenceTransformer
SentenceTransformer-->Vector384D
Vector384D-->pgvector
pgvector-->HNSW
```

------------------------------------------------------------------------

#  Retrieval-Augmented Generation

``` mermaid
flowchart LR
Question-->QueryEmbedding
QueryEmbedding-->SemanticSearch
SemanticSearch-->TopKChunks
TopKChunks-->PromptBuilder
PromptBuilder-->LLM
LLM-->StreamingAnswer
StreamingAnswer-->Citations
```

------------------------------------------------------------------------

#  High-Level Database

``` mermaid
erDiagram
USERS ||--o{ PROJECTS : owns
PROJECTS ||--o{ UPLOADS : contains
UPLOADS ||--o{ PARSED_CHUNKS : creates
PARSED_CHUNKS ||--o{ EMBEDDINGS : generates
PROJECTS ||--o{ CONVERSATIONS : has
CONVERSATIONS ||--o{ CHAT_MESSAGES : contains
```

------------------------------------------------------------------------

#  Technology Stack

  Layer       Technologies
  ----------- -------------------------------------------------
  Backend     FastAPI, Python
  Database    PostgreSQL, SQLAlchemy
  Vector DB   pgvector
  AI          Sentence Transformers, OpenAI Provider
  Storage     MinIO
  Cache       Redis
  Graph       Neo4j
  Frontend    Next.js, TypeScript, Tailwind CSS *(Sprint 12)*
  DevOps      Docker, Docker Compose
  Testing     Pytest, Ruff, MyPy, Import Linter

------------------------------------------------------------------------

#  Project Structure

``` text
MLCopilot-Platform
├── apps
│   ├── api
│   └── web
├── docs
│   ├── architecture
│   ├── api
│   ├── diagrams
│   └── images
├── docker-compose.yml
└── README.md
```

------------------------------------------------------------------------

#  API Overview

  Endpoint                      Description
  ----------------------------- ------------------
  POST /auth/register           Register a user
  POST /auth/login              Login
  POST /projects                Create project
  POST /projects/{id}/uploads   Upload documents
  POST /projects/{id}/search    Semantic search
  POST /projects/{id}/chat      RAG chat

------------------------------------------------------------------------

#  Getting Started

``` bash
git clone https://github.com/Urvity03/MLCopilot-Platform.git
cd MLCopilot-Platform
docker compose up -d
```

Backend:

``` bash
cd apps/api
uvicorn mlcopilot.main:app --reload
```

Swagger:

    http://localhost:8000/api/v1/docs

------------------------------------------------------------------------

#  Development

``` bash
ruff check src tests
mypy src
pytest
lint-imports
```

------------------------------------------------------------------------

#  Development Progress

  Module                   Status
  ----------------------- --------
  Backend Foundation         ✅
  Authentication             ✅
  RBAC                       ✅
  Project Management         ✅
  Knowledge Base             ✅
  Parsing                    ✅
  Chunking                   ✅
  Embeddings                 ✅
  Semantic Search            ✅
  RAG Backend                ✅
  Premium SaaS Frontend      🚧

------------------------------------------------------------------------

#  Screenshots

> Screenshots will be added after Sprint 12.

Suggested screenshots:

-   Dashboard
-   Project Workspace
-   Upload Manager
-   Knowledge Base
-   AI Chat
-   Mobile View

Create this folder:

``` text
docs/images/
```

Store:

``` text
dashboard.png
chat.png
knowledge-base.png
projects.png
upload.png
mobile-dashboard.png
mobile-chat.png
```

Reference images like:

``` md
![Dashboard](docs/images/dashboard.png)
```

------------------------------------------------------------------------

#  Roadmap

## Completed

-   Backend Foundation
-   Authentication
-   RBAC
-   Project Management
-   Knowledge Base
-   Document Parsing
-   Intelligent Chunking
-   Embedding Generation
-   Semantic Search
-   Retrieval-Augmented Generation

## Upcoming

-   Premium SaaS Frontend
-   Multi-model LLM Support
-   Knowledge Graph
-   Dataset Management
-   Experiment Tracking
-   Model Registry
-   Background Workers
-   Monitoring
-   CI/CD

------------------------------------------------------------------------

#  Release History

  -----------------------------------------------------------------------
  Version                             Highlights
  ----------------------------------- -----------------------------------
  **v0.1.0**                          Backend Foundation, Authentication,
                                      RBAC

  **v0.2.0**                          Knowledge Base, Parsing, Chunking,
                                      Embeddings, Semantic Search

  **v0.3.0**                          RAG Backend, Conversations,
                                      Streaming Chat, Citations
  -----------------------------------------------------------------------

------------------------------------------------------------------------

#  Contributing

Issues, ideas, and pull requests are welcome.

Please open an issue before proposing major architectural changes.

------------------------------------------------------------------------

#  Author

**Urvi Tyagi**

-   GitHub: https://github.com/Urvity03
-   LinkedIn: https://www.linkedin.com/in/urvi-tyagi-17b302286/

------------------------------------------------------------------------

#  License

This project is licensed under the MIT License.
