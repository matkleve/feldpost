# Settings URL and overlay

## What It Is

Deep-linkable settings as a **suffix on the active app shell**, not a standalone page:

- `/{shell}/settings`
- `/{shell}/settings/:section`
- `/{shell}/settings/:section/:subsection`

`shell` is one of: `map` (canonical for map root), `media`, `projects`, `projects/:projectId`, `colleagues`, or `organization` (and `organization/:section`). Matchers: `apps/web/src/app/layout/authenticated-shell-matchers.ts`.

The visible UI is the settings surface inside `app-shell-main-canvas`. The shell route stays mounted under the outlet and is covered while settings is open.

Legacy top-level `/settings/...` URLs redirect to `/map/settings/...`.

## What It Looks Like

The same canvas surface the left rail opens. Two columns inside the canvas box. The URL encodes shell + section + subsection; closing strips the `/settings/...` suffix and leaves the shell path (e.g. `/media/settings/account` → `/media`).

## Where It Lives

- **Routes:** `apps/web/src/app/layout/authenticated-app.routes.ts` — per-shell `settings` suffix routes; legacy `settings` → `map/settings` redirects.
- **URL helpers:** `apps/web/src/app/core/settings-pane/settings-url.helpers.ts`
- **URL → pane:** `AppComponent` constructor effects (`parseSettingsUrl`, overlay close → `stripSettingsSuffix`).
- **In-overlay navigation:** `SettingsOverlayComponent` updates the URL on section / TOC selection (`replaceUrl: true`).
- **Overlay UI:** [settings-overlay.md](../ui/settings-overlay/settings-overlay.md), code `features/settings-overlay/`.

## Actions

| #   | User Action                                      | System Response                                              | Triggers                         |
| --- | ------------------------------------------------ | ------------------------------------------------------------ | -------------------------------- |
| 1   | Navigates to `/media/settings`                   | `MediaComponent` in outlet; overlay opens (default section)  | `NavigationEnd` → effect         |
| 2   | Navigates to `/map/settings/map/marker-motion`   | `MapShellComponent`; overlay opens map section + subsection  | URL segments                     |
| 3   | Opens settings from the left rail while on `/projects` | Navigates to `/projects/settings`                     | `ShellControlAreaComponent` |
| 4   | Closes overlay while URL has settings suffix     | Router navigates to shell-only path (`stripSettingsSuffix`)  | overlay close + effect           |
| 5   | Navigates to legacy `/settings/account`          | Redirect to `/map/settings/account`                          | route redirect                   |
| 6   | Cold link `/media/settings/general/language`     | Media shell + overlay on general → language anchor           | parse + `openFromRoute`          |

## Component Hierarchy

```text
AppComponent
├── effects: URL ↔ SettingsPaneService
└── router-outlet → AuthenticatedAppLayout
    └── app-shell-main-canvas
        ├── shell route (map, media, projects) — inert while settings is open
        └── ss-settings-overlay
```

## Data

| Concern           | Owner spec / module                                      |
| ----------------- | -------------------------------------------------------- |
| Section IDs       | `SettingsPaneService` (typed section union)              |
| URL parsing       | `settings-url.helpers.ts`                              |
| Section content   | Per-file specs in `docs/specs/ui/settings-overlay/`      |
| Facade orchestration | [settings-pane service](../service/settings-pane/README.md) — code: `core/settings-pane/` |

## State

| Name                 | Owner                 | Notes                                      |
| -------------------- | --------------------- | ------------------------------------------ |
| Pane open + section  | `SettingsPaneService` | Signals: `open`, `selectedSectionId`, etc. |
| Shell path           | Router URL            | Prefix before `/settings` segment          |

## File Map

| File                                              | Purpose                         |
| ------------------------------------------------- | ------------------------------- |
| `app.component.ts`                                | URL parse + overlay sync        |
| `layout/authenticated-app.routes.ts`              | Shell + settings suffix routes  |
| `core/settings-pane/settings-url.helpers.ts`      | Parse / build / strip URLs        |
| `features/settings-overlay/settings-overlay.component.ts` | Section / TOC → URL sync |
| `layout/shell/shell-control-area.component.ts`    | Left rail navigates to the settings URL |
| `features/settings-overlay/*`                     | Overlay presentation            |

## Wiring

- `SettingsPaneService.openFromRoute(section, subsection)` centralizes open + selection.
- **Subsection slugs** must match `SETTINGS_SECTION_ANCHORS` in `apps/web/src/app/features/settings-overlay/settings-section-anchors.const.ts` (examples: `/map/settings/general/language`, `/media/settings/map/marker-motion`).
- Invalid section slug: `normalizeSettingsSection` returns `null`; `openFromRoute` still defaults section via service.

## Acceptance Criteria

- [ ] Settings URLs use `/{shell}/settings/...` for all new links and docs.
- [ ] Legacy `/settings/...` redirects preserve section/subsection.
- [ ] Closing overlay from a settings suffix URL returns to the same shell without loading the wrong host (e.g. map shell under `/media`).
- [ ] Overlay UX changes remain authored in `docs/specs/ui/settings-overlay/` with this page linking only.
