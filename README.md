# MLCopilot Platform

> **Production-ready AI Knowledge Platform** built with **FastAPI**,
> **PostgreSQL**, **pgvector**, **Retrieval-Augmented Generation
> (RAG)**, and **Clean Architecture**.

![Python](https://img.shields.io/badge/Python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED)
![License](https://img.shields.io/badge/License-MIT-green)

------------------------------------------------------------------------

## Overview

MLCopilot Platform is an AI knowledge platform for building searchable
knowledge bases and Retrieval-Augmented Generation (RAG) applications.
It follows Clean Architecture and emphasizes maintainability,
scalability, and production-ready engineering.

## Features

### Platform

-   Clean Architecture
-   Docker Compose development
-   Configuration management
-   Monorepo structure

### Authentication

-   JWT Authentication
-   Refresh Token Rotation
-   API Keys
-   RBAC

### Knowledge Base

-   PDF, DOCX, Markdown & TXT parsing
-   Intelligent chunking
-   MinIO storage

### AI

-   Sentence Transformer embeddings
-   pgvector
-   HNSW indexing
-   Semantic search
-   RAG
-   Streaming chat
-   Citations

### Engineering

-   Pytest
-   Ruff
-   MyPy
-   Import Linter

## Architecture

``` mermaid
flowchart TD
A[FastAPI]-->B[Application]
B-->C[Domain]
C-->D[Infrastructure]
```

## Knowledge Base Pipeline

``` mermaid
flowchart LR
Upload-->MinIO-->Parser-->Chunking-->Embeddings-->pgvector
```

## RAG Pipeline

``` mermaid
flowchart LR
Question-->Embedding-->Search-->Prompt-->LLM-->Streaming-->Answer
```

## Tech Stack

  Layer       Technologies
  ----------- -------------------------------
  Backend     FastAPI, Python
  Database    PostgreSQL, SQLAlchemy
  Vector DB   pgvector
  AI          Sentence Transformers, OpenAI
  Storage     MinIO
  Cache       Redis
  Graph       Neo4j
  Frontend    Next.js (planned)

## API

-   POST /auth/register
-   POST /auth/login
-   POST /projects
-   POST /projects/{id}/uploads
-   POST /projects/{id}/search
-   POST /projects/{id}/chat

## Development

``` bash
ruff check src tests
mypy src
pytest
lint-imports
```

## Screenshots

Screenshots will be added after Sprint 12.

## Roadmap

### Completed

-   Backend Foundation
-   Authentication
-   RBAC
-   Knowledge Base
-   Embeddings
-   Semantic Search
-   RAG Backend

### Planned

-   Premium SaaS Frontend
-   Multi-model LLM
-   Knowledge Graph
-   CI/CD

## Release History

  Version   Highlights
  --------- ----------------------------------
  v0.1.0    Backend foundation
  v0.2.0    Knowledge Base & Semantic Search
  v0.3.0    RAG Backend

## Author

**Urvi Tyagi**

GitHub: https://github.com/Urvity03

LinkedIn: https://www.linkedin.com/in/urvi-tyagi-17b302286/

## License

MIT
