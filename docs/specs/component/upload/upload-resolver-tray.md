# Upload resolver tray

> **Parent:** [upload-shell.md](./upload-shell.md)  
> **Service:** [upload-location-resolution.md](../../service/media-upload-service/upload-location-resolution.md)

## What it is

`app-upload-resolver-tray` — active address-choice UI inside `.upload-shell__dock` (layout-only column; tray owns its own frosted card). Renders below the panel when both are visible; tray-only when the panel is closed.

**Active layout (Cursor Questions–inspired):** section label **Address resolver**, optional carousel (`‹` **1/4** `›` when multiple groups), **`h2` question** (scenario-specific — see [question copy contract](./upload-resolver-tray.question-copy.md)), folder path (tooltip only), numbered answers, **affected-media chip** (`{count} media` + dropdown), footer **Skip** + **Continue**.

## Affected-media chip

- Neutral `app-chip` on a button; label `{count} media`.
- Click → `app-dropdown-shell` list of upload job file names (scroll when long).
- Row action **Ask later** → `isolateJobFromGroup` (queues a single-job tray card in the carousel **without** switching the active card).
- Folder path uses `title` / `aria-label`, not a visible “Folder” prefix.

**Question copy (normative):** [upload-resolver-tray.question-copy.md](./upload-resolver-tray.question-copy.md) — city vs address vs door vs source; door-number grid/input is planned, not MVP.

## Visual modes

| Mode | `data-state` | When |
| --- | --- | --- |
| passive | `passive` | Batch active, panel closed, no open disambiguation groups |
| active | `active` | One or more groups with `resolutionGateOpen` |
| hidden | (unmounted branch) | Idle |

`passiveStatusLine` comes from `UploadPanelSignalsService` (G12), not the resolution service.

## Ownership matrix

| Behavior | Geometry | State | Visual |
| --- | --- | --- | --- |
| Passive line | `:host` | `data-state=passive` | `.upload-resolver-tray__passive` |
| Active card | `.upload-resolver-tray` | `data-state=active` | `.upload-resolver-tray` |
| Choice row | `.upload-resolver-tray__choice` | `__choice--selected` | number badge (1–9) + label; keyboard digits select, Enter continues, Escape skips; interaction emphasis on row |
| Score micro-bar | `.upload-resolver-tray__choice-score-col` | `data-score-band` (`low` / `okay` / `strong`) | centered percent + 3px track (`--score-bar-width` 1.5rem); fill width = score |
| Footer actions | `.upload-resolver-tray__footer` | — | skip text + continue primary |

## Score micro-bar

Decorative confidence readout under each option’s percent (not announced separately; score stays in `optionAriaLabel`).

| Band | Score range | Fill color |
| --- | --- | --- |
| `low` | &lt; 0.70 | `--score-ink-neutral` on column (`foreground`/`background` mix, achromatic) |
| `okay` | 0.70 – 0.979 | `--primary` |
| `strong` | ≥ 0.98 | `--chart-1` (high-trust / near-certain) |

Fill width: `calc(var(--score-fill) * 1%)` where `--score-fill` is 0–100 from normalized candidate score. Column: percent centered above track; hosts `--score-track` (light neutral) and `--score-ink-neutral` (percent + low fill) — **not** `--muted-foreground` / `--border` (cool hue). Track: `height: 3px`, `width: 1.5rem` (`--score-bar-width`), `border-radius: var(--radius-full)`.

## Interaction emphasis

Choice rows follow [`state-visuals.md`](../../../design/state-visuals.md) § Interaction emphasis:

| State | Ink | Background |
| ----- | --- | ------------ |
| Idle | `--foreground` | transparent |
| Hover / focus (unselected) | `--primary` | primary 8% mix |
| Selected (`__choice--selected`) | `--interaction-selected-ink` | selected-ink 10% mix |
| Selected + hover | `--primary` (wins) | primary 8% mix |

**Test oracle:** Selected answer is blue at rest; hovering it turns orange; unselected rows only orange on hover.

## Inputs / outputs

- **Inputs:** `panelOpen`, `embeddedInPane` (false on map)
- **Outputs:** `candidateSelected`, `groupChanged`, `deferRequested`, `previewLocation`

## Lane contract (OD-2)

Jobs in `awaiting_disambiguation` stay in **Queue** with label “Choose address”. Tray is the primary resolution path; row `candidate_select` is secondary.

## `disambiguationKind` (tray copy and layout)

| Kind | When | UI |
| --- | --- | --- |
| `geocode` (default) | Multiple forward-geocode hits | Question + options per [question-copy](./upload-resolver-tray.question-copy.md#question-matrix-normative) (`city` / `address` / `door`) |
| `source` | Text coords vs EXIF metadata > `sourceAgreementRadiusMeters` | `upload.resolver.question.source` + two options |
| `context_distance` | Placement beyond org `contextDistanceMaxMeters` from nearest project GPS link | **Prompt B** — confirm + embedded location search |

## Dev QA (local only)

`upload-dev-flags.ts`:

- `mockResolverTray: true` — three static groups in `upload-resolver-tray.mock.ts`; tray stays **active** with carousel; Skip/Continue advance cards without touching upload jobs.
- Set both `mockResolverTray` and `dockAlwaysVisible` to **false** before merge.

## MVP scope (OD-7)

Pre-upload gate only. No tray for `phase === 'complete'` or post-upload correction.

## Acceptance criteria

- [ ] Tray mounted inside `upload-shell` on map route
- [ ] Active mode shows numbered choices, carousel when multiple groups, Skip + Continue footer
- [ ] `source` kind shows two candidates without city collapse
- [ ] Selecting a candidate applies to the whole group and re-queues jobs
