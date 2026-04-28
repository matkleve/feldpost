# Account (shared component)

## What It Is

The standalone `app-account` surface for viewing and editing the signed-in user’s profile, email, password, MFA factors, and destructive actions (logout/delete). It coordinates `AuthService`, `UserProfileService`, `ToastService`, and shared dialogs; it does not own routing.

## What It Looks Like

Stacked `account-card` sections: identity header with avatar initial or skeleton, profile name field, login/email/password controls, MFA enrollment panel, and danger zone. Loading shows skeleton placeholders; async sections disable controls and show busy labels on primary buttons. Confirm dialogs overlay via parent-controlled `*if` blocks for logout and account deletion.

## Where It Lives

- **Code:** `apps/web/src/app/shared/account/`
- **Routes:** Consumed from account/settings routes in `features/`; this spec covers only the shared component boundary.

## Actions

| #   | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1   | Load view | Profile + MFA snapshot fetched; `loading` clears | `ngOnInit` |
| 2   | Save display name | `savingProfile` toggles; toast on success/failure | `saveDisplayName` |
| 3   | Update email / password | respective busy signals; auth flows | button handlers |
| 4   | Enroll / verify MFA | `mfaBusy`, QR/secret signals update | MFA handlers |
| 5   | Open logout confirm | `logoutConfirmOpen` true | button |
| 6   | Confirm logout | `authService.signOut` | dialog confirm |
| 7   | Open delete confirm | `deleteConfirmOpen` true | button |
| 8   | Confirm delete with phrase `DELETE` | account deletion flow | guarded confirm |

## Component Hierarchy

```text
app-account
├── identity header [loading skeleton | live]
├── profile card
├── login card (email/password)
├── MFA card [optional QR panel]
├── danger zone
├── app-confirm-dialog [logout]
└── app-confirm-dialog [delete]
```

## Data

| Service / source | Data |
| ---------------- | ---- |
| `AuthService` | `user()`, sign-out, password/email/MFA APIs |
| `UserProfileService` | profile load/save |
| `ToastService` | success/error toasts |
| `I18nService` | `translateOriginal` / display strings |

## State

| Signal / field | Purpose |
| -------------- | ------- |
| `loading` | Initial fetch gate; disables inputs |
| `savingProfile`, `updatingEmail`, `updatingPassword`, `sendingReset`, `mfaBusy`, `deletingAccount` | Per-operation busy |
| `fullName`, `roleNames`, `organizationId`, `pendingDisplayName`, `pendingEmail`, passwords | Editable + mirrored profile |
| `mfaFactors`, `assuranceLevel`, `mfaEnrollFactorId`, `mfaQrCode`, `mfaSecret`, `mfaCode` | MFA enrollment |
| `logoutConfirmOpen`, `deleteConfirmOpen`, `deletePhrase` | Destructive confirm gating |

## Programmatic state / FSM notes

Visual readiness is gated primarily by `loading()` and per-section `*Busy` signals. Dialog open flags (`logoutConfirmOpen`, `deleteConfirmOpen`) form a mutually exclusive pair with the rest of the page remaining interactive underneath per overlay implementation. **Future hardening:** consolidate cross-cutting busy + dialog presence into a single typed view-state enum with `[attr.data-state]` when refactoring; until then, ownership below documents signal-driven regions.

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/account/account.component.ts` | Orchestration + handlers |
| `apps/web/src/app/shared/account/account.component.html` | Layout + dialogs |
| `apps/web/src/app/shared/account/account.component.scss` | Section + skeleton styling |

## Wiring

- Feature routes import `AccountComponent` inside authenticated shells.
- Confirm dialogs receive translated labels from the component; never use `window.confirm`.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ---------------------- | ----------- |
| Page stack | `.account-page` | `.account-page` | focusable controls in cards | `.account-card` | content | cards stack with token gaps |
| Loading skeleton | `.account-skeleton` on header fields | section card | none (inert) | `.account-skeleton*` | content | skeleton only while `loading()` |
| Primary actions | buttons with `uiButton*` | parent card | same buttons | `.ui-button` | content | disabled when `loading()` or section busy |
| Confirm overlays | dialog host (shared confirm) | overlay layer from parent | dialog buttons | `app-confirm-dialog` | overlay (feature shell) | Escape/focus managed by dialog host |

### Ownership Triad Declaration

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |
| Skeleton | `.account-skeleton` | `@if (loading())` | `.account-skeleton` | ✅ |
| Button disabled | `button` | `[disabled]` expr | `button` | ✅ |

## Acceptance Criteria

- [ ] Initial load shows skeleton state until profile snapshot resolves or errors surface via toast.
- [ ] Destructive confirmations use `app-confirm-dialog`; delete requires phrase match before confirm enables.
- [ ] No direct Leaflet or map imports.
- [ ] MFA QR/secret blocks clear when enrollment completes or is cancelled per implementation.
