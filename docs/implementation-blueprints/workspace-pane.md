# Workspace Pane — Implementation Blueprint

> **Spec**: [element-specs/workspace-pane.md](../element-specs/workspace-pane.md)
> **Status**: Core desktop pane is implemented as `WorkspacePaneComponent`. This blueprint is intentionally minimal and only tracks follow-up work that should not live in the spec.

## Why This Blueprint Still Exists

The current pane structure is already implemented and described by the spec plus code. This blueprint remains only for rollout notes around features that are still incomplete or intentionally future-facing.

## Current Implemented Base

| File                                                                           | What it provides                                      |
| ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `features/map/workspace-pane/workspace-pane.component.ts`                      | Standalone workspace pane composition                 |
| `features/map/workspace-pane/pane-header.component.ts`                         | Pane header actions and title handling                |
| `features/map/workspace-pane/workspace-toolbar/workspace-toolbar.component.ts` | Toolbar controls for grouping, filter, sort, projects |
| `features/map/workspace-pane/thumbnail-grid.component.ts`                      | Grid rendering and hover/export integration           |
| `features/map/workspace-pane/workspace-export-bar.component.ts`                | Selection-driven action surface                       |
| `core/workspace-view.service.ts`                                               | Workspace dataset pipeline                            |
| `core/workspace-selection.service.ts`                                          | Selection state used by export workflows              |

## Remaining Follow-Up Areas

### 1. Mobile bottom-sheet behavior

The spec still carries mobile bottom-sheet intent, but the desktop pane is the authoritative implemented structure. Any mobile work should be planned against the existing `WorkspacePaneComponent` contract rather than an alternative component architecture.

### 2. Fullscreen workspace mode

Fullscreen behavior is still product intent and should be implemented as an extension of the current pane + shell wiring, not as a separate pane system.

### 3. Linked-hover completeness

The pane already emits hover start/end events. Remaining work should focus on completing the map ↔ workspace linked-hover loop and validating additive highlight behavior.

### 4. Cluster / active-selection UX polish

Cluster-open behavior, header count presentation, and large-cluster progressive behavior should be treated as follow-up UX work on top of the current workspace dataset pipeline.

### 5. Upload-tab selection ergonomics

Upload tab now carries workspace-only multi-select intent (hover/focus checkbox reveal + bottom selection footer actions). Keep this behavior scoped to embedded UploadPanel usage in `WorkspacePaneComponent`; do not mirror it into compact map-overlay panel mode.

## Guardrails For Future Changes

- Do not redesign the pane around a second future-only component abstraction.
- Extend `WorkspacePaneComponent`, `WorkspaceViewService`, and `WorkspaceSelectionService` unless a real code-level constraint appears.
- Keep rollout notes here; keep user-visible contract changes in `docs/element-specs/workspace-pane.md`.
