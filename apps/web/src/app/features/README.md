# Features Module Contract

Ownership Scope:

- Owns route-level feature composition, feature shells, and feature state wiring.
- Integrates shared UI components and core facades for user-facing flows.

Link Scope:

- May link to docs/specs/page, docs/specs/ui, docs/specs/component, and core facades.

Exclusions:

- Must not own persistence adapter internals.
- Must not create hidden shared primitive ownership inside a feature module.

Module classification guidance:

- Prefer ui-bound-module for route or feature components.
- Use thin-module only for narrow composition wrappers with explicit dependencies.
- Mark mixed service+UI modules as exception-module in governance registry until decomposed.
