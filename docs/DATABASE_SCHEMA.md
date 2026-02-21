# Database Schema

**Version**: 1.0  
**Last Updated**: 2026-02-21  
**Database**: PostgreSQL 16  
**ORM**: Strapi v5 (Knex.js)

---

## Overview

The blog platform uses PostgreSQL 16 as its primary database, managed by Strapi v5's built-in ORM layer (Knex.js). Tables are auto-generated from the content type schemas in `src/api/`.

### Table Naming Convention

Strapi follows these conventions:
- Collection types → plural snake_case (e.g. `blog_posts`, `up_users`)
- Junction tables → `{table1}_{table2}_lnk` format (Strapi v5)
- Plugin tables → prefixed with plugin name (e.g. `up_` for `users-permissions`)

---

## Tables

### `up_users` — User Accounts

Extended user profile from `@strapi/plugin-users-permissions`.

| Column          | Type          | Constraints              | Description                              |
|-----------------|---------------|--------------------------|------------------------------------------|
| `id`            | integer       | PK, auto-increment       | Internal user ID                         |
| `username`      | varchar(255)  | UNIQUE, NOT NULL         | Username (auto-generated from email)     |
| `email`         | varchar(255)  | UNIQUE, NOT NULL         | Email address (primary identifier)       |
| `provider`      | varchar(255)  |                          | Strapi built-in provider field           |
| `password`      | varchar(255)  |                          | Hashed password (null for SSO users)     |
| `reset_password_token` | varchar(255) | PRIVATE           | Password reset token                     |
| `confirmation_token`   | varchar(255) | PRIVATE            | Email confirmation token                 |
| `confirmed`     | boolean       | DEFAULT false            | Whether email is confirmed               |
| `blocked`       | boolean       | DEFAULT false            | Whether account is blocked               |
| `provider_id`   | varchar(255)  | PRIVATE                  | Provider's unique user ID (ADR-003)      |
| `auth_provider` | varchar(50)   | enum(local,apple,google,email) | Authentication provider (ADR-003) |
| `display_name`  | varchar(100)  |                          | User's display name                      |
| `bio`           | text          |                          | User biography                           |
| `avatar_url`    | varchar(500)  |                          | URL to avatar image                      |
| `created_at`    | timestamptz   | NOT NULL                 | Record creation timestamp                |
| `updated_at`    | timestamptz   | NOT NULL                 | Record last update timestamp             |
| `created_by_id` | integer       | FK → admin_users         |                                          |
| `updated_by_id` | integer       | FK → admin_users         |                                          |

**Indexes:**
- `up_users_email_unique` — UNIQUE on `email`
- `up_users_username_unique` — UNIQUE on `username`
- `up_users_auth_provider_idx` — on `(auth_provider, provider_id)` for fast provider lookups

---

### `up_roles` — User Roles (RBAC)

Managed by `@strapi/plugin-users-permissions`.

| Column        | Type         | Constraints    | Description              |
|---------------|--------------|----------------|--------------------------|
| `id`          | integer      | PK             |                          |
| `name`        | varchar(255) | NOT NULL       | Role name                |
| `description` | varchar(255) |                | Role description         |
| `type`        | varchar(255) | UNIQUE         | System type (e.g. `authenticated`, `public`) |

**Default roles created by Strapi:**
- `public` — unauthenticated users (read-only access to published posts)
- `authenticated` — all logged-in users (default role assigned on registration)

**Custom roles to create in admin panel:**
- `reader` — can read posts and write comments
- `author` — can create and manage own posts
- `editor` — can review and publish all posts
- `admin` — full access (map to Strapi admin)

---

### `blog_posts` — Blog Articles

| Column              | Type         | Constraints        | Description                        |
|---------------------|--------------|--------------------|------------------------------------|
| `id`                | integer      | PK                 |                                    |
| `title`             | varchar(255) | NOT NULL           | Post title                         |
| `slug`              | varchar(255) | UNIQUE, NOT NULL   | URL-friendly identifier            |
| `content`           | longtext     | NOT NULL           | Rich text content (Strapi blocks)  |
| `excerpt`           | text         | max 500 chars      | Short preview text                 |
| `read_time_minutes` | integer      | min: 1             | Estimated reading time             |
| `view_count`        | integer      | DEFAULT 0          | Incremented on each read           |
| `is_featured`       | boolean      | DEFAULT false      | Featured post flag                 |
| `meta_title`        | varchar(70)  |                    | SEO title override                 |
| `meta_description`  | text         | max 160 chars      | SEO meta description               |
| `published_at`      | timestamptz  |                    | Null = draft, set = published      |
| `created_at`        | timestamptz  | NOT NULL           |                                    |
| `updated_at`        | timestamptz  | NOT NULL           |                                    |
| `created_by_id`     | integer      | FK → admin_users   |                                    |
| `updated_by_id`     | integer      | FK → admin_users   |                                    |

