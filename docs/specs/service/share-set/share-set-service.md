# Share Set Service

## What It Is

Facade for **share link** creation and resolution. Calls RPCs **`create_or_reuse_share_set`** and **`resolve_share_set`** via `SupabaseService`. Throws on RPC error or malformed payload (contract for callers: catch at UI boundary). **General** org permissions are unchanged by share links; see [authorization-model.md](../../system/authorization-model.md) and [share-set-access-model.md](share-set-access-model.md).

## What It Looks Like

Share/export UI receives a **token** and **expiry** after creation (plus chosen **audience** and optional **named recipients**), and a list of **media ids** when resolving a token. The open-link flow always calls **`resolveShareSet(token)`**; the database inspects stored audience and the caller’s auth context.

## Where It Lives

- **Route:** workspace / export flows
- **Runtime module:** `apps/web/src/app/core/share-set/`
- **Access matrix:** [share-set-access-model.md](share-set-access-model.md)

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | User creates share from selection | RPC returns share set id + token + expiry | `createOrReuseShareSet(mediaIds, options?)` |
| 2 | Viewer opens link (paste URL) | Client sends token only | `resolveShareSet(token)` → single RPC |

## Component Hierarchy

```text
ShareSetService
|- share-set.types.ts
|- share-set.helpers.ts (parsing / validation helpers)
`- adapters/ (reserved)
Supabase RPC (SECURITY DEFINER)
```

## Data

| RPC | Purpose |
| --- | --- |
| `create_or_reuse_share_set` | Persist set + token + `audience` + `share_grant` + optional recipients |
| `resolve_share_set` | Load items by token; **one** function branches on `audience` and caller |

### Types (logical)

| Name | Values | Storage |
| --- | --- | --- |
| `ShareLinkAudience` | `public`, `organization`, `named` | Postgres enum on `share_sets` |
| `ShareLinkGrant` | `view` (extend later for comment/edit via new RPCs) | Postgres enum on `share_sets` |

## State

None (stateless facade).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/share-set/share-set.service.ts` | Facade |
| `docs/specs/service/share-set/share-set-service.md` | This contract |
| `docs/specs/service/share-set/share-set-access-model.md` | Audience × caller matrix |

## Wiring

### Injected services

- `SupabaseService`

### Notes

- RPC parameter names follow DB (`p_image_ids` legacy name); resolved rows map **`media_item_id`** to `mediaId` in the view model.
- Optional RPC params: `p_audience`, `p_share_grant`, `p_recipient_user_ids` (required when audience is `named`).

### Security (database-first)

- **`resolve_share_set`** is executable by **`anon`** and **`authenticated`**. The client **never** selects a different RPC per audience: the function loads the row by **token hash**, reads **`audience`**, then applies **caller context** (`auth.uid()`, `user_org_id()`, `share_set_recipients`). Invalid combinations return **empty** result sets (no row leakage).
- **`ShareGrant` / `share_grant`** caps **share-mediated** behavior only. It does **not** strip or replace normal **RLS + role** authority when the same user uses authenticated table access outside share RPCs.
- **`create_or_reuse_share_set`** remains **authenticated** only; viewers cannot create links per existing policy.
- Token possession is necessary but not sufficient when `audience` is `organization` or `named`.
- Raw share token is never stored; only **`token_hash`** is persisted.

## Acceptance Criteria

- [x] Creation and resolution paths documented with RPC names and single-resolve mandate.
- [x] RLS and share semantics remain database-first; share-only writes stay in future dedicated RPCs, not widened core RLS.
- [ ] Smoke playbook steps for share sets reference this facade.
