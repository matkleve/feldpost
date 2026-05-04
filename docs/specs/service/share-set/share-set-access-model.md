# Share set access model

## What It Is

Contract for **who** may resolve a share token (`ShareAudience`) and **what** the link allows in share-mediated flows (`ShareLinkGrant`). Resolution uses **one** RPC, `resolve_share_set(token)`; the database reads `share_sets` metadata and caller auth context and branches internally. General org membership authority is defined in [authorization-model.md](../../system/authorization-model.md).

## What It Looks Like

- **Public** link: anyone with the URL and valid token can resolve items (read-only list for `view`).
- **Organization** link: caller must be authenticated and `user_org_id()` must equal the share set’s `organization_id`.
- **Named** link: caller must be authenticated and appear in `share_set_recipients` for that set.

Creation UI may collect audience and, for `named`, recipient user ids; the client never chooses which RPC to call for resolve.

## Where It Lives

- **Tables:** `public.share_sets` (audience + grant columns), `public.share_set_recipients` (optional rows for `named`).
- **RPCs:** `create_or_reuse_share_set`, `resolve_share_set` (migrations `supabase/migrations/`).
- **Facade:** [share-set-service.md](share-set-service.md), `apps/web/src/app/core/share-set/`.

## Actions

| # | Audience | Caller | Resolve result |
| --- | --- | --- | --- |
| 1 | `public` | `anon` or `authenticated` | Items if token valid and `share_link_grant` allows read. |
| 2 | `organization` | `anon` | Empty set (no error required). |
| 3 | `organization` | `authenticated`, same org | Items. |
| 4 | `organization` | `authenticated`, other org | Empty set. |
| 5 | `named` | `anon` | Empty set. |
| 6 | `named` | `authenticated`, listed recipient | Items. |
| 7 | `named` | `authenticated`, not listed | Empty set. |

Future `comment` / `edit` grants must add **dedicated** RPCs; they do not widen `media_items` RLS for anonymous callers.

## Component Hierarchy

```text
resolve_share_set (SECURITY DEFINER)
  → read share_sets by token hash
  → branch on audience + auth.uid() / user_org_id() / share_set_recipients
  → return share_set_items rows
```

## Data

| Column / table | Purpose |
| --- | --- |
| `share_sets.audience` | Enum: `public`, `organization`, `named`. |
| `share_sets.share_grant` | Enum: `view` (extensible later). |
| `share_set_recipients` | `(share_set_id, user_id)` allowlist for `named`. |

## State

Stateless at HTTP level; each resolve re-evaluates token, expiry, revocation, audience, and grant.

## File Map

| File | Purpose |
| --- | --- |
| [share-set-service.md](share-set-service.md) | Facade and RPC names. |
| [authorization-model.md](../../system/authorization-model.md) | General RLS grants. |

## Wiring

- `create_or_reuse_share_set` persists audience, grant, and recipient rows when `named`.
- `resolve_share_set` is granted to `anon` and `authenticated`; logic must not leak rows when audience forbids the caller.

## Acceptance Criteria

- [ ] Only `resolve_share_set` is used for token resolution from the client; no split RPCs by audience.
- [ ] `named` sets cannot resolve without at least one recipient at creation time.
- [ ] Public resolve does not use `user_org_id()` as a positive gate (org check applies only for `organization` audience).
- [ ] Spec and `docs/security-boundaries.md` stay aligned on token hashing and definer boundaries.
