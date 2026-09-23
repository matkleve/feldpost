# Panel surface

## What It Is

One frosted panel in the panel column. Ids are `upload`, `download`, `shared-media`, `tips`, and `help`.

## What It Looks Like

`@include shell-box`, the same mixin as a control container. A title row and a projected body.

| `panelId` | Body | Spec |
| --- | --- | --- |
| `upload` | `UploadPanelComponent` (not `app-upload-shell`) | upload panel wiring in layout |
| `download` | `SelectedItemsPanelComponent` | [selected-items-panel.md](./selected-items-panel.md) |
| `shared-media` | Placeholder until product exists | — |
| `tips` | Placeholder until product exists | — |
| `help` | Placeholder until product exists | — |

## Where It Lives

- **Parent:** `app-shell-panel-column`, one instance per open panel.
- **Appears when:** that panel id is open.

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Clicks the surface close control | `ShellLayoutService.close(id)` | panel closes |
| 2 | Uses the upload body | Existing upload behavior | `UploadPanelComponent` |

## Component Hierarchy

```text
app-shell-panel-surface
├── header
│   ├── title
│   └── close button
└── body (projected)
    ├── app-upload-panel [id upload]
    ├── app-selected-items-panel [id download]
    ├── placeholder [id shared-media, tips, help]
```

## Data

| Source | Contract | Operation |
| --- | --- | --- |
| Input `panelId` | `ShellPanelId` | Read |
| `I18nService` | title key | Read |

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| `panelId` | input | required | Which body mounts |

Open/closed is owned by `ShellLayoutService`, not this surface.

## File Map

| File | Purpose |
| --- | --- |
| `layout/shell/shell-panel-surface.component.ts` | Body switch |
| `layout/shell/shell-panel-surface.component.html` | Header and body |
| `layout/shell/shell-panel-surface.component.scss` | `shell-box` |

## Wiring

The workspace pane Upload tab is not a second host for upload. Upload has one home: `upload` surface. Selected items has one home: `download` surface ([selected-items-panel.md](./selected-items-panel.md)).

```mermaid
flowchart TB
  surface[app-shell-panel-surface]
  surface --> upload[app-upload-panel]
  surface --> download[app-selected-items-panel]
  surface --> stubs[shared-media / tips / help placeholders]
```

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Panel box | `app-shell-panel-surface` | `app-shell-panel-surface` | close button and body | `:host` | content `0` | `shell-box` |
| Body | projected component | surface | projected controls | body | content `0` | upload panel visible |

## Acceptance Criteria

- [ ] `upload` renders `UploadPanelComponent` and not `app-upload-shell`.
- [ ] `download` renders `SelectedItemsPanelComponent` per [selected-items-panel.md](./selected-items-panel.md).
- [ ] `help`, `tips`, `shared-media` render placeholders until those products exist.
- [ ] Close calls `close(panelId)` once.
- [ ] Title copy uses `t(key, fallback)`.
