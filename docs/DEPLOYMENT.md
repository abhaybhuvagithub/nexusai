# NEXUS AI deployment guide

This repository includes a Render Blueprint for a server-hosted Next.js web application and a FastAPI service. The web client uses Clerk in the browser; the API independently validates signed bearer tokens before model access.

## 1. Create a Clerk production application

1. Create a production Clerk application in the Clerk Dashboard.
2. Configure the allowed application origin for the Render web URL after Render creates it.
3. Copy the **publishable key** into the Render web service environment variable `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and the Clerk **secret key** into `CLERK_SECRET_KEY`. Never put the Clerk secret key or model-provider key in a `NEXT_PUBLIC_*` variable.
4. In Clerk, create a JWT template named exactly `nexus-api`.
5. Add the audience claim `"aud": "nexus-api"` to that template. The template must issue an RS256-signed JWT containing the standard `iss`, `sub`, `iat`, and `exp` claims.
6. Use the exact issuer (`iss`) from a token issued by this template as `OIDC_ISSUER`.
7. Set `OIDC_JWKS_URL` to the JWKS endpoint for that issuer (normally `<issuer>/.well-known/jwks.json`). Confirm it against the Clerk instance OpenID/JWKS metadata before saving.

The frontend requests the JWT template `nexus-api`; the FastAPI service validates its signature, issuer, audience, expiry, and subject. Do not use a development Clerk instance for a public production deployment.

## 2. Deploy with Render Blueprint

1. Sign in to Render and connect the GitHub repository `abhaybhuvagithub/nexusai`.
2. Select **New → Blueprint** and choose the repository.
3. Select branch `feat/production-hardening` for the initial review deployment (after the PR is reviewed and merged, change the Blueprint services to `main`).
4. Render reads the root `render.yaml` and proposes the `nexusai-web` Next.js Node web service and `nexusai-api` Python web service.
5. Supply the prompted values in Render:
   - API: `OPENAI_API_KEY`, `OIDC_ISSUER`, `OIDC_JWKS_URL`
   - Web: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
6. Confirm the generated web and API service hostnames. If Render assigns a hostname different from `nexusai-web.onrender.com` or `nexusai-api.onrender.com`, update:
   - Web `NEXT_PUBLIC_NEXUS_API_URL` to the actual API origin.
   - API `CORS_ORIGINS` to the actual web origin (origin only; no path).
7. Wait for both services to deploy. Check:
   - `https://<api-host>/api/v1/health/live` returns `{"status":"alive"}`.
   - `https://<api-host>/api/v1/health/ready` returns HTTP 200 and reports provider and identity configured.
   - Sign up/sign in on the web app, then send a test prompt.

Never paste API keys, Clerk secrets, or access tokens into GitHub issues, pull requests, source files, or this chat. Enter them only in hosting/provider secret settings.

## 3. Release limitations

This is a protected, stateless inference starter—not yet a complete production SaaS. Before broad public launch, add per-user and per-tenant quotas/rate limits, persistent conversation storage, abuse monitoring, audit logs, streaming, backup/restore, and an operational incident process. Do not treat browser local storage as durable or tenant-safe storage. Keep the API on a restricted beta until these release gates are met.

The existing GitHub Pages URL remains a legacy static preview and is no longer rebuilt. Render creates the new hosted web and API URLs only after the Blueprint is created and both services successfully deploy.
