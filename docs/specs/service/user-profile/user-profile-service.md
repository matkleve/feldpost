# User Profile Service

## What It Is

Loads and updates the **current user’s profile** row (`profiles`) and **role names** (`user_roles` → `roles`). Returns `{ data, error }` tuples for reads/updates—no throws for missing session.

## What It Looks Like

Account page shows display name and org; settings may show role chips from the snapshot.

## Where It Lives

- **Route:** account / settings
- **Runtime module:** `apps/web/src/app/core/user-profile/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Load self | Snapshot or error | `getOwnProfile()` |
| 2 | Update display name | Update `profiles.full_name` | `updateDisplayName` |

## Component Hierarchy

```text
UserProfileService
|- user-profile.types.ts
`- SupabaseService, AuthService
```

## Data

| Table | Operation |
| --- | --- |
| `profiles` | select self, update name |
| `user_roles` / `roles` | select role names |

## State

None on service.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/user-profile/user-profile.service.ts` | Facade |
| `docs/specs/service/user-profile/user-profile-service.md` | This contract |

## Wiring

### Injected services

- `SupabaseService`, `AuthService`

## Acceptance Criteria

- [ ] Never queries profile without authenticated `user id`.
- [ ] Role list flattened per runtime join shape.
- [ ] `account-page` spec links here.
