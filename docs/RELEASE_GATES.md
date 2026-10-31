# Release gates

A production launch requires evidence, not just a successful compile.

## Implemented in the current branch
- [x] Clerk sign-in UI integration and OIDC RS256 API verification path.
- [x] PostgreSQL models and Alembic initial migration for conversations, messages, projects, knowledge documents and usage events.
- [x] Authenticated user ownership filters on workspace records.
- [x] Redis-backed per-user request limiting for chat and specialist agent calls.
- [x] Model allowlist, request limits, provider timeout and explicit CORS.
- [x] Specialist model workflows, research synthesis, projects, knowledge notes/file extraction and usage reporting.
- [x] Render Blueprint for web, API, PostgreSQL and Redis.
- [x] CI coverage for API and web quality gates.

## Required before public beta
- [ ] Apply the Render Blueprint and verify all four live resources.
- [ ] Configure Clerk production application, JWT template, issuer and JWKS URL; run end-to-end sign-in and API tests.
- [ ] Add account export, account deletion and data-retention enforcement.
- [ ] Add automated database backups and complete a restore drill.
- [ ] Add provider spend caps, daily user quotas and operational alerts.
- [ ] Add security/dependency/container scans and independent authorization review.
- [ ] Add load tests, failure tests, API contract tests and deployment rollback verification.
- [ ] Publish privacy policy, terms, support contact and incident response procedure.
- [ ] Confirm live API health/readiness and exercise chat, agents, projects, file upload, deletion and usage flows.

## Later capability expansion
- [ ] Vector embeddings and permission-aware semantic retrieval.
- [ ] Live web research with source extraction and citation verification.
- [ ] Streaming responses, cancellation and tool execution with sandboxing/approval.
- [ ] Token-level usage and billing integration.
- [ ] Organization/tenant administration, invitations and role-based access control.

## Google Play
- [ ] Play Console account and app ownership verified.
- [ ] Android application ID finalized; signed production AAB tested.
- [ ] Data safety, content rating, privacy policy and store listing completed.
- [ ] Target API and testing requirements satisfied.

## Apple App Store
- [ ] Apple Developer Program membership active.
- [ ] Bundle ID and signing configured.
- [ ] App Store Connect record, screenshots and metadata completed.
- [ ] Privacy labels, account deletion and review notes completed.
- [ ] TestFlight device testing and App Review completed.

Store approval and timing are controlled by the providers.
