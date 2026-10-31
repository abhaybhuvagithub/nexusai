# NEXUS AI

NEXUS AI is a multi-module AI workspace with authenticated chat, specialist model workflows, persistent projects, a private knowledge library and usage reporting.

## Product capabilities

- **AI chat:** OpenAI-backed chat with model allowlisting, server-side provider credentials and persistent conversation history.
- **Specialist agents:** Architect, Researcher, Engineer, Analyst and Writer workflows with role-specific instructions.
- **Research studio:** structured model-assisted research briefs with explicit disclosure when no live web sources were retrieved.
- **Projects:** private project records scoped to the authenticated account.
- **Knowledge library:** private text notes and TXT, MD, CSV, JSON, LOG, PDF and DOCX ingestion (5 MB upload limit); selected documents can be supplied as chat context.
- **Usage:** request and character counters by feature/model (operational metrics, not invoices or token billing).
- **Security:** Clerk sign-in, OIDC RS256 API token verification, tenant ownership filters, Redis-backed per-user request limiting, request validation, explicit CORS and server-side model keys.
- **Operations:** PostgreSQL persistence, Alembic migrations, health/readiness endpoints, Render Blueprint and CI checks.

## Live and source links

- Legacy GitHub Pages snapshot: https://abhaybhuvagithub.github.io/nexusai/
- Repository: https://github.com/abhaybhuvagithub/nexusai
- Render Blueprint: [render.yaml](render.yaml)
- Clerk + Render setup: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Release gates: [docs/RELEASE_GATES.md](docs/RELEASE_GATES.md)

The GitHub Pages address is an older static snapshot. The active authenticated application is configured for Render and requires the account-side deployment steps in the deployment guide. A configured codebase is not the same as a deployed and verified service; do not treat the legacy Pages URL as a live AI backend.

## Repository layout

- `apps/web` — Next.js web application
- `apps/mobile` — Expo / React Native client starter
- `services/api` — FastAPI API, model provider, auth, persistence and workspace routes
- `services/api/migrations` — Alembic database migrations
- `render.yaml` — Render web, API, PostgreSQL and Redis blueprint

## Local development

Requirements: Node.js 20+, Python 3.12+, Docker Compose.

1. Start infrastructure: `docker compose up -d postgres redis`.
2. API: `cd services/api && pip install -e '.[dev]' && alembic upgrade head && uvicorn nexus_api.main:app --reload`.
3. Web: `cd apps/web && npm install && npm run dev`.
4. Configure Clerk's local publishable key and JWT template `nexus-api` if testing authenticated local flows. Keep all provider and Clerk secret keys in local environment variables only.

The API reads `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `ALLOWED_MODELS`, `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_JWKS_URL`, and `CORS_ORIGINS`. See `services/api/.env.example` and the deployment guide.

## API routes

- `GET /api/v1/health/live` and `GET /api/v1/health/ready`
- `GET /api/v1/models`
- `POST /api/v1/chat/completions`
- `GET|POST /api/v1/conversations`, `GET|DELETE /api/v1/conversations/{id}`
- `GET|POST|PATCH|DELETE /api/v1/projects`
- `GET|POST|DELETE /api/v1/knowledge/documents`, `POST /api/v1/knowledge/upload`
- `POST /api/v1/agents/run`, `POST /api/v1/research`
- `GET /api/v1/usage`
- `GET /api/v1/account/export`, `DELETE /api/v1/account/data`

All workspace routes require an authenticated Clerk/OIDC subject in production and filter records by that subject. The local development mode uses a fixed local-only identity and must never be exposed publicly.

## Production deployment

Production startup is fail-closed. The API requires explicit trusted CORS origins, provider credentials, Clerk OIDC settings, PostgreSQL and Redis. Render runs Alembic migrations before starting the API. Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) to configure Clerk and deploy the Blueprint.

## Release discipline

CI verifies API lint, types and tests plus web lint, types and production build. A green CI run does not verify external provider credentials, live database connectivity, restore procedures, load capacity or legal compliance. Before opening public registration, complete [docs/RELEASE_GATES.md](docs/RELEASE_GATES.md), including privacy/terms, retention and deletion, backups and restore tests, security review, monitoring and cost controls.
