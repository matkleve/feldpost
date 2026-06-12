# Core Module Contract

Ownership Scope:

- Owns service facades, domain orchestration helpers, and technical adapters.
- Defines core API boundaries consumed by features and shared UI modules.

Link Scope:

- May link to docs/specs/service, docs/specs/system, and consuming docs/specs/ui contracts.
- May be consumed by apps/web/src/app/features and apps/web/src/app/shared.

Exclusions:

- Must not own route-level composition or page rendering contracts.
- Must not define component-level visual behavior contracts (toast **presentation** lives in `shared/toast/`; this folder keeps `toast` **service** + types only).

Workspace pane shell (ports, observer, layout bridge) lives in `core/workspace-pane/` — layout host and map shell consume it; see `docs/specs/ui/workspace/workspace-pane.md`.

Module classification guidance:

- Prefer full-service-module for domain services.
- Use adapter-module for local technical adapters only.
- Mark mixed-responsibility modules as exception-module in governance registry until decomposed.
