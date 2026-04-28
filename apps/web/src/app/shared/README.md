# Shared Module Contract

Ownership Scope:

- Owns reusable UI components and shared interaction primitives.
- Provides cross-feature presentational contracts with stable APIs.

Link Scope:

- May link to docs/specs/component and related docs/specs/ui references.
- May consume core facades only through explicit component APIs.

Exclusions:

- Must not own route/page orchestration.
- Must not embed feature-specific business orchestration in shared modules.

**Layout:** `ui-primitives/` = low-level building blocks; `components/` = composed patterns (e.g. chips). **`shared/media`** = reusable media widgets; **`shared/media-item/`** = `MediaItem` + overlays; **`shared/workspace-pane/`** = layout-mounted workspace pane UI (see `docs/specs/ui/workspace/workspace-pane.md`); **`features/media`** = the `/media` route — same domain name, different layer.

**Toast:** `shared/toast/` hosts `ss-toast-container` / `ss-toast-item`; `core/toast/` owns `ToastService` and types.

Module classification guidance:

- Prefer ui-bound-module for reusable shared components.
- Use thin-module for narrowly scoped wrappers.
- Mark mixed service+component modules as exception-module in governance registry until split.
