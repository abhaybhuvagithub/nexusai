# NEXUS AI

A multimodal AI workspace for web, Android and iOS, backed by a shared API and agent platform.

> Development status: foundation scaffold. Not yet production-ready.

## Applications
- `apps/web` — Next.js web client
- `apps/mobile` — Expo / React Native Android and iOS client
- `services/api` — FastAPI backend and model-provider adapter

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
