# MLCopilot Platform

> A production-oriented AI/ML platform for managing machine learning projects, knowledge bases, and AI-powered workflows using a Clean Architecture backend and modern cloud-native infrastructure.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview

MLCopilot Platform is a full-stack AI/ML platform designed to provide a scalable foundation for building intelligent applications. The project emphasizes maintainability, extensibility, and production-ready engineering practices through a Clean Architecture design.

The platform is being developed incrementally, with each milestone introducing production-quality functionality.

---

## System Architecture

```text
                           Client
                              │
                              ▼
            +--------------------------------+
            | Next.js Frontend (Planned)     |
            +--------------------------------+
                              │
                              ▼
            +--------------------------------+
            |        FastAPI Backend         |
            +--------------------------------+
                 │           │           │
                 ▼           ▼           ▼
        +-------------+ +---------+ +---------+
        | PostgreSQL  | |  Redis  | | Neo4j   |
        +-------------+ +---------+ +---------+
               │
               ▼
        +-------------+
        |    MinIO    |
        +-------------+
```
---

<<<<<<< HEAD
- ✅ Monorepo architecture
- ✅ FastAPI backend foundation
- ✅ Configuration management
- ✅ PostgreSQL integration
- ✅ SQLAlchemy ORM
- ✅ Alembic migrations
- ✅ Repository layer
- ✅ Authentication service
- ✅ JWT authentication
- ✅ Refresh token rotation
- ✅ API key authentication
- ✅ Authentication REST API
- ✅ Role-Based Access Control (RBAC)
- ✅ Project & membership management
- ✅ Clean Architecture implementation
- ✅ Docker development environment
- ✅ Document upload & processing (PDF, DOCX, Markdown, TXT)
- ✅ Intelligent text parsing & chunking (Sprint 9)
- ✅ Vector embedding generation (Sentence Transformers: `all-MiniLM-L6-v2`)
- ✅ Semantic similarity search with pgvector (HNSW cosine distance index)
- ✅ Project tenant isolation & RBAC-enforced retrieval
=======
## Features


### Completed

=======
#### Platform Foundation

- Monorepo architecture
- FastAPI backend
- Configuration management
- Docker development environment
- Docker Compose orchestration
- Clean Architecture

#### Database

- PostgreSQL integration
- SQLAlchemy ORM
- Alembic migrations
- Repository pattern

#### Authentication & Authorization

- User registration and login
- JWT authentication
- Refresh token rotation
- API key authentication
- OpenAPI/Swagger authorization
- Argon2 password hashing
- Role-Based Access Control (RBAC)

#### Project Management

- Project workspaces
- Membership management
- Ownership transfer
- Permission enforcement

#### Knowledge Base

- Project memory
- Knowledge base uploads
- MinIO object storage
- Upload management

#### Engineering Quality

- Unit testing with Pytest
- Static type checking with MyPy
- Ruff linting
- Import Linter architecture validation

---

### In Progress

- Document parsing
- Text chunking
- Embedding generation

---

### Planned

- Semantic search
- Retrieval-Augmented Generation (RAG)
- Knowledge graph
- LLM integration
>>>>>>> main
- Dataset management
- Experiment tracking
- Model registry
- Training pipelines
- Deployment management
- Monitoring and observability
- Background jobs
- CI/CD

---

## Technology Stack

### Backend

- Python 3.12
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic
- Redis
- Neo4j
- MinIO
- Pydantic
- PyJWT
- pwdlib (Argon2)

### Frontend

- Next.js
- TypeScript
- Tailwind CSS

<<<<<<< HEAD
## Backend

- FastAPI
- Python
- SQLAlchemy
- PostgreSQL (with **pgvector** extension)
- Sentence Transformers (HNSW Cosine Distance Index)
- Alembic
- Pydantic
- PyJWT
- pwdlib (Argon2)

## DevOps
=======
### Infrastructure
>>>>>>> main

- Docker
- Docker Compose

### Quality Assurance

- Pytest
- Ruff
- MyPy
- Import Linter

