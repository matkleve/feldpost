# Account feature host

## What It Is

Thin Angular feature wrapper (`AccountFeatureComponent`) that re-exports the shared account surface (`app-account`) for optional standalone hosting. Primary in-product account management today is the **Konto** section inside the settings overlay, which uses the same shared component.

## What It Looks Like

Identical to [shared Account](../component/account/account.md): stacked cards, MFA, danger zone. No additional chrome at the feature layer beyond the shared selector.

## Where It Lives

- **Code**: `apps/web/src/app/features/account/account.component.ts` (`app-account-feature`).
- **Primary UX**: [account-page.md](../ui/settings-overlay/account-page.md) and [account-settings-section.md](../ui/settings-overlay/account-settings-section.md) inside the overlay.
- **Normative component contract**: [account.md](../component/account/account.md).

## Actions

| #   | User Action                    | System Response                    | Triggers              |
| --- | ------------------------------ | ---------------------------------- | --------------------- |
| 1   | Feature host is mounted        | Renders `<app-account />`          | template only         |
| 2   | All interactive account flows | Same as shared account spec        | shared component      |

## Component Hierarchy

```text
app-account-feature (features/account)
└── app-account (shared/account)  ← canonical behavior spec
```

## Data

Owned entirely by the shared component and `AuthService` / `UserProfileService`; see [account.md](../component/account/account.md).

## State

No feature-local state; shared `app-account` FSM and signals apply.

## File Map

| File                                   | Purpose              |
| -------------------------------------- | -------------------- |
| `features/account/account.component.ts` | Standalone wrapper |
| `shared/account/*`                     | Implementation       |

## Wiring

- Imports `AccountComponent` from `shared/account`.
- If a future **routed** account page is added, extend **Where It Lives** with the path and keep this file as the feature-area index linking the route to [account.md](../component/account/account.md).

## Acceptance Criteria

- [ ] Behavioral or visual changes to account UI are specified in `docs/specs/component/account/account.md` (or overlay section specs), not duplicated here.
- [ ] Any new route that mounts `app-account-feature` is listed here with its path.
- [ ] Overlay “Konto” flows stay cross-linked from [account-page.md](../ui/settings-overlay/account-page.md).
