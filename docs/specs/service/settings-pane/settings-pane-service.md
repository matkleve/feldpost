# Settings Pane Service

## What It Is

Headless **settings overlay** state: open/closed, selected section id, subsection navigation requests, and **invite-management** open requests (from settings vs command palette). Maps route-driven opens to internal signals consumed by the settings shell component.

## What It Looks Like

Full-screen or large overlay settings UI reacts to **`open`**, **`selectedSectionId`**, and request tokens for subsection and invite flows.

## Where It Lives

- **Route:** `/settings/**` and global command actions
- **Runtime module:** `apps/web/src/app/core/settings-pane/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Toggle overlay | `open` signal | `setOpen` |
| 2 | Pick section | Updates selection + clears subsection | `setSelectedSection` |
| 3 | Open invite management from command | Bumps invite request token + opens | `openInviteManagementFromCommand` |
| 4 | Route deep-link | Applies section + subsection | `openFromRoute` |

## Component Hierarchy

```text
SettingsPaneService (signals)
`- consumed by settings shell / overlay components
```

## Data

None (UI routing state only).

## State

| Name | Type | Notes |
| --- | --- | --- |
| open | `ReadonlySignal<boolean>` | Overlay visibility |
| selectedSectionId | `ReadonlySignal<SectionId \| null>` | Active tab |
| subsectionRequest | signal | `{ id, requestToken }` |
| inviteSectionRequest | signal | Invite flow context |

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/settings-pane/settings-pane.service.ts` | Facade |
| `docs/specs/service/settings-pane/settings-pane-service.md` | This contract |

## Wiring

None (leaf UI-orchestration service).

## Acceptance Criteria

- [ ] Section id union matches runtime type (`general`, `appearance`, …).
- [ ] Request-token pattern documented for “react to same id twice” scenarios.
- [ ] `settings-page` / overlay specs link here.
