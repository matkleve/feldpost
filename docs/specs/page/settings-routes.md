# Settings URL and overlay

## What It Is

Deep-linkable settings under `/settings` and optional `/settings/:section/:subsection` segments. The visible UI is the **settings overlay**. `AppComponent` parses the URL, drives `SettingsPaneService.openFromRoute`, and keeps the user on the prior map/app URL when the overlay closes while still on a settings path.

## What It Looks Like

Same overlay as manual open from the nav avatar: two-column panel anchored to the sidebar. URL only changes which section/subsection is selected inside the overlay; the host route remains `MapShellComponent` for `/settings*` per `app.routes.ts`.

## Where It Lives

- **Routes**: `'' | 'map' | 'settings' | 'settings/:section' | 'settings/:section/:subsection'` → `MapShellComponent` (`app.routes.ts`).
- **URL → pane**: `AppComponent` constructor effects (`parseSettingsUrl`, `normalizeSettingsSection`).
- **Overlay UI**: [settings-overlay.md](../ui/settings-overlay/settings-overlay.md), code `features/settings-overlay/`.

## Actions

| #   | User Action                         | System Response                                           | Triggers                    |
| --- | ----------------------------------- | --------------------------------------------------------- | --------------------------- |
| 1   | Navigates to `/settings`            | Overlay opens; section defaults via `openFromRoute`       | `NavigationEnd` → effect    |
| 2   | Navigates to `/settings/account`    | Overlay opens on `account` section                        | URL segments                |
| 3   | Closes overlay while URL is `/settings*` | Router navigates to `lastNonSettingsUrl` (fallback `/`) | overlay close + effect      |
| 4   | Opens overlay from nav without URL  | User may navigate to `/settings` explicitly               | `NavComponent`              |

## Component Hierarchy

```text
AppComponent
├── effects: URL ↔ SettingsPaneService
├── ss-settings-overlay
└── router-outlet → AuthenticatedAppLayout → MapShell (for /settings*)
```

Section bodies (account, appearance, etc.) are specified under [settings-overlay](../ui/settings-overlay/README.md), not duplicated here.

## Data

| Concern           | Owner spec / module                                      |
| ----------------- | -------------------------------------------------------- |
| Section IDs       | `SettingsPaneService` (typed section union)              |
| Section content   | Per-file specs in `docs/specs/ui/settings-overlay/`      |
| Facade orchestration | [settings-pane service](../service/settings-pane/README.md) — code: `core/settings-pane/` |

## State

| Name                 | Owner                 | Notes                                      |
| -------------------- | --------------------- | ------------------------------------------ |
| `lastNonSettingsUrl` | `AppComponent`        | Restores map/media/projects after settings |
| Pane open + section  | `SettingsPaneService` | Signals: `open`, `selectedSectionId`, etc. |

## File Map

| File                              | Purpose                    |
| --------------------------------- | -------------------------- |
| `app.component.ts`                | URL parse + pane sync      |
| `app.routes.ts`                   | `/settings*` → map shell   |
| `features/settings-overlay/*`     | Overlay presentation       |

## Wiring

- `SettingsPaneService.openFromRoute(section, subsection)` centralizes open + selection.
- Invalid section slug: `normalizeSettingsSection` returns `null`; service still receives normalized input from `openFromRoute` implementation (see code).

## Acceptance Criteria

- [ ] Adding a new settings URL segment updates `AppComponent` parsing and this doc in the same change.
- [ ] Overlay UX changes remain authored in `docs/specs/ui/settings-overlay/` with this page linking only.
- [ ] Closing overlay from a `/settings*` URL returns the user to a non-settings surface without stranding them on a blank settings path.
