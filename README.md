# MLCopilot Platform

> A production-oriented AI/ML platform for managing machine learning projects, knowledge bases, and AI-powered workflows using a Clean Architecture backend and modern cloud-native infrastructure.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED)
![License](https://img.shields.io/badge/License-MIT-green)

---

# Overview

MLCopilot Platform is a full-stack AI/ML platform designed to provide a scalable foundation for building intelligent AI applications.

The backend follows **Clean Architecture**, emphasizing maintainability, extensibility, and production-ready engineering practices.

The platform is being developed incrementally through engineering sprints, with each milestone introducing production-ready capabilities.

---

# System Architecture

```text
                           Client
                              │
                              ▼
               +-----------------------------+
               | Next.js Frontend (Planned)  |
               +-----------------------------+
                              │
                              ▼
               +-----------------------------+
               |      FastAPI Backend        |
               +-----------------------------+
                    │      │       │
                    ▼      ▼       ▼
             PostgreSQL  Redis   Neo4j
                    │
                    ▼
                 pgvector
                    │
                    ▼
                 MinIO (S3)
```

---

# Features

## Completed

### Platform Foundation

- Monorepo architecture
- FastAPI backend
- Configuration management
- Docker development environment
- Docker Compose orchestration
- Clean Architecture

### Database

- PostgreSQL integration
- SQLAlchemy ORM
- Alembic migrations
- Repository pattern
- pgvector integration

### Authentication & Authorization

- User registration
- JWT authentication
- Refresh token rotation
- API key authentication
- Swagger/OpenAPI authorization
- Argon2 password hashing
- Role-Based Access Control (RBAC)

### Project Management

- Project workspaces
- Membership management
- Ownership transfer
- Permission enforcement

### Knowledge Base

- Project memory
- Knowledge base uploads
- MinIO object storage
- Upload lifecycle management
- PDF parsing
- DOCX parsing
- Markdown parsing
- Plain text parsing
- Intelligent document chunking

### AI Features

- Sentence Transformer embeddings
- Background embedding generation
- pgvector vector storage
- HNSW vector indexing
- Semantic similarity search
- Tenant-isolated retrieval

### Engineering Quality

- Pytest unit testing
- MyPy static type checking
- Ruff linting
- Import Linter architecture validation

---

## In Progress

- Retrieval-Augmented Generation (RAG)
- Conversation memory

---

## Planned

- Multi-model LLM support
- Knowledge graph
- Dataset management
- Experiment tracking
- Model registry
- Training pipelines
- Deployment management
- Monitoring & observability
- Background workers (Celery)
- CI/CD pipeline
- Web dashboard

---

# Technology Stack

## Backend

- Python 3.12
- FastAPI
- SQLAlchemy
- PostgreSQL
- pgvector
- Alembic
- Redis
- Neo4j
- MinIO
- Sentence Transformers
- Pydantic
- PyJWT
- pwdlib (Argon2)

## Frontend

- Next.js
- TypeScript
- Tailwind CSS

## Infrastructure

- Docker
- Docker Compose

## Quality Assurance

- Pytest
- Ruff
- MyPy
- Import Linter

---

# Architecture

The backend follows **Clean Architecture**.

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
(Database • Storage • Embeddings • External Services)
```

## Design Principles

- Clean Architecture
- Domain-Driven Design
- Dependency Inversion
- Repository Pattern
- Service Layer
- Stateless JWT Authentication
- Role-Based Access Control
- Infrastructure Isolation

---

# Project Structure

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

# Development Progress

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
| Document Parsing | Complete |
| Intelligent Chunking | Complete |
| Vector Embeddings | Complete |
| Semantic Search | Complete |
| RAG Chat | In Progress |

---

# Knowledge Base Pipeline

```text
Upload
   │
   ▼
Store in MinIO
   │
   ▼
Parse Document
   │
   ▼
Chunk Text
   │
   ▼
Generate Embeddings
   │
   ▼
Store in pgvector
   │
   ▼
Semantic Search
```

---

# Supported Document Types

| Format | Status |
|----------|--------|
| PDF | Supported |
| DOCX | Supported |
| Markdown | Supported |
| TXT | Supported |

---

# Getting Started

## Clone the repository

```bash
git clone https://github.com/Urvity03/MLCopilot-Platform.git

cd MLCopilot-Platform
```

## Start the development environment

```bash
docker compose up -d
```

## Run the backend

```bash
cd apps/api

uvicorn mlcopilot.main:app --reload
```

API Documentation

```
http://localhost:8000/api/v1/docs
```

## Run the frontend

```bash
cd apps/web

npm install

npm run dev
```

---

# Development

Run the backend quality suite:

```bash
ruff check src tests

mypy src

pytest

lint-imports
```

---

# Roadmap

- [x] Monorepo setup
- [x] Backend foundation
- [x] Database architecture
- [x] Repository layer
- [x] Authentication
- [x] JWT authentication
- [x] API key authentication
- [x] Role-Based Access Control
- [x] Project management
- [x] Project memory
- [x] Knowledge base uploads
- [x] Document parsing
- [x] Intelligent chunking
- [x] Embedding generation
- [x] Semantic search
- [ ] Retrieval-Augmented Generation
- [ ] Conversation memory
- [ ] Multi-model LLM support
- [ ] Knowledge graph
- [ ] Model registry
- [ ] Experiment tracking
- [ ] Dataset management
- [ ] Training pipelines
- [ ] Deployment platform
- [ ] Monitoring & observability
- [ ] Background workers
- [ ] CI/CD

---

# Current Development Focus

The platform currently supports authentication, project workspaces, role-based access control, document ingestion, intelligent parsing, vector embedding generation, and semantic search.

The next milestone focuses on Retrieval-Augmented Generation (RAG), conversation memory, and LLM integration.

---

# Author

**Urvi Tyagi**

GitHub: https://github.com/Urvity03

LinkedIn: https://www.linkedin.com/in/urvi-tyagi-17b302286/

Repository: https://github.com/Urvity03/MLCopilot-Platform

---

# License

This project is licensed under the MIT License.
