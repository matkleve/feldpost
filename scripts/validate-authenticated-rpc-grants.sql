-- Authenticated-only RPC grant validation
-- Purpose: assert that every RPC intended as "authenticated only" is NOT
--          executable by anon, and IS executable by authenticated.
-- Why:     REVOKE ALL ON FUNCTION ... FROM PUBLIC does not revoke Supabase's
--          own default anon grant (ALTER DEFAULT PRIVILEGES ... GRANT ALL ON
--          FUNCTIONS TO anon, applied at CREATE FUNCTION time). A function
--          gated only "FROM PUBLIC" is still anon-callable. See issue #193.
-- Scope:   the RPCs fixed in
--          20260911120000_revoke_anon_execute_on_authenticated_rpcs.sql.
--          Add a row to `_expected_authenticated_only` below whenever a new
--          "authenticated only" RPC is added, so this cannot regress silently.
--
-- Run against a live database (needs real catalog state, not the offline
-- sandbox):
--   psql "$DATABASE_URL" -f scripts/validate-authenticated-rpc-grants.sql

begin;

create temporary table _expected_authenticated_only (
  regprocedure text primary key
) on commit drop;

insert into _expected_authenticated_only (regprocedure) values
  ('public.find_photoless_conflicts(double precision, double precision, text)'),
  ('public.retire_dedup_hashes_for_media_item(uuid, text)');

create temporary table _grant_results (
  regprocedure text not null,
  role_name text not null,
  expected boolean not null,
  actual boolean not null,
  passed boolean not null
) on commit drop;

do $$
declare
  rec record;
  anon_can_exec boolean;
  authenticated_can_exec boolean;
begin
  for rec in select regprocedure from _expected_authenticated_only loop
    anon_can_exec := has_function_privilege('anon', rec.regprocedure::regprocedure, 'EXECUTE');
    authenticated_can_exec := has_function_privilege('authenticated', rec.regprocedure::regprocedure, 'EXECUTE');

    insert into _grant_results values (
      rec.regprocedure, 'anon', false, anon_can_exec, anon_can_exec = false
    );
    insert into _grant_results values (
      rec.regprocedure, 'authenticated', true, authenticated_can_exec, authenticated_can_exec = true
    );
  end loop;
end;
$$;

select regprocedure, role_name,
       case when expected then 'EXECUTE' else 'NO EXECUTE' end as expected,
       case when actual then 'EXECUTE' else 'NO EXECUTE' end as actual,
       case when passed then 'PASS' else 'FAIL' end as result
from _grant_results
order by regprocedure, role_name;

do $$
declare
  failures int;
begin
  select count(*) into failures from _grant_results where not passed;
  if failures > 0 then
    raise exception 'Authenticated-only RPC grant validation failed: % check(s) did not match expectation', failures;
  end if;
end;
$$;

rollback;
