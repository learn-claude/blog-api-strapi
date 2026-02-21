# Global Rules for All AI Agents

**Version:** 0.3  
**Last Updated:** 2026-02-21  
**Applies To:** ALL agents (BA, PM, Architect, Dev, QA, DevOps)

---

## Language Policy

### Code, Documentation, Technical Artifacts
- **Language:** English
- **Applies to:**
  - All code (variables, functions, classes, comments)
  - All documentation (README, API specs, ADRs)
  - All commit messages
  - All PR descriptions
  - All inline comments

### Communication with Human
- **Language:** Hungarian
- **Applies to:**
  - Chat responses
  - Status updates
  - Questions for clarification

---

## Core Principles

### 1. Clarity Over Cleverness
- Write self-documenting code
- Use meaningful names (no single-letter variables except in short loops)
- Prefer explicit over implicit
- Avoid premature optimization

### 2. Testability
- Write code that is easy to test
- Separate concerns (business logic from infrastructure)
- Use dependency injection
- Mock external dependencies

### 3. Maintainability
- Follow DRY (Don't Repeat Yourself)
- Keep functions small (< 50 lines ideal)
- Single Responsibility Principle
- Comment "why", not "what"

### 4. Security by Default
- Never hardcode secrets
- Validate all inputs
- Use parameterized queries (prevent SQL injection)
- Follow OWASP guidelines

---

## Output Quality Standards

### Specificity
- ❌ "There's a bug in the auth system"
- ✅ "The JWT validation in `src/middleware/auth.ts:42` fails when token is expired"

### Examples
- Always provide examples when suggesting patterns
- Show "before" and "after" code in refactoring suggestions

### Trade-offs
- Explain why you chose one approach over another
- Mention alternatives considered

### Citations
- Reference files with `file:line` format
- Link to external documentation when relevant
- Cite architecture docs when making design decisions

---

## Code Style

### Naming Conventions

#### Variables & Functions
- **camelCase**: JavaScript, TypeScript, Swift, Kotlin
- **snake_case**: Python, SQL
- **PascalCase**: Classes, Interfaces, Types

#### Constants
- **UPPER_SNAKE_CASE**: All languages

#### Files
- **kebab-case**: Configuration files, scripts
- **PascalCase**: Components (React, SwiftUI)
- **lowercase**: Package names (Kotlin)

### Code Structure

#### Imports
Organize by:
1. Standard library
2. Third-party libraries
3. Internal modules

Example (TypeScript):
```typescript
// Standard library
import { readFile } from 'fs/promises';

// Third-party
import express from 'express';
import jwt from 'jsonwebtoken';

// Internal
import { UserRepository } from '@/repositories/user';
import { logger } from '@/utils/logger';
```

#### Error Handling
- Always handle errors explicitly
- Use try-catch for async operations
- Return meaningful error messages
- Log errors with context

Example:
```typescript
try {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new NotFoundError(`User ${id} not found`);
  }
  return user;
} catch (error) {
  logger.error('Failed to fetch user', { userId: id, error });
  throw error;
}
```

---

## Testing Philosophy

### Test Pyramid
- **70%** Unit tests (fast, isolated)
- **20%** Integration tests (components together)
- **10%** End-to-end tests (full system)

### TDD (Test-Driven Development)
1. Write failing test
2. Write minimal code to pass
3. Refactor

### Test Naming
Use descriptive names:
- ❌ `test1()`
- ✅ `shouldReturnUserWhenValidIdProvided()`

### Coverage Target
- Minimum: **80%** overall
- Critical paths: **100%**

---

## Documentation Standards

### README Structure
Every repository must have:
```
# Repository Name

## Overview
[One paragraph description]

## Prerequisites
[Required software/tools]

## Installation
[Step-by-step setup]

## Usage
[Basic examples]

## Development
[How to run tests, linters, etc.]

## Deployment
[How to deploy]

## Contributing
[Link to CONTRIBUTING.md]

## License
[License info]
```

### Inline Comments
- Comment complex logic
- Explain "why" decisions were made
- Document edge cases
- Add TODOs with context

Example:
```typescript
// HACK: Workaround for Strapi bug #1234
// Remove when upgrading to v5
if (user.role === null) {
  user.role = 'authenticated';
}
```

---

## Git Practices

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):

Format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change without adding feature or fixing bug
- `docs`: Documentation only
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

Example:
```
feat(auth): add email OTP authentication

Implement passwordless login using one-time passwords sent via email.
Users can now authenticate without storing passwords in the database.

Closes #42
```

### Branch Naming
Format: `<type>/<short-description>`

Examples:
- `feat/email-otp-login`
- `fix/jwt-expiration-bug`
- `refactor/auth-middleware`

### Pull Requests
- One PR per feature/fix
- Keep PRs small (< 400 lines ideal)
- Write descriptive titles
- Fill out PR template
- Link related issues

---

## Anti-Patterns to Avoid

### 1. God Objects
- ❌ One class/module does everything
- ✅ Split responsibilities

### 2. Magic Numbers
- ❌ `if (status === 3)`
- ✅ `if (status === OrderStatus.SHIPPED)`

### 3. Premature Abstraction
- ❌ Creating abstractions before patterns emerge
- ✅ Wait until duplication appears 3+ times

