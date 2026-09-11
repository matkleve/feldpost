-- Close the anon-execute gap on the two RPCs that were explicitly gated
-- "authenticated only" but the gate didn't actually gate.
--
-- Problem: Supabase grants every newly created function's EXECUTE privilege
-- to `anon` automatically (ALTER DEFAULT PRIVILEGES ... GRANT ALL ON
-- FUNCTIONS TO anon), as its own explicit role grant, independent of the
-- PUBLIC pseudo-role. `REVOKE ALL ON FUNCTION ... FROM PUBLIC` only strips
-- the implicit PUBLIC grant; the anon-specific one survives untouched.
-- Every "authenticated only" RPC in this codebase used exactly that
-- REVOKE-FROM-PUBLIC-only pattern, so every one of them was (and, until
-- this migration applies, still is) callable by an anonymous caller.
--
-- Measured live 2026-09-10 (unauthenticated POST /rest/v1/rpc/..., anon key,
-- confirmed JWT role=anon): find_photoless_conflicts returned HTTP 200.
-- No data leaked in practice only because both functions derive their scope
-- from public.user_org_id(), which returns null for anon, so every
-- org-scoped predicate matched nothing. That is accidental defense in
-- depth, not the intended gate -- see GitHub issue #193.
--
-- Fix: add anon to the REVOKE alongside PUBLIC. Idempotent (REVOKE/GRANT
-- are safe to re-run).

REVOKE ALL ON FUNCTION public.find_photoless_conflicts(double precision, double precision, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_photoless_conflicts(double precision, double precision, text)
  TO authenticated;

REVOKE ALL ON FUNCTION public.retire_dedup_hashes_for_media_item(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retire_dedup_hashes_for_media_item(uuid, text)
  TO authenticated;
