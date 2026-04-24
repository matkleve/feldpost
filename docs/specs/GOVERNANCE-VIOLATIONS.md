# Governance Violations Report

Last updated: 2026-04-15

| Violation                           | Count | Status                    |
| ----------------------------------- | ----- | ------------------------- |
| docs/specs subfolder README missing | 0     | resolved                  |
| module registry spec-gap            | 27    | open                      |
| module registry readme-gap          | 9     | open                      |
| module registry exception-open      | 2     | open                      |
| traceability unresolved refs        | 1     | open                      |
| traceability ambiguous refs         | 2     | resolved via context rule |

## Open SPEC GAP Items

- ambiguity: docs/element-specs/thumbnail-grid.md has no active docs/specs equivalent.
- impacted scope: apps/web/src/app/features/map/workspace-pane/thumbnail-card/\*
- proposed resolution direction: either create docs/specs/component/thumbnail-grid.md or formally map references to docs/specs/component/item-grid.md after owner decision.

## Approved Remediation Plan

- G-02 runs in two phases: first flag every relevant location completely, then correct them systematically.
- Exceptions are documented only when technically or fachlich required; there is no mixed-state rollout.
- I-02 is tracked as a governance item with low priority instead of a loose note.
- C-01 is handled before C-05.
- W-01 starts only after C-01 and C-05 are in place, with spec update first and code later.

## Decision Notes

- G-01 remains a one-time documentation link correction.
- G-02 resolves per-doc through either signals-only rewrite or documented exception.
- I-02 is treated as a governance backlog item, not as a mere reminder.
- C-01 and C-05 may refine existing specs when the current text is too thin for a future 1:1 implementation check.
- W-01 must carry its own planned-change section in the spec before code changes are permitted.

## Open Module-Level Gaps

- core/auth (spec-gap)
- core/i18n (spec-gap)
- core/invites (spec-gap)
- core/metadata (spec-gap)
- core/search (spec-gap)
- core/settings-pane (spec-gap)
- core/supabase (spec-gap)
- core/user-profile (spec-gap)
- features/account (spec-gap)
- features/action-system (spec-gap)
- features/auth (spec-gap)
- features/groups (spec-gap)
- features/nav (spec-gap)
- features/settings (spec-gap)
- shared/account (spec-gap)
- shared/components (spec-gap)
- shared/confirm-dialog (spec-gap)
- shared/containers (spec-gap)
- shared/dropdown-trigger (spec-gap)
- shared/pane-footer (spec-gap)
- shared/pane-toolbar (spec-gap)
- shared/photo-lightbox (spec-gap)
- shared/project-select-dialog (spec-gap)
- shared/quick-info-chips (spec-gap)
- shared/snap-size-slider (spec-gap)
- shared/text-input-dialog (spec-gap)
- shared/view-toggle (spec-gap)
- core/map (readme-gap)
- features/map (readme-gap)
- features/media (readme-gap)
- features/projects (readme-gap)
- features/settings-overlay (readme-gap)
- shared/item-grid (readme-gap)
- shared/media (readme-gap)
- shared/media-display (readme-gap)
- shared/segmented-switch (readme-gap)
- features/upload (exception-open)
- shared/ui-primitives (exception-open)