---

## Architecture

The backend follows Clean Architecture principles.

```text
Presentation (FastAPI)
          │
          ▼
Application (Features / Services)
          │
          ▼
Domain (Business Rules)
          │
          ▼
Infrastructure
(Database • Storage • Security • External Services)
```

### Design Principles

<<<<<<< HEAD
- Domain-driven design (DDD)
- Dependency inversion (Clean Architecture boundaries)
- Repository pattern (decoupled DB models and repository queries)
- Service layer orchestration
- Pluggable embedding providers (`EmbeddingProvider` protocol)
- Vector indexing (HNSW cosine distance index for pgvector)
- Database abstraction (SQLAlchemy ORM + Alembic migrations)
- Stateless JWT authentication & Refresh token rotation
- Role-Based Access Control (RBAC) & Tenant isolation
=======
- Clean Architecture
- Domain-Driven Design
- Dependency Inversion
- Repository Pattern
- Service Layer
- Stateless JWT Authentication
- Role-Based Access Control
- Infrastructure Isolation
>>>>>>> main

---

## Project Structure

```text
MLCopilot-Platform
│
├── apps
│   ├── api
│   └── web
│
├── docs
│   └── architecture
│
├── docker-compose.yml
│
└── README.md
```

---

## Development Progress

| Module | Status |
|---------|--------|
| Infrastructure | Complete |
| Database Foundation | Complete |
| Repository Layer | Complete |
| Authentication | Complete |
| JWT & API Keys | Complete |
| RBAC | Complete |
| Project Management | Complete |
| Project Memory | Complete |
| Knowledge Base Uploads | Complete |
| Document Parsing | In Progress |
| Embeddings | Planned |
| Semantic Search | Planned |
| RAG Chat | Planned |

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/Urvity03/MLCopilot-Platform.git

cd MLCopilot-Platform
```

### Start the development environment

```bash
docker compose up -d
```

### Run the backend

```bash
cd apps/api

uvicorn mlcopilot.main:app --reload
```

API Documentation:

```
http://localhost:8000/api/v1/docs
```

### Run the frontend

```bash
cd apps/web

npm install

npm run dev
```

---

## Development

Run the complete backend quality suite:

```bash
ruff check src tests

mypy src

pytest

lint-imports
```

---

## Roadmap

- [x] Monorepo setup
- [x] Backend foundation
- [x] Configuration system
- [x] Database architecture
- [x] Repository layer
- [x] Authentication
- [x] JWT authentication
- [x] API key authentication
- [x] Role-Based Access Control
<<<<<<< HEAD
- [x] Document Parsing & Intelligent Chunking (Sprint 9)
- [x] Semantic Search & pgvector Embedding Generation (Sprint 10)
- [ ] LLM Integration
- [ ] Model Registry
- [ ] Experiment Tracking
- [ ] Dataset Management
- [ ] Training Pipelines
- [ ] Deployment Platform
- [ ] Monitoring & Observability
=======
- [x] Project management
- [x] Project memory
- [x] Knowledge base uploads
- [ ] Document parsing
- [ ] Text chunking
- [ ] Embedding generation
- [ ] Semantic search
- [ ] Retrieval-Augmented Generation
- [ ] Knowledge graph
- [ ] Model registry
- [ ] Experiment tracking
- [ ] Dataset management
- [ ] Training pipelines
- [ ] Deployment platform
- [ ] Monitoring and observability
>>>>>>> main
- [ ] CI/CD

---

## Current Development Focus

The platform currently supports authentication, project workspaces, role-based access control, project memory, and knowledge base uploads backed by MinIO object storage.

The next milestone focuses on document parsing, text chunking, and embedding generation to enable semantic search and Retrieval-Augmented Generation workflows.

---

## Author

**Urvi Tyagi**

GitHub: https://github.com/Urvity03

LinkedIn: https://www.linkedin.com/in/urvi-tyagi-17b302286/

Repository: https://github.com/Urvity03/MLCopilot-Platform

---

## License

This project is licensed under the MIT License.
