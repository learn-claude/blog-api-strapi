# Contributing to blog-api-strapi

## Branching Strategy

- `main` — production-ready, protected (PR only)
- `develop` — integration branch
- Feature branches: `feat/<description>`
- Bug fixes: `fix/<description>`

## Workflow

1. Create a feature branch from `main`
2. Make changes with clear commit messages (Conventional Commits)
3. Open a PR — fill out the PR template
4. Pass CI checks (lint, test, build)
5. Get approval and squash merge

## Commit Convention

```
feat(auth): add Apple Sign-In support
fix(jwt): handle expired token edge case
docs(api): update authentication endpoint docs
test(auth): add unit tests for token refresh
```

## Local Setup

See [README.md](./README.md) for installation instructions.

## Code Style

- ESLint + Prettier enforced
- Run `npm run lint` before committing
- TypeScript strict mode enabled

## Questions?

Open a GitHub issue or check [blog-docs](https://github.com/learn-claude/blog-docs).
