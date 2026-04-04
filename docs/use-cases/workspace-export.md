# Workspace Export — Use Cases & Interaction Scenarios

> Related specs: [workspace-pane](../element-specs/workspace/workspace-pane.md), [active-selection-view](../element-specs/active-selection-view.md), [workspace-actions-bar](../element-specs/workspace/workspace-actions-bar.md)

## Overview

These scenarios define how users select mixed media in the workspace and export them through a bottom action bar. They cover desktop and mobile interactions, link sharing with stable tokenized sets, ZIP download naming rules, clipboard copy, and recovery/error paths.

## Scenario Index

| ID    | Scenario                                            | Persona    |
| ----- | --------------------------------------------------- | ---------- |
| WE-1  | Hover reveals selection checkbox                    | Clerk      |
| WE-2  | Ctrl/Cmd + click toggles selection                  | Clerk      |
| WE-3  | First selected item opens export bar                | Clerk      |
| WE-4  | Select all visible items                            | Clerk      |
| WE-5  | Clear all selected items                            | Clerk      |
| WE-6  | Keep selection while sorting                        | Clerk      |
| WE-7  | Keep selection while filtering                      | Clerk      |
| WE-8  | Keep selection while grouping                       | Clerk      |
| WE-9  | Keep selection while switching from photo to PDF    | Clerk      |
| WE-10 | Open share-link dialog from export bar              | Clerk      |
| WE-11 | Generate deterministic share set token              | Clerk      |
| WE-12 | Copy share URL to clipboard                         | Clerk      |
| WE-13 | Open native share sheet where available             | Technician |
| WE-14 | Re-open existing token for identical selection      | Clerk      |
| WE-15 | Open shared URL and resolve same media set          | Viewer     |
| WE-16 | Shared link denies access outside org               | Admin      |
| WE-17 | Shared link handles deleted media gracefully        | Clerk      |
| WE-18 | Shared link handles expired token                   | Viewer     |
| WE-19 | Open download dialog from export bar                | Clerk      |
| WE-20 | Auto-fill download title from project               | Clerk      |
| WE-21 | Auto-generate smart title for ad-hoc selection      | Clerk      |
| WE-22 | User edits title before ZIP creation                | Clerk      |
| WE-23 | Generate ZIP containing mixed file types            | Clerk      |
| WE-24 | ZIP download progress and completion feedback       | Clerk      |
| WE-25 | ZIP generation canceled by user                     | Clerk      |
| WE-26 | ZIP generation fails because of missing files       | Clerk      |
| WE-27 | Export bar closes after deselecting last item       | Clerk      |
| WE-28 | Keyboard shortcut selects all items                 | Power User |
| WE-29 | Keyboard escape exits selection mode                | Power User |
| WE-30 | Selection survives workspace pane fullscreen toggle | Clerk      |

---

## WE-1: Hover reveals selection checkbox

1. User hovers a thumbnail or file tile.
2. A checkbox affordance appears in the top-left corner.
3. Hover out hides the checkbox if item is not selected.

Expected outcome:

- Selection affordance is discoverable without visual noise.

## WE-2: Ctrl/Cmd + click toggles selection

1. User holds Ctrl on Windows/Linux or Cmd on macOS.
2. User clicks a media tile.
3. Tile toggles selected/unselected state without opening detail view.

Expected outcome:

- Modifier-click follows common multi-select behavior.

## WE-3: First selected item opens export bar

1. User selects one item.
2. Bottom export bar animates in from bottom.
3. Bar shows selected count and primary actions.

Expected outcome:

- Selection context is immediately actionable.

## WE-4: Select all visible items

1. User clicks "Select all" in export bar.
2. All currently loaded/visible result items become selected.
3. Count updates instantly.

Expected outcome:

- User can bulk-select quickly for current result scope.

## WE-5: Clear all selected items

1. User clicks "Select none" in export bar.
2. Selection set becomes empty.
3. Export bar animates out.

Expected outcome:

- User can return to browsing state in one action.

## WE-6: Keep selection while sorting

1. User selects multiple items.
2. User changes sort order.
3. UI reorders grid but keeps selected IDs.

Expected outcome:

- Selection is identity-based, not position-based.

## WE-7: Keep selection while filtering

1. User selects items.
2. User applies filter that hides some selected items.
3. Export bar keeps total selected count, including hidden selected IDs.

Expected outcome:

- Hidden selected items are retained and can still be exported.

## WE-8: Keep selection while grouping

1. User selects items in flat view.
2. User enables grouping.
3. Selected state remains on corresponding items in grouped view.

Expected outcome:

- Grouping changes layout only, not selected membership.

## WE-9: Keep selection while switching from photo to PDF

1. User selects mixed media (image + PDF).
2. User opens/returns from detail views.
3. Selected markers remain unchanged.

Expected outcome:

- Selection supports mixed media consistently.

## WE-10: Open share-link dialog from export bar

1. User clicks "Share link".
2. Share dialog opens above export bar.
3. Dialog shows selection count and visibility scope.

Expected outcome:

- Share flow starts without leaving workspace context.

