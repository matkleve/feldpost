# Supabase Service

## What It Is

Root **`SupabaseClient`** provider for the Angular app. Exposes **`readonly client`** created from environment URL and anon key. All Auth, PostgREST, Storage, and RPC calls must flow through this client (or facades that inject this service)—not ad-hoc `createClient` in features.

## What It Looks Like

No UI. Every data and auth operation ultimately uses `inject(SupabaseService).client`. Session and auth *orchestration* live in **`AuthService`**; this module only holds the shared client instance.

## Where It Lives

- **Route:** global (`providedIn: 'root'`)
- **Runtime module:** `apps/web/src/app/core/supabase/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | App bootstrap | Singleton `SupabaseClient` ready | `SupabaseService` construction |
| 2 | Consumer needs DB / auth / storage | Uses `client` from DI | `readonly client` |

## Component Hierarchy

```text
SupabaseService
`- wraps @supabase/supabase-js createClient(environment)
```

## Data

| Source | Layer |
| --- | --- |
| `environment.supabase` | URL + anon key |

## State

None on this service (stateless holder).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/supabase/supabase.service.ts` | Client factory |
| `apps/web/src/app/core/supabase/adapters/` | Reserved |
| `docs/specs/service/supabase/supabase-service.md` | This contract |

## Wiring

### Consumers

- `AuthService`, `GeocodingService`, `ShareSetService`, `MediaQueryService`, adapters across `core/*`.

### Forbidden

- Duplicated `createClient` in feature folders.

## Acceptance Criteria

- [ ] Single Supabase client instance for the SPA.
- [ ] Environment keys only from `environment.ts` / build config.
- [ ] Auth session orchestration documented in `auth-service.md`, not duplicated here.
