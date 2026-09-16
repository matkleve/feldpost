-- Minimal actors for validate-chat-rls.sql / validate-upload-role-rls.sql.
-- Run as postgres after the migration chain (bypasses invite-only signup).
-- @see scripts/local-verify/run.sh

do $$
declare
  v_org_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_admin uuid := '11111111-1111-1111-1111-111111111111';
  v_clerk uuid := '22222222-2222-2222-2222-222222222222';
  v_worker uuid := '33333333-3333-3333-3333-333333333333';
  v_viewer uuid := '44444444-4444-4444-4444-444444444444';
  v_role_id uuid;
begin
  insert into public.organizations (id, name)
  values (v_org_id, 'Local Verify Org')
  on conflict (id) do nothing;

  perform public.seed_org_default_roles(v_org_id);

  -- Bypass invite-only handle_new_user; we insert profiles ourselves.
  alter table auth.users disable trigger on_auth_user_created;

  insert into auth.users (id, email, raw_user_meta_data) values
    (v_admin, 'admin@local-verify.test', '{}'::jsonb),
    (v_clerk, 'clerk@local-verify.test', '{}'::jsonb),
    (v_worker, 'worker@local-verify.test', '{}'::jsonb),
    (v_viewer, 'viewer@local-verify.test', '{}'::jsonb)
  on conflict (id) do nothing;

  alter table auth.users enable trigger on_auth_user_created;

  insert into public.profiles (id, organization_id, full_name) values
    (v_admin, v_org_id, 'Local Verify admin'),
    (v_clerk, v_org_id, 'Local Verify clerk'),
    (v_worker, v_org_id, 'Local Verify worker'),
    (v_viewer, v_org_id, 'Local Verify viewer')
  on conflict (id) do update
    set organization_id = excluded.organization_id,
        removed_at = null;

  delete from public.user_roles
  where user_id in (v_admin, v_clerk, v_worker, v_viewer);

  select id into v_role_id from public.org_roles
  where organization_id = v_org_id and name = 'admin' limit 1;
  insert into public.user_roles (user_id, org_role_id) values (v_admin, v_role_id);

  select id into v_role_id from public.org_roles
  where organization_id = v_org_id and name = 'clerk' limit 1;
  insert into public.user_roles (user_id, org_role_id) values (v_clerk, v_role_id);

  select id into v_role_id from public.org_roles
  where organization_id = v_org_id and name = 'worker' limit 1;
  insert into public.user_roles (user_id, org_role_id) values (v_worker, v_role_id);

  select id into v_role_id from public.org_roles
  where organization_id = v_org_id and name = 'viewer' limit 1;
  insert into public.user_roles (user_id, org_role_id) values (v_viewer, v_role_id);
end;
$$;
