# MLCopilot Platform

> A production-oriented AI/ML platform for building, training, deploying, and managing machine learning applications using a Clean Architecture backend and a modern web frontend.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview

MLCopilot Platform is a full-stack AI/ML platform designed to provide a scalable foundation for managing machine learning workflows.

The backend follows **Clean Architecture**, separating business rules, infrastructure, and presentation layers to ensure maintainability, scalability, and testability.

The project is being developed incrementally through well-defined engineering milestones.

---

# Features

## Completed

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

## Planned

- Project Memory
- Dataset management
- Experiment tracking
- Model registry
- Training pipelines
- Inference service
- Deployment management
- Monitoring & observability
- Background jobs
- CI/CD pipeline
- Web dashboard

---

# Tech Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS

## Backend

- FastAPI
- Python
- SQLAlchemy
- PostgreSQL
- Alembic
- Pydantic
- PyJWT
- pwdlib (Argon2)

## DevOps

- Docker
- Docker Compose
- GitHub Actions (planned)

---

# Architecture

The backend follows **Clean Architecture**.

```text
Presentation
    │
    ▼
Application (Features / Services)
    │
    ▼
Domain
    │
    ▼
Infrastructure
```

Core principles:

- Domain-driven design
- Dependency inversion
- Repository pattern
- Service layer orchestration
- Database abstraction
- Stateless JWT authentication
- Role-Based Access Control

---

# Project Structure

```text
MLCopilot-Platform
│
├── apps
│   ├── api          # FastAPI backend
│   └── web          # Next.js frontend
│
├── packages
│   ├── config
│   ├── shared
│   └── ui
│
├── docs
│   └── architecture
│
└── docker
```

---

# Current Backend Progress

| Milestone | Status |
|-----------|--------|
| Infrastructure | ✅ |
| Database Foundation | ✅ |
| Repository Layer | ✅ |
| Authentication Service | ✅ |
| Authentication API | ✅ |
| Role-Based Access Control | ✅ |
| Project Memory | 🚧 |
| LLM Integration | ⏳ |
| Model Registry | ⏳ |
| Experiment Tracking | ⏳ |

---

# Getting Started

Clone the repository

```bash
git clone https://github.com/Urvity03/MLCopilot-Platform.git

cd MLCopilot-Platform
```

Install dependencies

```bash
npm install
```

Run the development environment

```bash
docker compose up -d
```

Run the backend

```bash
cd apps/api

uvicorn src.mlcopilot.main:app --reload
```

Run the frontend

```bash
cd apps/web

npm run dev
```

---

# Development

Backend quality gates

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
- [x] Repository layer
- [x] Authentication service
- [x] Authentication API
- [x] Role-Based Access Control
- [ ] Project Memory
- [ ] Knowledge Base
- [ ] LLM Integration
- [ ] Model Registry
- [ ] Experiment Tracking
- [ ] Dataset Management
- [ ] Training Pipelines
- [ ] Deployment Platform
- [ ] Monitoring & Observability
- [ ] CI/CD

---

# Author

**Urvi Tyagi**

- GitHub: https://github.com/Urvity03
- Repository: https://github.com/Urvity03/MLCopilot-Platform

---

# License

This project is licensed under the MIT License.
