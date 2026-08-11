# Security Policy

## Supported Versions

The following versions of the MLCopilot Platform are currently supported with security updates:

| Version / Branch | Supported          | Security Maintenance Status |
| ---------------- | ------------------ | --------------------------- |
| `main` / `v1.1.x` | :white_check_mark: | Active production support |
| `< 1.1.0`        | :x:                | Deprecated                  |

---

## Reporting a Vulnerability

We take the security of MLCopilot Platform seriously. If you believe you have found a security vulnerability, please report it responsibly.

### Responsible Disclosure Guidelines
- **Do NOT open a public GitHub issue** to report a security vulnerability.
- Please report vulnerabilities privately via **[GitHub Private Vulnerability Reporting](https://github.com/Urvity03/MLCopilot-Platform/security/advisories/new)** or by contacting the repository maintainer through GitHub (@Urvity03).
- Provide detailed steps to reproduce the vulnerability, including sample payloads, request headers, or affected API endpoints if applicable.
- Give the maintainer reasonable time to investigate, address, and patch the issue before making any public disclosure.

---

## Critical Security Practices & Credentials Policy

When deploying or contributing to MLCopilot Platform, adhere strictly to the following security rules:

1. **Never Publish API Keys**: Never commit `GEMINI_API_KEY`, `OPENAI_API_KEY`, or any cloud AI credentials to Git.
2. **Never Publish Database Credentials**: Keep `DATABASE_URL`, PostgreSQL passwords, and database connection strings restricted to local `.env` files or secret managers.
3. **Never Publish OAuth Secrets**: Keep `GOOGLE_CLIENT_SECRET` and `GITHUB_CLIENT_SECRET` out of version control.
4. **Never Publish JWT Secrets**: Always generate a cryptographically secure 64-character hex string for `JWT_SECRET` in production (`openssl rand -hex 32`).

---

## Security Automation & Scanning

This repository uses automated security checks on every pull request and push:
- **GitGuardian Security Scanning**: Automated detection of exposed API keys, tokens, and credentials.
- **Docker Container Verification**: Automated build and dependency isolation verification.
- **Dependency Audit**: Regular vulnerability scans of Python (`uv`) and Node.js (`pnpm`) dependencies.
