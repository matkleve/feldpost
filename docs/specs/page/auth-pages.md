# Auth Pages (guest routes)

## What It Is

Guest-only screens for sign-in, registration, password reset, and password update after a recovery link. They sit under `/auth/*`, use `guestGuard`, and delegate identity operations to the core auth module.

## What It Looks Like

Centered auth card on a calm neutral backdrop, shared typography and spacing from `auth.styles.scss`. Each route renders one standalone page component (login, register, reset-password, update-password) with form fields, primary actions, and links to sibling auth routes where applicable.

## Where It Lives

- **Routes**: `/auth/login`, `/auth/register`, `/auth/reset-password`, `/auth/update-password` (`apps/web/src/app/app.routes.ts`).
- **Guards**: `guestGuard` on the `/auth` parent; unauthenticated users hitting `/` are steered through `authGuard` toward `/auth/login`.
- **Code**: `apps/web/src/app/features/auth/<screen>/`.

## Actions

| #   | User Action                         | System Response                                      | Triggers                    |
| --- | ----------------------------------- | ---------------------------------------------------- | --------------------------- |
| 1   | Opens `/auth/login`                 | Renders login form                                   | lazy `LoginComponent`       |
| 2   | Submits valid credentials           | Session established; navigates into app shell        | `AuthService`               |
| 3   | Opens `/auth/register`              | Renders registration form                            | lazy `RegisterComponent`    |
| 4   | Opens `/auth/reset-password`        | Renders email-based recovery request UI              | lazy `ResetPasswordComponent` |
| 5   | Lands on `/auth/update-password`    | Renders password update for recovery session         | lazy `UpdatePasswordComponent` |
| 6   | Visits `/auth` with no child path   | Redirects to `login`                                 | route `pathMatch: 'full'`   |

## Component Hierarchy

```text
app.routes /auth (guestGuard)
├── LoginComponent
├── RegisterComponent
├── ResetPasswordComponent
└── UpdatePasswordComponent
```

Normative IO and session rules live in the service contract, not duplicated here.

## Data

| Concern            | Source / owner                                      |
| ------------------ | --------------------------------------------------- |
| Sign-in / sign-up  | [Auth service](../service/auth/auth-service.md)   |
| Session after auth | `AuthService`, Supabase client (RLS-backed)        |

## State

| Name              | Owner              | Notes                                      |
| ----------------- | ------------------ | ------------------------------------------ |
| Guest vs session  | `guestGuard` / core | Redirect logged-in users away from `/auth` |

## File Map

| File                         | Purpose                    |
| ---------------------------- | -------------------------- |
| `app.routes.ts`              | Lazy routes + guards       |
| `features/auth/*/*.component.ts` | Per-screen UI          |

## Wiring

- Route table lazy-loads each screen; no feature-level facade beyond components + `AuthService` injection.
- **Child UI detail:** add dedicated component specs under `docs/specs/component/` when a screen grows non-trivial behavior (FSM, ownership matrix); this page spec stays the route-area index only.

## Acceptance Criteria

- [ ] Every `/auth/*` path in `app.routes.ts` is listed under **Where It Lives** here or in a linked child spec.
- [ ] New auth screens are added with `guestGuard` (or an explicitly documented exception) and linked from this doc.
- [ ] Service-level auth rules remain single-sourced in `docs/specs/service/auth/`.
