# Settings URL and overlay

## What It Is

Deep-linkable settings as a **suffix on the active app shell**, not a standalone page:

- `/{shell}/settings`
- `/{shell}/settings/:section`
- `/{shell}/settings/:section/:subsection`

`shell` is one of: `map` (canonical for map root), `media`, `projects`, or `projects/:projectId`.

The visible UI is the **settings overlay** on `AppComponent`. The shell route (`MapShellComponent`, `MediaComponent`, `ProjectsPageComponent`, …) stays mounted under the authenticated layout `router-outlet`.

Legacy top-level `/settings/...` URLs redirect to `/map/settings/...`.

## What It Looks Like

Same overlay as manual open from the nav avatar: two-column panel anchored to the sidebar. The URL encodes shell + section + subsection; closing the overlay strips the `/settings/...` suffix and leaves the shell path (e.g. `/media/settings/account` → `/media`).

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
| 3   | Opens settings from nav while on `/projects`     | Navigates to `/projects/settings`                            | `NavComponent.toggleSettingsOverlay` |
| 4   | Closes overlay while URL has settings suffix     | Router navigates to shell-only path (`stripSettingsSuffix`)  | overlay close + effect           |
| 5   | Navigates to legacy `/settings/account`          | Redirect to `/map/settings/account`                          | route redirect                   |
| 6   | Cold link `/media/settings/general/language`     | Media shell + overlay on general → language anchor           | parse + `openFromRoute`          |

## Component Hierarchy

```text
AppComponent
├── effects: URL ↔ SettingsPaneService
├── ss-settings-overlay
└── router-outlet → AuthenticatedAppLayout → { MapShell | Media | Projects } (shell from URL)
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
| `features/nav/nav.component.ts`                   | Open/close settings on current shell |
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
