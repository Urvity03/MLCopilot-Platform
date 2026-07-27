# MLCopilot Platform — Production Deployment Guide

This guide provides step-by-step instructions for deploying MLCopilot to production environments using Docker Compose, container registries, or Kubernetes.

---

## 1. System Requirements

### Hardware Requirements
- **CPU**: 4 cores minimum (8 cores recommended for local Ollama inference)
- **RAM**: 16 GB minimum (32 GB recommended if running `llama3.1:8b` locally)
- **Disk**: 50 GB NVMe/SSD storage for database, vector indexes, and object storage

### Software Dependencies
- **Docker Engine**: v24.0+
- **Docker Compose**: v2.20+
- **Ollama**: v0.3.0+ (Installed locally or on an inference server)

---

## 2. Pre-Deployment Configuration

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-org/MLCopilot-Platform.git
   cd MLCopilot-Platform
   ```

2. **Setup Production Environment Variables**:
   Copy the example production environment file:
   ```bash
   cp production.env.example .env
   ```

3. **Generate Secure Secrets**:
   Generate a 64-character JWT secret key:
   ```bash
   openssl rand -hex 32
   ```
   Update `JWT_SECRET_KEY` and `POSTGRES_PASSWORD` in `.env`.

---

## 3. Production Deployment with Docker Compose

Run the entire platform stack in production mode:

```bash
docker compose -f docker-compose.yml up -d --build
```

### Stack Components:
- **`web`**: Next.js Frontend (Port `3000`)
- **`api`**: FastAPI Backend (Port `8000`)
- **`postgres`**: PostgreSQL 16 + `pgvector` extension (Port `5432`)
- **`redis`**: Redis 7 Cache & Task Broker (Port `6379`)
- **`minio`**: Object Storage for document uploads (Ports `9000`, `9001`)

---

## 4. Verification & Health Probes

Verify that all service health checks pass:

- **Liveness Probe**:
  ```bash
  curl -s http://localhost:8000/api/v1/health/live
  ```
  *Expected Output*: `{"status":"ok"}`

- **Readiness Probe**:
  ```bash
  curl -s http://localhost:8000/api/v1/health/ready
  ```
  *Expected Output*: `{"status":"ok","checks":{"database":"ok","redis":"ok","storage":"ok"}}`

- **LLM Provider Probe**:
  ```bash
  curl -s http://localhost:8000/api/v1/health/llm
  ```
  *Expected Output*: `{"provider":"ollama","model":"llama3.1:8b","display_name":"Ollama • llama3.1:8b","status":"healthy"}`

---

## 5. SSL & Nginx Reverse Proxy Setup

Recommended Nginx configuration for SSL termination and SSE streaming support:

```nginx
server {
    listen 443 ssl http2;
    server_name mlcopilot.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/mlcopilot.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mlcopilot.yourdomain.com/privkey.pem;

    # Frontend Next.js Proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API & SSE Stream Proxy
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # SSE Streaming headers
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding on;
    }
}
```

---

## 6. Maintenance & Backups

- **Database Backup**:
  ```bash
  docker compose exec postgres pg_dump -U mlcopilot mlcopilot_db > backup_$(date +%F).sql
  ```

- **Logs Inspection**:
  ```bash
  docker compose logs -f api
  ```
