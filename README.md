# NEXUS AI

A multimodal AI workspace for web, Android and iOS, backed by a shared API and agent platform.

 > Development status: interactive web workspace preview with a starter API. Authentication, durable server-side conversations, streaming, agents, retrieval and production deployment are still in progress.

## Applications
- `apps/web` — Next.js web client
- `apps/mobile` — Expo / React Native Android and iOS client
- `services/api` — FastAPI backend and model-provider adapter

## Web workspace preview

The web client includes a responsive workspace shell, local conversation history, model selector, starter prompts and API integration. Without an API URL it clearly runs in preview mode and does not pretend to generate model answers.

For a connected local API, create `apps/web/.env.local` with `NEXT_PUBLIC_NEXUS_API_URL=http://localhost:8000`, start the API, then run the web client. Keep provider API keys only in the API service environment; never put them in `NEXT_PUBLIC_*` variables.

## Local development
Requirements: Node.js 22+, Python 3.12+, Docker Compose.

1. Copy `.env.example` to `.env` and configure provider credentials when ready.
2. Start dependencies: `docker compose up -d postgres redis`.
3. API: `cd services/api && pip install -e '.[dev]' && uvicorn nexus_api.main:app --reload`.
4. Web: `cd apps/web && npm install && npm run dev`.
5. Mobile: `cd apps/mobile && npm install && npx expo start`.

Health endpoints: `/api/v1/health/live` and `/api/v1/health/ready`.

## Security and compatibility
Provider credentials remain server-side. Protected routes must enforce authentication, authorization and tenant ownership on the server. All clients use the versioned API; breaking changes require a new API version or a deprecation window.

## Quality gates
Python: Ruff, mypy, pytest. Web: TypeScript and ESLint. Changes are developed on feature branches; do not push directly to `main`.

## Release
See `docs/RELEASE_GATES.md`. A successful build alone does not mean production-ready. Store publication requires developer accounts, signing, privacy disclosures, store assets, device testing and review approval.
