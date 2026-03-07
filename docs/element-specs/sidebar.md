# Sidebar

## What It Is

The main navigation rail. Desktop: a frosted-glass floating panel on the left that expands on hover to show labels. Mobile: a fixed bottom tab bar. Contains nav links to Map, Photos, Groups, Settings, and a user avatar at the bottom.

## What It Looks Like

**Desktop (≥ 48rem / 768px):** Collapsed = `3rem` wide compact rail, left edge, vertically centered. The outer sidebar surface uses the shared container geometry system (`.ui-container`) with panel radius, light inset, and frosted-glass background. At rest, nav items render as centered square icon buttons inside the rail. On hover or keyboard focus, the rail expands to `15rem` and labels reveal without the icons jumping sideways.

**Mobile (< 48rem / 768px):** Fixed bottom bar spanning full width, `3.5rem` tall. Icons only, evenly spaced. No avatar (avatar moves to account page).

Warm surface: `--color-bg-surface` at 85% opacity with blur. Active nav link highlighted with `--color-clay`.

Source of truth for standardized sizing/tokens:

- Use `docs/design/tokens.md` for spacing, widths, radius, and icon sizing.
- Use `docs/design/layout.md` for breakpoint and shell layout rules.
- Use `docs/design/motion.md` for motion timing.
- This element spec defines component structure and behavior; if values conflict, the relevant `docs/design/*` file wins.

## Where It Lives

- **Parent**: `MapShellComponent` template (desktop) / `AppComponent` template (mobile bottom bar)
- **Component**: `NavComponent` at `features/nav/`

## NavLink States

Every nav link has these visual states. Agents must implement **all** of them — not just active.

| State         | Background                           | Text / Icon color        | Extra                                                                | Transition |
| ------------- | ------------------------------------ | ------------------------ | -------------------------------------------------------------------- | ---------- |
| Default       | `transparent`                        | `--color-text-secondary` | —                                                                    | —          |
| Hover         | `--color-bg-elevated` at 40% opacity | `--color-text-primary`   | —                                                                    | 80ms       |
| Active route  | `--color-clay` at 12% opacity        | `--color-clay`           | 3px left border `--color-clay` (desktop), 2px bottom border (mobile) | —          |
| Focus-visible | `transparent`                        | `--color-text-primary`   | 2px `--color-primary` focus ring, 2px offset                         | instant    |
| Pressed       | `--color-bg-elevated` at 55% opacity | `--color-text-primary`   | —                                                                    | 40ms       |
| Disabled      | `transparent`                        | `--color-text-disabled`  | `pointer-events: none`, `aria-disabled="true"`, `opacity: 0.6`       | —          |

**Dark mode:** All tokens resolve correctly. The frosted glass (85% opacity `--color-bg-surface` + `backdrop-filter: blur(12px)`) must be verified against both `--color-bg-base` values — light `#F9F7F4` and dark `#0F0E0C`.

**Avatar states:**

| State               | Visual                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| User loaded         | Circle with first letter of email, `--color-clay` background, white text |
| User null / loading | Circle with `?` placeholder, `--color-bg-elevated` background            |
| Hover               | `ring-2 ring-offset-2 --color-primary`                                   |
| Focus-visible       | Same as hover + 2px `--color-primary` focus ring                         |

## Spacing & Sizing

All values from the `0.25rem` (4px) base unit scale (`docs/design/tokens.md` §3.3). **No ad-hoc values.**

### Desktop sidebar

| Property                      | Value                       | Tailwind                     |
| ----------------------------- | --------------------------- | ---------------------------- |
| Collapsed width               | `3rem` (48px)               | `w-12`                       |
| Expanded width                | `15rem` (240px)             | `w-60`                       |
| Container padding             | `0.25rem` (4px) all sides   | token-based                  |
| Container radius              | `0.75rem` (12px)            | panel token                  |
| Gap between nav items         | `0`                         | —                            |
| Collapsed NavLink size        | `2.5rem × 2.5rem` (40×40px) | token-based                  |
| Expanded NavLink min-height   | `2.75rem` (44px)            | token-based                  |
| Expanded NavLink inline inset | `0.5rem` (8px)              | token-based                  |
| NavLink border-radius         | `0.5rem` (8px)              | `rounded-lg`                 |
| Icon size                     | `1.25rem` (20px)            | `text-xl` (Material Symbols) |
| Icon-to-label gap (expanded)  | `0.75rem` (12px)            | `gap-3`                      |
| Label font size               | `0.8125rem` (13px)          | `text-sm`                    |
| Avatar diameter               | `2.25rem` (36px)            | token-based                  |
| Expand/collapse transition    | `180ms`                     | `duration-180`               |
| Expand easing                 | `ease-out`                  | `ease-out`                   |
| Sidebar left offset from edge | `0.75rem` (12px)            | `left-3`                     |
| Sidebar shadow                | `shadow-md`                 | `shadow-md`                  |
| Sidebar vertical centering    | `top-1/2 -translate-y-1/2`  | —                            |

### Mobile bottom bar

| Property                          | Value                            | Tailwind                           |
| --------------------------------- | -------------------------------- | ---------------------------------- |
| Bar height                        | `3.5rem` (56px)                  | `h-14`                             |
| Bar horizontal padding            | `1rem` (16px)                    | `px-4`                             |
| Safe area bottom                  | `env(safe-area-inset-bottom)`    | `pb-[env(safe-area-inset-bottom)]` |
| Item distribution                 | Even                             | `justify-around`                   |
| Icon size                         | `1.5rem` (24px)                  | `text-2xl`                         |
| Active indicator                  | 2px bottom border `--color-clay` | —                                  |
| No avatar (moves to account page) | —                                | —                                  |