## WE-11: Generate deterministic share set token

1. System normalizes selected media IDs (sorted ascending).
2. System computes deterministic set fingerprint.
3. Backend stores/returns token mapped to that set.

Expected outcome:

- Same selection can resolve to same share-set identity.

## WE-12: Copy share URL to clipboard

1. User clicks "Copy link" in share dialog.
2. App writes full URL to clipboard.
3. Success toast confirms copy.

Expected outcome:

- User can paste link into external channels immediately.

## WE-13: Open native share sheet where available

1. User clicks "Share" in supported browser/device.
2. App calls Web Share API with URL/title/text.
3. Native share sheet opens.

Expected outcome:

- Mobile workflow uses native channels where possible.

## WE-14: Re-open existing token for identical selection

1. User selects the same IDs as earlier.
2. User requests share link again.
3. Backend reuses existing active token mapping (or rotates by policy).

Expected outcome:

- No duplicate share rows for identical active sets unless rotation is required.

## WE-15: Open shared URL and resolve same media set

1. Recipient opens shared URL.
2. System resolves token to image ID set.
3. Workspace renders exactly this media set.

Expected outcome:

- Link is a stable pointer to one specific group.

## WE-16: Shared link denies access outside org

1. User from another organization opens URL.
2. Backend validates token and organization boundary.
3. Access denied state is rendered.

Expected outcome:

- RLS/org security remains intact for share links.

## WE-17: Shared link handles deleted media gracefully

1. Token resolves to 10 IDs, 2 are deleted.
2. Viewer opens link.
3. UI shows 8 available items + missing-items notice.

Expected outcome:

- Link stays useful when partial data changed.

## WE-18: Shared link handles expired token

1. Recipient opens an expired URL.
2. Token validation fails with expiration reason.
3. UI shows expiration message and optional request flow.

Expected outcome:

- Expired links fail safely with clear user guidance.

## WE-19: Open download dialog from export bar

1. User clicks "Download ZIP".
2. Download dialog appears with filename field.
3. Dialog displays selected count and estimated size (if available).

Expected outcome:

- User can confirm naming before download starts.

## WE-20: Auto-fill download title from project

1. Selection belongs to one project context.
2. Download dialog opens.
3. Title defaults to project name.

Expected outcome:

- Common project export gets a meaningful filename automatically.

## WE-21: Auto-generate smart title for ad-hoc selection

1. Selection spans mixed sources or single-item ad-hoc pick.
2. System computes best label (project/address/media-type heuristic) + current date.
3. Dialog pre-fills generated title.

Expected outcome:

- User receives a sensible default without manual naming.

## WE-22: User edits title before ZIP creation

1. User modifies filename input.
2. System validates invalid characters and length.
3. User confirms download.

Expected outcome:

- Final ZIP uses edited safe title.

## WE-23: Generate ZIP containing mixed file types

1. User confirms download.
2. App fetches source files and packages images/PDFs/docs into one ZIP.
3. ZIP starts browser download.

Expected outcome:

- All selected media types are included in one archive.

## WE-24: ZIP download progress and completion feedback

1. ZIP build starts.
2. Export bar or dialog shows progress.
3. Completion toast confirms file written.

Expected outcome:

- Long exports provide transparent status.

## WE-25: ZIP generation canceled by user

1. User starts ZIP generation.
2. User clicks cancel.
3. Pending requests stop and state resets.

Expected outcome:

- User can abort expensive export operations.

## WE-26: ZIP generation fails because of missing files

1. One or more storage objects fail retrieval.
2. ZIP process raises partial failure.
3. Dialog offers retry or "download available only" option.

Expected outcome:

- Failure path is recoverable and explicit.

## WE-27: Export bar closes after deselecting last item

1. User deselects items until count = 0.
2. Bottom bar animates out.
3. Workspace returns to default toolbar-only layout.

Expected outcome:

- Export chrome only appears with active selection.

## WE-28: Keyboard shortcut selects all items

1. User focuses workspace content.
2. User presses Ctrl/Cmd + A.
3. All current result items become selected.

Expected outcome:

- Keyboard parity for power users.

## WE-29: Keyboard escape exits selection mode

1. Export bar is open.
2. User presses Escape.
3. Selection clears and export bar closes.

Expected outcome:

- Users can quickly dismiss selection mode from keyboard.

## WE-30: Selection survives workspace pane fullscreen toggle

1. User selects items.
2. User enters/exits workspace fullscreen mode.
3. Selection and export bar state remain intact.

Expected outcome:

- Layout mode changes do not lose work.

## Validation Checklist

- [ ] Selection supports hover checkbox and modifier-click patterns.
- [ ] Export bar appears only when `selectedCount > 0`.
- [ ] "Select all" and "Select none" are always available in bar.
- [ ] Shared links resolve to deterministic media sets.
- [ ] Shared links enforce organization security boundaries.
- [ ] Download flow supports editable title and mixed-media ZIP output.
- [ ] Copy-to-clipboard and native share have fallback handling.
- [ ] Selection persists across sort/filter/group/fullscreen transitions.
