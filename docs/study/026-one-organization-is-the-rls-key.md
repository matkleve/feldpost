---
id: STUDY-026
type: investigation
status: proposed
supersedes: none
corrected-by: none
---

# One organization is the RLS key

**Written:** 2026-09-24. **On:** `cursor/addable-apps-change-plan-cb0a`, by reading `user_org_id()`, `profiles`, and `docs/security-boundaries.md`. No database was queried. **Status `proposed`.** Not a spec and not permission to migrate.

STUDY-025’s current record says one email may belong to more than one organization, and the person chooses one after login. This study measures what that choice would hit.

## What the code does

`user_org_id()` returns one uuid. It reads `profiles.organization_id` for `auth.uid()` `[A]` `supabase/migrations/20260303000004_functions_and_triggers.sql` lines 5–11.

That column is `not null` and references `organizations` `[A]` `supabase/migrations/20260303000002_tables.sql` line 15.

`docs/security-boundaries.md` states the invariant in two places: every authenticated user belongs to exactly one organization (line 40), and a row is visible when `organization_id = user_org_id()` (§2, lines 56–57 and §2.1). Storage upload checks use the same helper (line 248). `[A]`

Later migrations keep calling that function. Examples, not a full census: chat RLS (`20260916162935_restore_chat_rls_membership_isolation.sql`), folder RPCs (`20260920120000_media_folder_tree_rpcs.sql` lines 38 and 106), and the initplan wrap that rewrites policies to `(select public.user_org_id())` (`20260620100200_rls_initplan_perf_wrap.sql`). `[A]`

The comparison is scalar. A policy written `organization_id = user_org_id()` does not mean “any organization this person belongs to.” `[A]` for the SQL shape. `[C]` that changing the function to return a set would make those predicates fail or change meaning; that was not executed.

## What is fragile

The fragile object is the helper, not the Organization widget.

- A client that sends `organization_id` and trusts it bypasses the boundary. The frontend is untrusted `[A]` `docs/security-boundaries.md` §1.
- A profile with no organization cannot be inserted today (`not null`). A signup that creates an account and defers the organization leaves every `user_org_id()` call null until a row exists. Policies that compare `organization_id = user_org_id()` then match nothing. `[C]` from the `not null` column and the equality checks. Not executed.
- Two organizations on one login, with the helper still reading one column, show only the organization stored on `profiles`. The other organization’s rows stay invisible. That is safe. It is also not the product in STUDY-025 until something records which organization the session has entered and the helper reads that. `[C]`
- Install rows, when a spec names them, have to be scoped by the same helper. An install table with no `organization_id` check would be the first org data that is not isolated. `[D]` that this is forbidden. `[A]` that §2.2 already requires an organization-scope check on every new SELECT policy.

## What this study does not do

It does not name a membership table. STUDY-025 left that name unchosen. It does not change `user_org_id()`.

Before any migration: a spec has to say which single organization the session has entered, how that choice is stored, and that `user_org_id()` still returns that one uuid. Red-test-first against a user who belongs to two organizations and must not read the one they did not enter.
