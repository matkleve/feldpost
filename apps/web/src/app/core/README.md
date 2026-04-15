# Core Module Contract

Ownership Scope:

- Owns service facades, domain orchestration helpers, and technical adapters.
- Defines core API boundaries consumed by features and shared UI modules.

Link Scope:

- May link to docs/specs/service, docs/specs/system, and consuming docs/specs/ui contracts.
- May be consumed by apps/web/src/app/features and apps/web/src/app/shared.

Exclusions:

- Must not own route-level composition or page rendering contracts.
- Must not define component-level visual behavior contracts.

Module classification guidance:

- Prefer full-service-module for domain services.
- Use adapter-module for local technical adapters only.
- Mark mixed-responsibility modules as exception-module in governance registry until decomposed.
