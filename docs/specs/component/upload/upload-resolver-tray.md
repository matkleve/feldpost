# Upload resolver tray

> **Parent:** [upload-shell.md](./upload-shell.md)  
> **Service:** [upload-location-resolution.md](../../service/media-upload-service/upload-location-resolution.md)

## What it is

`app-upload-resolver-tray` — active address-choice UI inside `.upload-shell__dock` (same frosted mother container as `app-upload-panel`). Renders below the panel when both are visible; tray-only when the panel is closed.

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
| Active strip | `.upload-resolver-tray` | `data-state=active` | `.upload-resolver-tray` |
| Option row | `.upload-resolver-tray__option` | — | border, hover via component |

## Inputs / outputs

- **Inputs:** `panelOpen`, `embeddedInPane` (false on map)
- **Outputs:** `candidateSelected`, `groupChanged`, `deferRequested`, `previewLocation`

## Lane contract (OD-2)

Jobs in `awaiting_disambiguation` stay in **Queue** with label “Choose address”. Tray is the primary resolution path; row `candidate_select` is secondary.

## `disambiguationKind` (tray copy and layout)

| Kind | When | UI |
| --- | --- | --- |
| `geocode` (default) | Multiple forward-geocode hits | City-collapsed options |
| `source` | Text coords vs EXIF metadata > `sourceAgreementRadiusMeters` | Two flat options (folder/file address vs photo GPS); title key `upload.resolver.sourceConflict.title` |
| `context_distance` | Placement beyond org `contextDistanceMaxMeters` from nearest project GPS link | **Prompt B** — confirm + embedded location search |

## MVP scope (OD-7)

Pre-upload gate only. No tray for `phase === 'complete'` or post-upload correction.

## Acceptance criteria

- [ ] Tray mounted inside `upload-shell` on map route
- [ ] Active mode shows city-collapsed options and group picker when multiple groups
- [ ] `source` kind shows two candidates without city collapse
- [ ] Selecting a candidate applies to the whole group and re-queues jobs
