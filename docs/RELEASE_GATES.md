# Release gates

A passing build alone does not make a release production-ready.

## Public beta
- [ ] Authentication, account recovery and server-side authorization tested.
- [ ] Tenant isolation and resource ownership enforced at query boundaries.
- [ ] Provider credentials stored in managed secrets; no client-side keys.
- [ ] Rate limits, spend limits, abuse controls and cancellation enabled.
- [ ] Privacy policy, terms, retention and account deletion published.
- [ ] Data export/deletion tested; backups and restore drill documented.
- [ ] Dependency/container scans, migration tests and API contract tests pass.
- [ ] Monitoring, metrics, tracing and alerting configured.

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
