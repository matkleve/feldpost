# Share link audience dialog

## What It Is

Modal shell for choosing **share link audience** (`public`, `organization`, or `named`) before `ShareSetService.createOrReuseShareSet` runs. Named audience collects comma-separated recipient user UUIDs (same organization); the server validates membership.

## What It Looks Like

A fixed-position panel with radio options, optional multi-line UUID field for `named`, inline validation error, and Cancel / Create link actions.

## Where It Lives

- **Code:** `apps/web/src/app/shared/share-link-audience-dialog/`
- **Consumers:** `WorkspacePaneFooterComponent`, `WorkspaceSelectedItemsGridComponent`

## Actions

| # | User action | System response |
| --- | --- | --- |
| 1 | Chooses audience + confirms | Emits `ShareAudienceDialogResult` with `shareGrant: 'view'`. |
| 2 | Chooses named with invalid UUIDs | Shows inline error; does not emit. |
| 3 | Cancel | Emits `cancelled`. |

## Component Hierarchy

```text
ShareLinkAudienceDialogComponent (root dialog + backdrop)
```

## Data

| Output | Shape |
| --- | --- |
| `confirmed` | `ShareAudienceDialogResult` from `share-set.types.ts` |

## State

Internal signals: `audience`, `namedRecipientsRaw`, `inlineError`. No FSM enum input from parent; dialog owns local choice until confirm.

## File Map

| File | Purpose |
| --- | --- |
| `share-link-audience-dialog.component.ts` | Logic + i18n |
| `share-link-audience-dialog.component.html` | Layout |
| `share-link-audience-dialog.component.scss` | Dialog chrome |

## Visual Behavior Contract

| Behavior | Visual geometry owner | Stacking context owner | Interaction hit-area owner | Selector(s) | Layer | Test oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Dialog surface | `.share-link-audience-dialog` | `.share-link-audience-dialog` | primary actions | `.share-link-audience-dialog__actions` | `z-index: 20` | focus trap not required MVP; backdrop closes on click |
| Backdrop dim | `.share-link-audience-dialog__backdrop` | self | full-screen hit | `.share-link-audience-dialog__backdrop` | `z-index: 19` | click emits cancel |
| Inline validation | `.share-link-audience-dialog__error` | parent dialog | n/a (text) | `[role="alert"]` | content | invalid UUID shows message |

## Wiring

- Parent sets dialog visible with `@if`; subscribes to `confirmed` / `cancelled`.
- Uses `I18nService.t` for all visible strings.

## Acceptance Criteria

- [ ] All three audiences selectable; named shows UUID field.
- [ ] Confirm with invalid named input does not emit `confirmed`.
- [ ] Copy matches i18n keys registered in translation workbench.
