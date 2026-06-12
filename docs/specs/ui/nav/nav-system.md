# App Navigation (sidebar)

## What It Is

Authenticated chrome: floating left sidebar (desktop) or bottom tab bar (mobile) with primary route links and a settings entry that opens the settings overlay. It does not own map or workspace geometry; it coordinates navigation and `SettingsPaneService` visibility with the root shell.

## What It Looks Like

Frosted vertical rail with icon-first rows; hover expands labels without shifting icons. Primary items: Map, Media, Projects. Bottom row uses avatar initial and opens settings (overlay), with `aria-expanded` tied to overlay state. Disabled items are non-interactive with `aria-disabled`.

## Where It Lives

- **Code**: `apps/web/src/app/features/nav/nav.component.ts` (`app-nav`).
- **Shell**: Rendered from `AppComponent` beside `router-outlet` when the URL is not under `/auth` (`app.component.html`).
- **Related layout**: Workspace split and pane live on [workspace-pane](../workspace/workspace-pane.md); nav is outside the authenticated layout’s main `router-outlet` column.

## Actions

| #   | User Action                          | System Response                                      | Triggers                          |
| --- | ------------------------------------ | ---------------------------------------------------- | --------------------------------- |
| 1   | Clicks Map / Media / Projects        | Navigates to `/`, `/media`, `/projects`              | `RouterLink`                      |
| 2   | Clicks avatar / Settings row         | Navigates to `/settings` (overlay opens via root)    | `toggleSettingsOverlay`           |
| 3   | Clicks outside overlay while open    | Closes overlay if click is outside sidebar + panel   | `document:pointerdown` handler    |
| 4   | Resizes below mobile breakpoint      | Bottom tab presentation per nav SCSS                 | responsive rules                  |

## Component Hierarchy

```text
AppComponent (authenticated chrome)
├── app-nav
│   ├── primary nav rows (routerLink)
│   └── settings row → router.navigate('/settings')
└── ss-settings-overlay (sibling; see settings-overlay specs)
```

## Data

| Source              | Use on nav                          |
| ------------------- | ----------------------------------- |
| `AuthService.user()` | Avatar initial, name, avatar URL   |
| `I18nService`       | Labels via `t(key, fallback)`       |
| `SettingsPaneService.open` | Active styling on settings row |

## State

| Name                 | Type    | Effect                                      |
| -------------------- | ------- | ------------------------------------------- |
| `settingsOverlayOpen` | signal | Settings row active appearance            |
| `navItems`           | computed | Ordered primary links                    |

## File Map

| File                    | Purpose              |
| ----------------------- | -------------------- |
| `nav.component.html/ts/scss` | Template + behavior |
| `app.component.html`    | Hosts `app-nav`       |

## Wiring

- Injects `Router`, `AuthService`, `I18nService`, `SettingsPaneService`.
- Settings deep-linking and overlay open/close pairing with URL: [settings routes](../../page/settings-routes.md) and [settings-overlay.md](../settings-overlay/settings-overlay.md).

## Acceptance Criteria

- [ ] New primary destinations are reflected in `navItems` and documented here (or in a linked child spec).
- [ ] Settings entry behavior stays aligned with `SettingsPaneService` and `/settings` URL contract.
- [ ] No duplicate ownership of workspace/map geometry (remains workspace-pane spec).
