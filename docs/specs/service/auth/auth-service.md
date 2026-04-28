# Auth Service

## What It Is

Single owner of **Supabase authentication** for the SPA: session signal, `initialize()` for `APP_INITIALIZER`, sign-in/out/password/MFA flows. **Components must not call `supabase.client.auth` directly.** Errors are returned as `{ error }`; the facade does not throw for expected auth failures.

## What It Looks Like

No UI surface of its own. Login, register, and account flows call into this service; guards read **`session`**, **`user`**, and **`loading`** until `initialize()` completes.

## Where It Lives

- **Route:** global
- **Runtime module:** `apps/web/src/app/core/auth/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | App startup | Load persisted session; subscribe to auth changes | `initialize()` |
| 2 | User signs in / out | Session signal updates | `signIn*`, `signOut`, auth listener |
| 3 | Guard needs assurance | Reads `session` / `loading` | Signals API |
| 4 | MFA enrollment / challenge | MFA helpers on facade | MFA result types |

## Component Hierarchy

```text
AuthService
|- auth.types.ts
|- auth.helpers.ts
`- adapters/
SupabaseService.client.auth
```

## Data

| Source | Layer |
| --- | --- |
| Supabase Auth | `auth.users` session JWT |

## State

| Name | Type | Notes |
| --- | --- | --- |
| session | `Signal<Session \| null>` | null = logged out or not loaded |
| user | `Computed` | From session |
| loading | `Signal<boolean>` | Until `initialize()` resolves |

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/auth/auth.service.ts` | Facade |
| `docs/specs/service/auth/auth-service.md` | This contract |

## Wiring

### Injected services

- `SupabaseService` — only gateway to `client.auth`

### Forbidden

- Feature components calling `client.auth` without going through `AuthService`.

## Acceptance Criteria

- [ ] All auth API usage goes through `AuthService`.
- [ ] `initialize()` completes before route guards rely on session.
- [ ] Error contract is non-throwing for expected failures.
- [ ] MFA-related exports match runtime method names.
