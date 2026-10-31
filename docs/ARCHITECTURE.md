# Architecture decisions

## Initial shape

Start with separately deployed web/mobile clients and one modular API service. Avoid premature microservices; split only when independent scaling or ownership justifies the operational cost.

## Trust boundaries

- Browsers and mobile devices are untrusted public clients.
- Provider API keys are backend-only.
- Protected requests must be authenticated and authorized server-side.
- Tenant and resource ownership checks belong at query boundaries.
- Agent tools require explicit scopes, timeouts, budgets and approval gates for consequential actions.

## Planned modules

1. Identity and organizations
2. Conversations and model routing
3. Memory and knowledge retrieval
4. Agent orchestration and tool execution
5. Usage metering and billing
6. Audit, observability and evaluation

## API compatibility

Public routes are versioned under `/api/v1`. Breaking changes require a new API version or a documented deprecation window. Mobile releases may lag web releases, so backward compatibility is mandatory.