**Relations:**
- `author` → `up_users` (many-to-one)
- `category` → `categories` (many-to-one)
- `tags` → `tags` via `blog_posts_tags_lnk` junction table (many-to-many)
- `comments` → `comments` (one-to-many)
- `cover_image` → `files` via `blog_posts_cover_image_fk` (one-to-one media)

**Indexes:**
- `blog_posts_slug_unique` — UNIQUE on `slug`
- `blog_posts_published_at_idx` — on `published_at` for feed queries
- `blog_posts_author_idx` — on `author_id`

---

### `categories` — Post Categories

| Column        | Type         | Constraints      | Description              |
|---------------|--------------|------------------|--------------------------|
| `id`          | integer      | PK               |                          |
| `name`        | varchar(100) | UNIQUE, NOT NULL | Category display name    |
| `slug`        | varchar(255) | UNIQUE, NOT NULL | URL-friendly identifier  |
| `description` | text         | max 500 chars    | Category description     |
| `color`       | varchar(7)   | hex color `#rrggbb` | Display color         |
| `created_at`  | timestamptz  | NOT NULL         |                          |
| `updated_at`  | timestamptz  | NOT NULL         |                          |

**Relations:**
- `blog_posts` → `blog_posts` (one-to-many, inverse)

---

### `tags` — Post Tags

| Column       | Type         | Constraints      | Description              |
|--------------|--------------|------------------|--------------------------|
| `id`         | integer      | PK               |                          |
| `name`       | varchar(50)  | UNIQUE, NOT NULL | Tag display name         |
| `slug`       | varchar(255) | UNIQUE, NOT NULL | URL-friendly identifier  |
| `created_at` | timestamptz  | NOT NULL         |                          |
| `updated_at` | timestamptz  | NOT NULL         |                          |

**Relations:**
- `blog_posts` ↔ `blog_posts` via `blog_posts_tags_lnk` (many-to-many, inverse)

---

### `comments` — Post Comments

Supports threaded replies (one level of nesting via `parent_id`).

| Column        | Type         | Constraints        | Description                    |
|---------------|--------------|--------------------|--------------------------------|
| `id`          | integer      | PK                 |                                |
| `content`     | text         | NOT NULL, max 2000 | Comment text                   |
| `is_approved` | boolean      | DEFAULT false      | Moderation approval flag       |
| `likes_count` | integer      | DEFAULT 0          | Like counter                   |
| `created_at`  | timestamptz  | NOT NULL           |                                |
| `updated_at`  | timestamptz  | NOT NULL           |                                |

**Relations:**
- `author` → `up_users` (many-to-one)
- `blog_post` → `blog_posts` (many-to-one)
- `parent` → `comments` (self-referencing many-to-one, for threaded replies)
- `replies` → `comments` (self-referencing one-to-many, inverse)

**Indexes:**
- `comments_blog_post_idx` — on `blog_post_id`
- `comments_author_idx` — on `author_id`
- `comments_parent_idx` — on `parent_id`

---

### `refresh_tokens` — Session Tokens (ADR-002)

Stores SHA-256 hashes of opaque refresh tokens for session management.  
Plain-text tokens are **never** stored.

| Column           | Type         | Constraints       | Description                                  |
|------------------|--------------|-------------------|----------------------------------------------|
| `id`             | integer      | PK                |                                              |
| `token_hash`     | varchar(64)  | UNIQUE, NOT NULL  | SHA-256 hash of the raw token (hex)          |
| `device_type`    | varchar(20)  | enum(web,ios,android) | Client platform                          |
| `device_info`    | text         | PRIVATE           | User-Agent string                            |
| `ip_address`     | varchar(45)  | PRIVATE           | IPv4 or IPv6 address                         |
| `expires_at`     | timestamptz  | NOT NULL          | Token expiry (7 days from issuance)          |
| `last_used_at`   | timestamptz  |                   | Last refresh operation timestamp             |
| `revoked`        | boolean      | DEFAULT false     | Whether token has been revoked               |
| `revoked_at`     | timestamptz  |                   | When the token was revoked                   |
| `revoked_reason` | varchar(50)  | enum(logout, security, admin_action, rotated) | Revocation reason |
| `created_at`     | timestamptz  | NOT NULL          |                                              |
| `updated_at`     | timestamptz  | NOT NULL          |                                              |

