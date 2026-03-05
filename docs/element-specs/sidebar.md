# Sidebar

## What It Is

The main navigation rail. Desktop: a frosted-glass pill floating on the left that expands on hover to show labels. Mobile: a fixed bottom tab bar. Contains nav links to Map, Photos, Groups, Settings, and a user avatar at the bottom.

## What It Looks Like

**Desktop (≥768px):** Collapsed = 52px wide pill, left edge, vertically centered. On hover expands to ~150px showing icon + label. Frosted glass background (`backdrop-filter: blur`). Contains 4 nav items stacked vertically + avatar slot at bottom.

**Mobile (<768px):** Fixed bottom bar spanning full width, 56px tall. Icons only, evenly spaced. No avatar (avatar moves to account page).

Warm surface: `--color-bg-surface` at 80% opacity with blur. Active nav link highlighted with `--color-clay`.

## Where It Lives

- **Parent**: `MapShellComponent` template (desktop) / `AppComponent` template (mobile bottom bar)
- **Component**: `NavComponent` at `features/nav/`

## Actions

| #   | User Action              | System Response                | Triggers             |
| --- | ------------------------ | ------------------------------ | -------------------- |
| 1   | Hovers sidebar (desktop) | Sidebar expands, shows labels  | CSS transition 150ms |
| 2   | Mouse leaves sidebar     | Sidebar collapses to icons     | CSS transition 150ms |
| 3   | Clicks nav link          | Navigates to route             | Angular Router       |
| 4   | Clicks disabled nav link | Nothing (pointer-events: none) | —                    |
| 5   | Clicks avatar slot       | Navigates to `/account`        | Angular Router       |
| 6   | Resizes below 768px      | Sidebar becomes bottom tab bar | CSS media query      |

## Component Hierarchy

```
Sidebar                                    ← nav element, fixed/absolute left, frosted glass
├── SidebarPanel                           ← inner flex column, gap between items
│   ├── NavLink "Map"                      ← icon: map, route: /
│   ├── NavLink "Photos"                   ← icon: photo_camera, route: /photos
│   ├── NavLink "Groups"                   ← icon: folder, route: /groups
│   ├── NavLink "Settings"                 ← icon: settings, route: /settings
│   ├── Spacer                             ← flex-1 pushes avatar to bottom
│   └── AvatarSlot                         ← circle with user initial, links to /account
└── SidebarPill                            ← 40×4px pill affordance at 50% height (collapsed only)
```

### NavLink (repeated child)

Each link: Material Icon (20px) + label text. Active state via `routerLinkActive`. Disabled items get `aria-disabled="true"` and muted styling.

## Data

| Field                           | Source                 | Type           |
| ------------------------------- | ---------------------- | -------------- |
| User email (for avatar initial) | `AuthService.user()`   | `User \| null` |
| Nav items                       | Hardcoded in component | `NavItem[]`    |

## State

| Name       | Type      | Default | Controls                                      |
| ---------- | --------- | ------- | --------------------------------------------- |
| `expanded` | `boolean` | `false` | Desktop hover expand (CSS-driven, not signal) |

## File Map

| File                              | Purpose                    |
| --------------------------------- | -------------------------- |
| `features/nav/nav.component.ts`   | Component (already exists) |
| `features/nav/nav.component.html` | Template (already exists)  |
| `features/nav/nav.component.scss` | Styles (already exists)    |

## Wiring

- Imported directly in `MapShellComponent` template
- Uses `RouterLink` and `RouterLinkActive` for navigation
- `AuthService` injected for avatar initial

## Acceptance Criteria

- [x] Desktop: pill on left, expands on hover with 150ms transition
- [x] Desktop: shows icon + label when expanded, icon only when collapsed
- [x] Mobile: bottom tab bar, icons only, 56px tall
- [x] Active route highlighted with `--color-clay` accent
- [x] Disabled items are non-interactive with `aria-disabled`
- [x] Avatar shows first letter of user email
- [x] Avatar links to `/account`
- [x] Frosted glass effect on supporting browsers