### Desktop container geometry

The desktop sidebar surface is a standard panel container, not a capsule. It must use the shared container geometry abstraction so panel radius, padding, and relative positioning stay consistent with the Search Bar and Upload Panel.

- Container class: `.ui-container`
- Container radius: `--container-radius-panel`
- Container padding: `--ui-container-padding-inline` / `--ui-container-padding-block`
- Child rows align to the container boundary in expanded state
- Collapsed state centers square icon buttons without shifting the icon column on expand

## Keyboard Contract

| Key               | Context          | Behavior                                                          |
| ----------------- | ---------------- | ----------------------------------------------------------------- |
| `Tab`             | Page             | Moves focus into sidebar, then through each nav link in DOM order |
| `Shift+Tab`       | First nav link   | Moves focus out of sidebar to previous page element               |
| `Enter` / `Space` | Focused nav link | Activates the link (navigates to route)                           |
| `Enter` / `Space` | Focused avatar   | Navigates to `/account`                                           |
| `ArrowDown`       | Inside sidebar   | Moves focus to next nav link (wraps to first after avatar)        |
| `ArrowUp`         | Inside sidebar   | Moves focus to previous nav link (wraps to avatar after first)    |
| `Escape`          | Sidebar focused  | Moves focus to the map (returns keyboard control to map pane)     |

**Focus behavior on expand:** When a nav link receives keyboard focus, the sidebar expands to show labels (same as hover). It collapses when focus leaves the sidebar entirely.

**ARIA:** The `<nav>` element has `aria-label="Main navigation"`. Each link uses `routerLinkActive` to set `aria-current="page"` on the active route.

## Actions

| #   | User Action                 | System Response                                                         | Triggers                      |
| --- | --------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| 1   | Hovers sidebar (desktop)    | Sidebar expands, shows labels                                           | CSS transition 150ms ease-out |
| 2   | Mouse leaves sidebar        | Sidebar collapses to centered square icon buttons with no sideways jump | CSS transition 180ms ease-out |
| 3   | Clicks nav link             | Navigates to route                                                      | Angular Router                |
| 4   | Clicks disabled nav link    | Nothing (pointer-events: none)                                          | —                             |
| 5   | Clicks avatar slot          | Navigates to `/account`                                                 | Angular Router                |
| 6   | Resizes below `48rem`       | Sidebar becomes bottom tab bar                                          | CSS media query               |
| 7   | Focuses nav link (keyboard) | Sidebar expands (same as hover)                                         | Focus-within trigger          |
| 8   | Focus leaves sidebar        | Sidebar collapses (if not hovered)                                      | Focus-out                     |

## Component Hierarchy

```
Sidebar                                    ← nav element, fixed/absolute left, frosted glass
├── SidebarPanel                           ← `.ui-container`, standard panel radius
│   ├── NavLink "Map"                      ← icon: map, route: /
│   ├── NavLink "Photos"                   ← icon: photo_camera, route: /photos
│   ├── NavLink "Groups"                   ← icon: folder, route: /groups
│   ├── NavLink "Settings"                 ← icon: settings, route: /settings
│   ├── Spacer                             ← flex-1 pushes avatar to bottom
│   └── AvatarSlot                         ← circle with user initial, links to /account
```

### NavLink (repeated child)

Each link: Material Icon (`1.25rem` / 20px) + label text. Active state via `routerLinkActive`. Disabled items get `aria-disabled="true"` and muted styling.

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

### Structure

- [x] Desktop: floating panel on left, expands on hover
- [x] Desktop: shows icon + label when expanded, centered square icon buttons when collapsed
- [x] Desktop: width matches design system (`3rem` collapsed → `15rem` expanded)
- [x] Mobile: bottom tab bar, icons only, `3.5rem` tall
- [x] Frosted glass effect on supporting browsers (with fallback solid bg)

### States (all required)

- [ ] NavLink default: transparent bg, `--color-text-secondary`
- [ ] NavLink hover: `--color-bg-elevated` at 40%, `--color-text-primary`, 80ms
- [ ] NavLink active route: `--color-clay` at 12% bg, `--color-clay` text/icon, 3px left border (desktop) / 2px bottom border (mobile)
- [ ] NavLink focus-visible: 2px `--color-primary` ring, 2px offset
- [ ] NavLink pressed: `--color-bg-elevated` at 55%
- [ ] NavLink disabled: `--color-text-disabled`, `opacity: 0.6`, `pointer-events: none`, `aria-disabled`
- [ ] Avatar loaded: first letter of email, `--color-clay` bg
- [ ] Avatar null/loading: `?` placeholder, `--color-bg-elevated` bg
- [ ] Avatar hover: `ring-2 --color-primary`
- [ ] Dark mode: frosted glass readable against `#0F0E0C` base

### Spacing (no ad-hoc values)

- [ ] Desktop container uses `.ui-container` with panel radius and token-driven padding
- [ ] Collapsed desktop nav items are square and icon-centered
- [ ] Expanded desktop nav items reveal labels without the icon shifting sideways
- [ ] Expanded desktop icon-to-label gap uses `0.75rem` (12px)
- [ ] Mobile: `h-14 px-4 justify-around` + `env(safe-area-inset-bottom)`

### Keyboard

- [ ] `Tab` / `Shift+Tab` moves in/out of sidebar
- [ ] `ArrowDown` / `ArrowUp` moves between nav links
- [ ] `Enter` / `Space` activates focused link
- [ ] `Escape` returns focus to map
- [ ] Keyboard focus expands sidebar (same as hover)
- [ ] `aria-label="Main navigation"` on `<nav>`
- [ ] `aria-current="page"` on active route link
