# About: blog-api-strapi

## Purpose
Strapi v5 headless CMS backend for the authenticated blog platform.

## Key Responsibilities
- Serve REST and GraphQL APIs for blog content
- Handle authentication (JWT, Apple, Google, Email+OTP)
- Manage content types: User, BlogPost, Category, Tag, Comment
- Role-based access control (Admin, Editor, Reader)

## Related Repos
- `blog-docs` — Architecture, ADRs, API spec
- `blog-infra-azure` — Terraform infrastructure
- `blog-web-nextjs` — Consumes this API
- `blog-mobile-ios-swiftui` — Consumes this API
- `blog-mobile-android-kotlin` — Consumes this API

## Key Files
- `src/api/` — Content type controllers and routes
- `src/middlewares/` — Authentication middleware
- `config/` — Database, server, auth configuration
- `.github/workflows/` — CI/CD pipelines

## Relevant ADRs
- ADR-002: JWT Authentication strategy
- ADR-003: Provider integration (Apple, Google, Email+OTP)
- ADR-004: Terraform Brick→Blueprint→Env (infra)

## API Specification
See `blog-docs/api-specs/authentication-api-v1.yaml`
