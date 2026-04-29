# Share Set Service

## What It Is

Facade for **share link** creation and resolution. Calls RPCs **`create_or_reuse_share_set`** and **`resolve_share_set`** via `SupabaseService`. Throws on RPC error or malformed payload (contract for callers: catch at UI boundary).

## What It Looks Like

Share/export UI receives a **token** and **expiry** after creation, and a list of **media ids** when resolving a token for read-only views.

## Where It Lives

- **Route:** workspace / export flows
- **Runtime module:** `apps/web/src/app/core/share-set/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | User creates share from selection | RPC returns share set id + token + expiry | `createOrReuseShareSet(mediaIds, expiresAt?)` |
| 2 | Anonymous viewer opens link | RPC returns ordered media rows | `resolveShareSet(token)` |

## Component Hierarchy

```text
ShareSetService
|- share-set.types.ts
`- adapters/ (reserved)
Supabase RPC
```

## Data

| RPC | Purpose |
| --- | --- |
| `create_or_reuse_share_set` | Persist set + token |
| `resolve_share_set` | Load items by token |

## State

None (stateless facade).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/share-set/share-set.service.ts` | Facade |
| `docs/specs/service/share-set/share-set-service.md` | This contract |

## Wiring

### Injected services

- `SupabaseService`

### Notes

- RPC parameter names follow DB (`p_image_ids` legacy name); resolved rows map **`media_item_id`** to `mediaId` in the view model.

### Security (database-first)

- **`resolve_share_set`** is executable by **`anon`** and **`authenticated`**. Resolution matches the share token to a **non-revoked, non-expired** row; possession of the token is the read gate (no `user_org_id()` filter). Creation remains authenticated-only via **`create_or_reuse_share_set`**.

## Acceptance Criteria

- [ ] Creation and resolution paths documented with RPC names.
- [ ] RLS and share semantics remain database-first; this spec does not redefine security.
- [ ] Smoke playbook steps for share sets reference this facade.
