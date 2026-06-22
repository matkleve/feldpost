-- Chat RLS Validation Script
-- Purpose: prove the chat membership/message hardening in
--          supabase/migrations/20260620100000_chat_and_branding_rls_hardening.sql
-- Scope:   chat_channel_members (self-join), chat_channels (private read),
--          chat_channel_members role escalation.
-- Safety:  runs inside a transaction and ends with ROLLBACK.
--
-- Run against a live database (cannot run in the offline sandbox):
--   psql "$DATABASE_URL" -f scripts/validate-chat-rls.sql
--
-- Expectation matrix (the regression this guards):
--   - non-member self-insert into a PRIVATE channel  -> DENY
--   - self-insert into a PUBLIC channel              -> ALLOW
--   - member self-elevation to role 'owner'          -> DENY

begin;

create temporary table if not exists _chat_rls_results (
  check_name text not null,
  expected text not null,
  actual text not null,
  passed boolean not null,
  details text
) on commit drop;

create or replace function pg_temp.run_check(
  p_check_name text,
  p_sql text,
  p_should_succeed boolean
)
returns void
language plpgsql
as $$
declare
  ok boolean := true;
  err text := null;
begin
  begin
    execute p_sql;
  exception
    when others then
      ok := false;
      err := SQLERRM;
  end;

  insert into _chat_rls_results(check_name, expected, actual, passed, details)
  values (
    p_check_name,
    case when p_should_succeed then 'ALLOW' else 'DENY' end,
    case when ok then 'ALLOW' else 'DENY' end,
    ok = p_should_succeed,
    err
  );
end;
$$;

create or replace function pg_temp.act_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', p_user_id::text)::text,
    true
  );
end;
$$;

do $$
declare
  org_id uuid;
  owner_id uuid;
  intruder_id uuid;
  public_channel uuid;
  private_channel uuid;
begin
  -- Two distinct members of the same organization.
  select p.organization_id, p.id
    into org_id, owner_id
  from public.profiles p
  where p.removed_at is null
  limit 1;

  select p.id into intruder_id
  from public.profiles p
  where p.organization_id = org_id
    and p.id <> owner_id
    and p.removed_at is null
  limit 1;

  if org_id is null or owner_id is null or intruder_id is null then
    raise exception 'Need two members in one organization to run chat RLS checks';
  end if;

  -- Seed channels as the owner (created_by = owner).
  perform pg_temp.act_as(owner_id);

  insert into public.chat_channels (organization_id, name, type, created_by)
  values (org_id, 'rls-validation-public', 'public', owner_id)
  returning id into public_channel;

  insert into public.chat_channels (organization_id, name, type, created_by)
  values (org_id, 'rls-validation-private', 'private', owner_id)
  returning id into private_channel;

  -- Owner self-joins their private channel (created_by path) -> ALLOW.
  perform pg_temp.run_check(
    'owner self-join own private channel',
    format('insert into public.chat_channel_members (channel_id, user_id, role) values (%L, %L, %L)',
           private_channel, owner_id, 'owner'),
    true
  );

  -- Intruder (not member, not creator) self-joins the private channel -> DENY.
  perform pg_temp.act_as(intruder_id);
  perform pg_temp.run_check(
    'intruder self-join private channel is blocked',
    format('insert into public.chat_channel_members (channel_id, user_id, role) values (%L, %L, %L)',
           private_channel, intruder_id, 'member'),
    false
  );

  -- Intruder must NOT have access to the private channel. The expression errors
  -- (1/0) if access is wrongly granted, so ALLOW == access correctly denied.
  perform pg_temp.run_check(
    'intruder cannot access private channel',
    format('select (case when public.can_access_chat_channel(%L) then 1/0 else 1 end)', private_channel),
    true
  );

  -- Anyone may self-join a PUBLIC channel -> ALLOW.
  perform pg_temp.run_check(
    'self-join public channel is allowed',
    format('insert into public.chat_channel_members (channel_id, user_id, role) values (%L, %L, %L)',
           public_channel, intruder_id, 'member'),
    true
  );

  -- Member self-elevation to owner via direct update -> DENY.
  perform pg_temp.run_check(
    'member cannot self-elevate to owner',
    format('update public.chat_channel_members set role = %L where channel_id = %L and user_id = %L',
           'owner', public_channel, intruder_id),
    false
  );
end;
$$;

select check_name, expected, actual,
       case when passed then 'PASS' else 'FAIL' end as result,
       details
from _chat_rls_results
order by check_name;

do $$
declare
  failures int;
begin
  select count(*) into failures from _chat_rls_results where not passed;
  if failures > 0 then
    raise exception 'Chat RLS validation failed: % check(s) did not match expectation', failures;
  end if;
end;
$$;

rollback;