### 4. Over-Engineering
- ❌ Complex design patterns for simple problems
- ✅ Start simple, refactor when needed

---

## Agent-Specific Constraints

### When Uncertain
- **DO:** Ask for clarification
- **DON'T:** Make up facts or hallucinate dependencies

### When Multiple Options Exist
- **DO:** Present options with trade-offs
- **DON'T:** Arbitrarily pick one without explanation

### When Generating Code
- **DO:** Include tests
- **DON'T:** Generate code without considering testability

### When Reviewing Code
- **DO:** Be constructive and specific
- **DON'T:** Give vague feedback like "this looks wrong"

---

## Jira Workflow Integration

**Rule: Every agent must keep Jira in sync with actual work — not just documentation.**

### Ticket Status Movement

Move Jira issues on the board when status changes:

| Situation | Move ticket to |
|---|---|
| You start working on a story | **In Progress** |
| Work is done, waiting for review | **In Review** |
| PR merged / task completed | **Done** |
| Blocked by something | Add `blocked` label + comment |

### Commenting on Tickets

Add a comment to the Jira issue when:
- Work starts: "Starting implementation. PR will follow."
- PR is created: link to PR + one-line summary
- Blocker is found: describe the blocker and expected resolution
- Task is done: link to merged PR + Confluence page

### New Task Protocol

When any agent identifies a new task during work:
1. Create a Jira issue in project `CL` (Story or Task type)
2. Add to the relevant sprint's backlog or the general backlog
3. Link to relevant Confluence page (if exists)
4. Report it as: `🆕 New task created: CL-NN — [title]`

Only the **PM agent** organizes backlog items into sprints, on explicit instruction from the Instructor.

### Sprint Organization Protocol

Sprints are managed by the **Instructor** (the AI in orchestration mode), not agents autonomously:

1. **Instructor signals** → "PM agent: please groom backlog and plan Sprint N"
2. **PM agent** → reviews backlog, proposes sprint scope, velocity, goal
3. **Instructor confirms** → approves or adjusts sprint plan
4. **Human action required** → Start sprint in Jira (button click)

### 🔔 Atlassian Action Flag Format

Whenever a step requires a human action in Jira or Confluence, output this callout:

```
🔔 ATLASSIAN ACTION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform : Jira / Confluence
Action   : [what to do, e.g. "Start Sprint 1"]
Where    : [URL or navigation: Projects > CL > Backlog > Sprint 1 > ▶ Start]
Why      : [one sentence reason]
━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This flag is **mandatory** for every step that requires a human click in Atlassian tools.  
Examples: Start sprint, Complete sprint, Approve PR, Merge PR, Enable feature flag.

---

## Documentation Sync Protocol

**Rule: Documentation is always dual-homed — markdown in repo AND Confluence.**

### When to sync
- At the end of every working session (day)
- After every PR merge that changes documentation
- After every agent produces a new artifact

### What to sync
| Repo file | Confluence page |
|---|---|
| `requirements/*.md` | CLAUDELEARN › Requirements |
| `planning/*.md` | CLAUDELEARN › Planning |
| `architecture/*.md` | CLAUDELEARN › Architecture |
| `adrs/*.md` | CLAUDELEARN › ADRs |
| `api-specs/*.yaml` | CLAUDELEARN › API Specs |
| `ROADMAP_WEEK_1_2.md` | CLAUDELEARN › (root) |

### Sync checklist (mandatory for every agent at session end)
- [ ] New or changed markdown files committed and pushed to `main` (via PR)
- [ ] Corresponding Confluence page updated (create if new, update if existing)
- [ ] `ROADMAP_WEEK_1_2.md` updated: mark completed tasks, add notes
- [ ] Jira issue status updated if work completed (e.g. move to Done)

### Confluence page update command
To update a Confluence page from a markdown file:
```
Load `.claude/prompts/doc-sync.md`
Update Confluence page: [PAGE_TITLE]
From file: [RELATIVE_PATH]
```

### Direction
- **Markdown → Confluence** (always; code is source of truth)
- Never edit Confluence directly — edit the `.md` file and sync

---

## Quality Gates

Before marking any task as complete, verify:
- [ ] Code follows style guide
- [ ] Tests are written and passing
- [ ] Documentation is updated in repo AND Confluence
- [ ] No secrets in code
- [ ] Error handling is present
- [ ] Linter passes
- [ ] Type checks pass (if applicable)
- [ ] ROADMAP_WEEK_1_2.md reflects current state

---

## Continuous Improvement

### Feedback Loop
- Track common issues
- Update rules quarterly
- Document new patterns in examples/

### Rule Violations
When you notice a violation:
1. Flag it immediately
2. Suggest correction
3. Reference this document

---

## Appendix

### Recommended Tools
- **Linters:** ESLint (JS/TS), SwiftLint (Swift), ktlint (Kotlin)
- **Formatters:** Prettier (JS/TS), SwiftFormat (Swift), ktfmt (Kotlin)
- **Type Checkers:** TypeScript, mypy (Python)

### External References
- [Clean Code (Robert Martin)](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Effective TypeScript](https://effectivetypescript.com/)
- [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/)
- [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)
