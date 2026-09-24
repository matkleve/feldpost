-- Organization widget install RLS.
-- Proves a member reads and writes only their own organization's rows,
-- and that the table has no per-user column.
-- Safety: one transaction, then ROLLBACK.
--
-- Run against a live, seeded database (cannot run in the offline sandbox):
--   psql "$DATABASE_URL" -f scripts/validate-organization-widgets-rls.sql

begin;

create temporary table if not exists _rls_results (
  check_name text not null,
  actor_role text not null,
  expected text not null,
  actual text not null,
  passed boolean not null,
  details text
) on commit drop;

create or replace function pg_temp.note(
  p_check_name text,
  p_expected text,
  p_actual text,
  p_passed boolean,
  p_details text default null
)
returns void
language plpgsql
as $$
begin
  insert into _rls_results(check_name, actor_role, expected, actual, passed, details)
  values (p_check_name, 'schema', p_expected, p_actual, p_passed, p_details);
end;
$$;

do $$
declare
  col_list text;
  rls_on boolean;
  policy_count integer;
begin
  select string_agg(column_name, ',' order by column_name)
    into col_list
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'organization_widgets';

  perform pg_temp.note(
    'columns are organization_id and widget_id',
    'organization_id,widget_id',
    coalesce(col_list, 'missing'),
    col_list = 'organization_id,widget_id'
  );

  select c.relrowsecurity
    into rls_on
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'organization_widgets';

  perform pg_temp.note(
    'row level security enabled',
    'true',
    coalesce(rls_on::text, 'missing'),
    rls_on is true
  );

  select count(*)
    into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'organization_widgets'
    and (
      qual like '%user_org_id()%'
      or with_check like '%user_org_id()%'
    );

  perform pg_temp.note(
    'select insert and delete policies use user_org_id()',
    '3',
    policy_count::text,
    policy_count = 3
  );
end;
$$;

create or replace function pg_temp.act_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', p_user_id::text)::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

do $$
declare
  org_a uuid;
  org_b uuid;
  user_a uuid;
  user_b uuid;
  visible integer;
  inserted boolean;
begin
  select p.organization_id, p.id
    into org_a, user_a
  from public.profiles p
  where p.organization_id is not null
  order by p.created_at
  limit 1;

  select p.organization_id, p.id
    into org_b, user_b
  from public.profiles p
  where p.organization_id is not null
    and p.organization_id is distinct from org_a
  order by p.created_at
  limit 1;

  if org_a is null or org_b is null then
    perform pg_temp.note(
      'cross-org fixture',
      'two organizations',
      'fewer than two',
      false,
      'Seed two organizations before this script can prove cross-org deny.'
    );
    return;
  end if;

  reset role;
  insert into public.organization_widgets (organization_id, widget_id)
  values (org_a, 'vehicles'), (org_b, 'boats');

  perform pg_temp.act_as(user_a);

  select count(*) into visible from public.organization_widgets;
  perform pg_temp.note(
    'member of A sees only A',
    '1',
    visible::text,
    visible = 1
  );

  inserted := true;
  begin
    insert into public.organization_widgets (organization_id, widget_id)
    values (org_b, 'material');
  exception
    when others then
      inserted := false;
  end;

  perform pg_temp.note(
    'member of A cannot insert for B',
    'DENY',
    case when inserted then 'ALLOW' else 'DENY' end,
    inserted = false
  );

  reset role;
end;
$$;

select check_name, expected, actual, passed, details
from _rls_results
order by check_name;

do $$
begin
  if exists (select 1 from _rls_results where passed = false) then
    raise exception 'organization_widgets RLS validation failed';
  end if;
end;
$$;

rollback;
