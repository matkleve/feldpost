# Authorization model (general grants)

## What It Is

Canonical description of **general** authorization in Feldpost: how an authenticated session is allowed to read or write org-scoped data. Share links use a separate **capability** layer (see [share-set-access-model.md](../service/share-set/share-set-access-model.md)); this document is the single source of truth for member authority and is intentionally **not** a ReBAC or per-project ACL design.

## What It Looks Like

End users experience permissions as “what I can do in my workspace” (browse, upload, admin settings). Engineers implement checks as **RLS policies** plus small **SQL helpers** (`user_org_id()`, `is_admin()`, `is_viewer()`). There is no parallel in-app permission matrix that overrides the database.

## Where It Lives

- **Normative detail:** [docs/security-boundaries.md](../../security-boundaries.md) (RLS decision tree, table policies, role table).
- **Profiles and roles:** `public.profiles`, `public.user_roles`, `public.roles` (migrations under `supabase/migrations/`).
- **Share capability (not general grants):** [share-set-service.md](../service/share-set/share-set-service.md).

## Actions

| # | Situation | Rule |
| --- | --- | --- |
| 1 | Authenticated read/write on tenant tables | `organization_id = user_org_id()` unless a stricter row rule applies. |
| 2 | Viewer role | `is_viewer()` blocks destructive and most write paths where policies include that guard. |
| 3 | Admin overrides within org | `is_admin()` widens specific policies (e.g. media delete/update) per table contracts. |
| 4 | User opens a share URL then uses full app | **RLS + role** still apply; `ShareGrant` does not remove org-member powers on normal API paths (see share access model). |

## Component Hierarchy

```text
Supabase Auth (JWT)
  → PostgreSQL RLS on each table
       → helpers: user_org_id(), is_admin(), is_viewer()
```

Share `SECURITY DEFINER` RPCs are an **adjacent** boundary, not a replacement for this tree.

## Data

| Artifact | Role |
| --- | --- |
| JWT `sub` | Maps to `auth.uid()` in policies. |
| `profiles.organization_id` | Org scope for the session. |
| `user_roles` | Assigns `admin` / `clerk` / `worker` / `user` / `viewer`. |

## State

Session state is the JWT and Postgres session settings; no separate “grant cache” in the product data model for general access.

## File Map

| File | Purpose |
| --- | --- |
| [docs/security-boundaries.md](../../security-boundaries.md) | RLS inventory and invariants. |
| [docs/specs/service/share-set/share-set-access-model.md](../service/share-set/share-set-access-model.md) | Share audience vs general grants. |

## Wiring

Application code uses `SupabaseService` with the user’s JWT. Policies evaluate on each query. **Frontend must not** be the sole enforcement for authorization.

## Acceptance Criteria

- [ ] New features that introduce access rules extend RLS (or documented `SECURITY DEFINER` RPCs), not a second client-only grant engine.
- [ ] Share-link behavior remains documented separately and stays RPC-cordoned for token-mediated access.
- [ ] This doc stays aligned with `docs/security-boundaries.md` when either changes.
