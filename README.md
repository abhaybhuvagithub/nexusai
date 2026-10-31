# NEXUS AI

A multimodal AI workspace for web, Android and iOS, backed by a shared API and agent platform.

> **Current release status:** the static web workspace is published on GitHub Pages. The API has a starter implementation and production-hardening work is in progress. The complete hosted product is **not yet production-ready**: managed identity, durable conversation storage, rate limiting/abuse controls, streaming, operational monitoring, backup/restore and a hosted API deployment must be completed before a public beta.

## Live links

- Web workspace: https://abhaybhuvagithub.github.io/nexusai/
- Source repository: https://github.com/abhaybhuvagithub/nexusai
- Deployment workflow: https://github.com/abhaybhuvagithub/nexusai/actions/workflows/deploy-web-preview.yml

The web URL currently serves the interactive workspace preview. It does not imply that live AI inference is connected.

## Applications
- `apps/web` — Next.js web client
- `apps/mobile` — Expo / React Native Android and iOS client
- `services/api` — FastAPI backend and model-provider adapter

## Local development
Requirements: Node.js 24+, Python 3.12+, Docker Compose.

1. Copy `.env.example` to `.env` and configure provider credentials.
2. Start dependencies: `docker compose up -d postgres redis`.
3. API: `cd services/api && pip install -e '.[dev]' && uvicorn nexus_api.main:app --reload`.
4. Web: `cd apps/web && npm install && npm run dev`.
5. Mobile: `cd apps/mobile && npm install && npx expo start`.

Health endpoints: `/api/v1/health/live` and `/api/v1/health/ready`.

## API security configuration

Production startup is fail-closed. Set all of the following on the API host:
- `APP_ENV=production`
- `OPENAI_API_KEY` as a managed secret
- `OPENAI_MODEL` and `ALLOWED_MODELS` (comma-separated allowlist)
- `CORS_ORIGINS` to exact trusted HTTPS origins; wildcards are rejected
- `OIDC_ISSUER`, `OIDC_AUDIENCE`, and `OIDC_JWKS_URL` from the chosen identity provider
- `MAX_REQUEST_MESSAGES`, `MAX_MESSAGE_CHARS`, `MAX_COMPLETION_TOKENS`, and `PROVIDER_TIMEOUT_SECONDS` as required

The chat endpoint validates OIDC RS256 bearer tokens when identity is configured. In production, missing OIDC configuration prevents startup. Provider keys are server-only. The API does not yet implement per-user quotas, persistent chat history, or tenant-aware data storage; do not expose it as a general public endpoint until those controls are added.

## Security and compatibility
Browsers and mobile devices are untrusted clients. Enforce authentication and authorization at the API boundary. Never put provider credentials in `NEXT_PUBLIC_*` variables. All clients use the versioned API; breaking changes require a new API version or a deprecation window.

## Quality gates
Python: Ruff, mypy, pytest. Web: TypeScript and ESLint. Changes are developed on feature branches; do not push directly to `main`.

## Release gates
See `docs/RELEASE_GATES.md`. A successful build alone does not mean production-ready. Store publication requires developer accounts, signing, privacy disclosures, store assets, device testing and review approval.
