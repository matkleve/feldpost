# Files Page — tree RPCs and folder service (supplement)

> **Parent:** [files-page.md](./files-page.md)
> **Decision:** [STUDY-006 Phase 5.5](../../study/006-upload-pipeline-correction-plan.md)

## Status, 2026-09-20

| Piece | State |
| --- | --- |
| `MediaFolderTreeService` | **built and tested** — one level per expand, cached per path, counts read from the RPC and never recomputed |
| `20260920120000_media_folder_tree_rpcs.sql` | **written, NOT live-verified** |
| Tree component | not started |

## The verification requirement this does not yet meet

Both RPCs are `SECURITY DEFINER` functions that read `media_items` and scope by
`organization_id`. `AGENTS.md` classes that **Sensitive**: live verification and `/security-review`
are mandatory, not advisory.

The migration was written in an environment with `psql` but **no database URL, no Supabase CLI and
no credentials**, so it has never been applied or executed. It follows the two established idioms
exactly and says so in a banner at the top of the file — but *"follows the idiom"* is not
*"verified"*, and the gap sits in the one area where a mistake returns another organization's rows.

**Before merge:** apply · the matching `validate-*-rls.sql` · a cross-organization read that returns
nothing · `/security-review`.

## Two details worth not losing

Both were learned from existing migrations rather than invented:

- **`starts_with()`, not `LIKE`.** A folder name may legitimately contain `%` or `_`, which `LIKE`
  reads as wildcards — silently folding unrelated folders into one node.
- **Revoke from `anon` as well as `PUBLIC`.** Supabase grants EXECUTE on every new function to
  `anon` as its own role grant, and revoking from `PUBLIC` alone does not strip it. That exact gap
  left every "authenticated only" RPC anon-callable until
  `20260911120000_revoke_anon_execute_on_authenticated_rpcs.sql`.

## One predicate, two places

The tree's unresolved badge counts `location_status NOT IN ('resolved', 'gps')` — the **same**
predicate bulk eligibility uses (`isBulkEligibleStatus`). If they drift apart, the badge becomes a
number the user cannot act on: it would offer work that bulk resolution then declines to do.

## Risks

- **Silent merge across imports.** The chosen scope merges identical paths; mitigated by showing the
  upload batch per file. Revisit if operators report confusion.
- **Bulk writes are irreversible at scale.** Applying an address to 5 000 files must be confirmable and reportable — a hard requirement in the supplement.
- **A tree is a second organising axis.** Address stays canonical; this page must not become a
  parallel store of location.

## Acceptance Criteria

- [x] Expanding a node fetches exactly that node's children; opening the page reads no subtree.
- [x] Counts come from the RPC, not from counting rows client-side.
- [x] A failed query surfaces as an error rather than an empty tree.
- [ ] Counts verified against a real database at 20 000 rows (needs apply).
- [ ] A second organization's media never appears (RLS test, needs apply).
