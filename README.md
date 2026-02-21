# blog-api-strapi

Strapi CMS backend for the **Authenticated Blog Platform**.

## Overview

This repository contains the Strapi v5 headless CMS that powers the blog platform API. It handles:
- Authentication (JWT, Apple Sign-In, Google Sign-In, Email+OTP)
- Content management (Blog posts, Categories, Tags, Comments)
- REST and GraphQL API endpoints
- Role-based access control

## Tech Stack

| Layer | Technology |
|---|---|
| CMS | Strapi v5 |
| Database | PostgreSQL 16 |
| Runtime | Node.js 20 LTS |
| Container | Docker |
| Cloud | Azure Container Apps |

## Prerequisites

- Node.js 20 LTS (`nvm use 20`)
- Docker Desktop
- PostgreSQL 16 (or use Docker Compose)
- Azure CLI (for deployment)

## Installation

```bash
# Clone
git clone https://github.com/learn-claude/blog-api-strapi.git
cd blog-api-strapi

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your values

# Start database (Docker)
docker compose up -d db

# Run migrations and start
npm run develop
```

## Usage

- Admin panel: http://localhost:1337/admin
- REST API: http://localhost:1337/api
- API docs: http://localhost:1337/documentation

## Development

```bash
# Start in development mode
npm run develop

# Run tests
npm test

# Lint
npm run lint

# Build for production
npm run build
```

## Deployment

Deployed to Azure Container Apps via GitHub Actions.
See `docs/DEPLOYMENT.md` for step-by-step guide.

Infrastructure managed in [`blog-infra-azure`](https://github.com/learn-claude/blog-infra-azure).

## Architecture

- [Authentication HLD](https://github.com/learn-claude/blog-docs/blob/main/architecture/authentication-hld.md)
- [ADR-002: JWT Authentication](https://github.com/learn-claude/blog-docs/blob/main/adrs/ADR-002-jwt-authentication.md)
- [ADR-003: Provider Integration](https://github.com/learn-claude/blog-docs/blob/main/adrs/ADR-003-provider-integration.md)
- [API Specification](https://github.com/learn-claude/blog-docs/blob/main/api-specs/authentication-api-v1.yaml)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
