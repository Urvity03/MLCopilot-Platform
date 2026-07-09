# MLCopilot Platform

> A production-oriented AI/ML platform for building intelligent machine learning applications with a Clean Architecture backend, scalable infrastructure, and an extensible AI knowledge platform.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED)
![License](https://img.shields.io/badge/License-MIT-green)

---

# Overview

MLCopilot Platform is a production-oriented AI/ML platform designed to provide a scalable foundation for managing machine learning projects, datasets, knowledge bases, and AI-powered workflows.

The backend follows **Clean Architecture**, separating business rules, infrastructure, and presentation layers for maintainability, scalability, and testability.

The project is being built incrementally through engineering sprints, with each sprint introducing production-ready functionality.

---

# Features

##  Completed

### Core Infrastructure

- Monorepo architecture
- FastAPI backend foundation
- Configuration management
- Docker development environment
- Docker Compose orchestration
- Clean Architecture implementation

### Database

- PostgreSQL integration
- SQLAlchemy ORM
- Alembic migrations
- Repository pattern

### Authentication & Security

- User registration & login
- JWT authentication
- Refresh token rotation
- API Key authentication
- Swagger Authorize support
- Password hashing (Argon2)
- Role-Based Access Control (RBAC)

### Project Management

- Project workspaces
- Project membership management
- Ownership transfer
- Permission enforcement

### Knowledge Base

- Project Memory
- Knowledge Base Upload API
- MinIO object storage
- File upload management
- Docker MinIO bootstrap

### Engineering

- Unit testing with Pytest
- Static typing with MyPy
- Ruff linting
- Import Linter architecture validation

---

##  In Progress

- Document parsing
- Text chunking
- Embedding generation

---

##  Planned

- Semantic search
- RAG pipeline
- LLM integration
- Knowledge Graph
- Dataset management
- Experiment tracking
- Model registry
- Training pipelines
- Inference service
- Deployment management
- Monitoring & observability
- Background jobs
- CI/CD

---

# Tech Stack

## Backend

- FastAPI
- Python 3.12
- SQLAlchemy
- PostgreSQL
- Alembic
- Pydantic
- Redis
- Neo4j
- MinIO
- PyJWT
- pwdlib (Argon2)

## Frontend

- Next.js
- TypeScript
- Tailwind CSS

## Infrastructure

- Docker
- Docker Compose

## Quality

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
Infrastructure (Database, Storage, Security)
```

Core principles:

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
│   │   ├── src
│   │   ├── tests
│   │   └── alembic
│   │
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

# Current Backend Progress

| Module | Status |
|---------|--------|
| Infrastructure | ✅ Complete |
| Database Foundation | ✅ Complete |
| Repository Layer | ✅ Complete |
| Authentication | ✅ Complete |
| JWT & API Keys | ✅ Complete |
| RBAC | ✅ Complete |
| Project Management | ✅ Complete |
| Project Memory | ✅ Complete |
| Knowledge Base Uploads | ✅ Complete |
| Document Parsing | 🚧 In Progress |
| Embeddings | ⏳ Planned |
| Semantic Search | ⏳ Planned |
| RAG Chat | ⏳ Planned |

---

# Getting Started

## Clone the repository

```bash
git clone https://github.com/Urvity03/MLCopilot-Platform.git

cd MLCopilot-Platform
```

---

## Start the development environment

```bash
docker compose up -d
```

---

## Run the backend

```bash
cd apps/api

uvicorn mlcopilot.main:app --reload
```

Swagger UI:

```
http://localhost:8000/api/v1/docs
```

---

## Run the frontend

```bash
cd apps/web

npm install

npm run dev
```

---

# Development

Run all backend quality checks:

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
- [x] Configuration system
- [x] Database architecture
- [x] Repository pattern
- [x] Authentication
- [x] JWT & Refresh Tokens
- [x] API Keys
- [x] Role-Based Access Control
- [x] Project Management
- [x] Project Memory
- [x] Knowledge Base Uploads
- [ ] Document Parsing
- [ ] Text Chunking
- [ ] Embedding Generation
- [ ] Semantic Search
- [ ] RAG Chat
- [ ] Knowledge Graph
- [ ] Model Registry
- [ ] Experiment Tracking
- [ ] Dataset Management
- [ ] Training Pipelines
- [ ] Deployment Platform
- [ ] Monitoring
- [ ] CI/CD

---

# Current Status

**Current Sprint:** Sprint 9 – Document Parsing & Chunking

The platform now supports:

- User authentication
- Project workspaces
- RBAC
- Project Memory
- Knowledge Base uploads
- Object storage via MinIO

The next milestone is transforming uploaded documents into searchable knowledge through parsing, chunking, and embeddings.

---

# Author

**Urvi Tyagi**

- GitHub: https://github.com/Urvity03
- LinkedIn: https://www.linkedin.com/in/urvi-tyagi-17b302286/
- Repository: https://github.com/Urvity03/MLCopilot-Platform

---

# License

This project is licensed under the MIT License.