**Relations:**
- `user` → `up_users` (many-to-one)

**Indexes:**
- `refresh_tokens_token_hash_unique` — UNIQUE on `token_hash` (primary lookup)
- `refresh_tokens_user_idx` — on `user_id` (for revoking all user tokens)
- `refresh_tokens_expires_at_idx` — on `expires_at` (for cleanup job)

**Cleanup**: A scheduled job should periodically delete expired tokens:
```sql
DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '1 day';
```

---

### `otp_codes` — Email OTP Codes (ADR-003)

Stores SHA-256 hashes of 6-digit OTPs for email authentication.  
Plain-text codes are **never** stored.

| Column          | Type         | Constraints       | Description                              |
|-----------------|--------------|-------------------|------------------------------------------|
| `id`            | integer      | PK                |                                          |
| `email`         | varchar(255) | NOT NULL          | Target email address                     |
| `code_hash`     | varchar(64)  | NOT NULL, PRIVATE | SHA-256 hash of the 6-digit OTP          |
| `expires_at`    | timestamptz  | NOT NULL          | 10 minutes from creation                 |
| `attempt_count` | integer      | DEFAULT 0, max 3  | Failed verification attempts             |
| `used`          | boolean      | DEFAULT false     | Whether code has been successfully used  |
| `used_at`       | timestamptz  |                   | When the code was consumed               |
| `created_at`    | timestamptz  | NOT NULL          |                                          |
| `updated_at`    | timestamptz  | NOT NULL          |                                          |

**Security properties:**
- Max 3 attempts per OTP (brute-force protection)
- `used: false` filter prevents replay attacks
- 10-minute expiry window
- Rate limit: 5 OTPs per hour per email address

**Cleanup**: Delete used/expired codes older than 24 hours:
```sql
DELETE FROM otp_codes WHERE (used = true OR expires_at < NOW()) AND created_at < NOW() - INTERVAL '1 day';
```

---

## Junction Tables (Auto-Generated by Strapi v5)

| Table                       | Joins                              | Description               |
|-----------------------------|------------------------------------|---------------------------|
| `blog_posts_tags_lnk`       | `blog_posts` ↔ `tags`              | Blog post / tag M:M       |
| `blog_posts_author_lnk`     | `blog_posts` → `up_users`          | Post author FK            |
| `blog_posts_category_lnk`   | `blog_posts` → `categories`        | Post category FK          |
| `comments_author_lnk`       | `comments` → `up_users`            | Comment author FK         |
| `comments_blog_post_lnk`    | `comments` → `blog_posts`          | Comment post FK           |
| `comments_parent_lnk`       | `comments` → `comments`            | Thread parent FK          |
| `refresh_tokens_user_lnk`   | `refresh_tokens` → `up_users`      | Token owner FK            |

---

## Entity-Relationship Diagram

```
up_users 1────────* blog_posts
up_users 1────────* comments
up_users 1────────* refresh_tokens

blog_posts *────────1 categories
blog_posts *────────* tags
blog_posts 1────────* comments
comments   *────────1 comments (self-ref: parent/replies)

otp_codes (standalone, linked by email string)
```

---

## Access Patterns

### Common Queries

| Use Case                               | Table(s)                              |
|----------------------------------------|---------------------------------------|
| List published posts (feed)            | `blog_posts` WHERE `published_at IS NOT NULL` |
| Get post with author, tags, category   | JOIN `up_users`, `tags`, `categories` |
| Get comments for a post                | `comments` WHERE `blog_post_id = ?`   |
| Validate refresh token                 | `refresh_tokens` WHERE `token_hash = ?` |
| Check OTP validity                     | `otp_codes` WHERE `email = ? AND used = false` |
| Revoke all user sessions               | UPDATE `refresh_tokens` WHERE `user_id = ?` |

---

## Migration Notes

Strapi v5 auto-generates migrations when content type schemas change.  
Manual migration files (if needed) go in `database/migrations/`.

To reset the database in development:
```bash
npx strapi db:reset
```

To run pending migrations:
```bash
npx strapi db:migrate
```
