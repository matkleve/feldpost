# Invite Service

## What It Is

**QR invite** lifecycle for org onboarding: create draft (`qr_invites` insert), regenerate, revoke, expire, and share-event logging. Requires authenticated user and resolved **organization_id**. Throws on hard failures (callers catch at UI).

## What It Looks Like

Settings invite management and command-palette flows receive **`QrInviteViewModel`** with URL and metadata for QR rendering.

## Where It Lives

- **Route:** settings / invite-only registration flows
- **Runtime module:** `apps/web/src/app/core/invites/`
- **Related:** [qr-invite-flow](../../ui/settings-overlay/qr-invite-flow.md)

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Admin creates draft | Insert row + view model | `createInviteDraft(targetRole)` |
| 2 | Regenerate | Revoke then create | `regenerateInvite` |
| 3 | Revoke / expire | Status updates on `qr_invites` | `revokeInvite`, `expireInvite` |
| 4 | Share telemetry | Log share channel | `logShareEvent` |

## Component Hierarchy

```text
InviteService
|- invite.types.ts
`- SupabaseService → qr_invites
AuthService (session)
```

## Data

| Table | Operation |
| --- | --- |
| `qr_invites` | insert, update status |

## State

None on service (stateless async).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/invites/invite.service.ts` | Facade |
| `docs/specs/service/invites/invite-service.md` | This contract |

## Wiring

### Injected services

- `SupabaseService`, `AuthService`

## Acceptance Criteria

- [ ] Token hashing and URL construction match security assumptions in page specs.
- [ ] RLS enforced by database; this spec does not restate policies.
- [ ] Method names match `invite.service.ts` exports.
