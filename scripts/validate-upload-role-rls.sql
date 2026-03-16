-- Upload Role/RLS Validation Script
-- Purpose: verify allow/deny behavior for admin, clerk, worker, viewer
-- Scope: images, projects, metadata_keys, image_metadata, storage.objects (images bucket)
-- Safety: runs inside a transaction and ends with ROLLBACK

begin;
set local role authenticated;

create temporary table if not exists _rls_results (
  check_name text not null,
  actor_role text not null,
  expected text not null,
  actual text not null,
  passed boolean not null,
  details text
) on commit drop;

create or replace function pg_temp.run_check(
  p_check_name text,
  p_actor_role text,
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

  insert into _rls_results(check_name, actor_role, expected, actual, passed, details)
  values (
    p_check_name,
    p_actor_role,
    case when p_should_succeed then 'ALLOW' else 'DENY' end,
    case when ok then 'ALLOW' else 'DENY' end,
    ok = p_should_succeed,
    err
  );
end;
$$;

do $$
declare
  admin_id uuid;
  clerk_id uuid;
  worker_id uuid;
  viewer_id uuid;
  org_id uuid;
  project_id uuid;
  image_id uuid;
  metadata_key_id uuid;
  admin_delete_target uuid;
  clerk_delete_target uuid;
  worker_delete_target uuid;
  viewer_delete_target uuid;
  role_name text;
  actor_id uuid;
  expected_allow boolean;
  delete_target uuid;
begin
  select ur.user_id into admin_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where r.name = 'admin'
  limit 1;

  select ur.user_id into clerk_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where r.name = 'clerk'
  limit 1;

  select ur.user_id into worker_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where r.name = 'worker'
  limit 1;

  select ur.user_id into viewer_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where r.name = 'viewer'
  limit 1;

  if admin_id is null or clerk_id is null or worker_id is null or viewer_id is null then
    raise exception 'Missing required users for roles admin/clerk/worker/viewer';
  end if;

  select p.organization_id into org_id
  from public.profiles p
  where p.id = admin_id;

  if org_id is null then
    raise exception 'Admin profile has no organization_id';
  end if;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('role', 'authenticated', 'sub', admin_id::text)::text,
    true
  );

  insert into public.projects (organization_id, created_by, name)
  values (org_id, admin_id, 'RLS Validation Project')
  returning id into project_id;

  insert into public.images (user_id, organization_id, project_id, storage_path)
  values (admin_id, org_id, project_id, format('%s/%s/%s.jpg', org_id, admin_id, gen_random_uuid()))
  returning id into image_id;

  insert into public.metadata_keys (organization_id, created_by, key_name)
  values (org_id, admin_id, 'rls_validation_key')
  returning id into metadata_key_id;

  insert into public.image_metadata (image_id, metadata_key_id, value_text)
  values (image_id, metadata_key_id, 'seed');

  insert into public.images (user_id, organization_id, project_id, storage_path)
  values (admin_id, org_id, project_id, format('%s/%s/%s.jpg', org_id, admin_id, gen_random_uuid()))
  returning id into admin_delete_target;

  insert into public.images (user_id, organization_id, project_id, storage_path)
  values (admin_id, org_id, project_id, format('%s/%s/%s.jpg', org_id, admin_id, gen_random_uuid()))
  returning id into clerk_delete_target;

  insert into public.images (user_id, organization_id, project_id, storage_path)
  values (admin_id, org_id, project_id, format('%s/%s/%s.jpg', org_id, admin_id, gen_random_uuid()))
  returning id into worker_delete_target;

  insert into public.images (user_id, organization_id, project_id, storage_path)
  values (admin_id, org_id, project_id, format('%s/%s/%s.jpg', org_id, admin_id, gen_random_uuid()))
  returning id into viewer_delete_target;

  for role_name, actor_id in
    select *
    from (values
      ('admin'::text, admin_id),
      ('clerk'::text, clerk_id),
      ('worker'::text, worker_id),
      ('viewer'::text, viewer_id)
    ) v(role_name, actor_id)
  loop
    expected_allow := role_name <> 'viewer';

    delete_target := case role_name
      when 'admin' then admin_delete_target
      when 'clerk' then clerk_delete_target
      when 'worker' then worker_delete_target
      else viewer_delete_target
    end;

    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform set_config('request.jwt.claim.sub', actor_id::text, true);
    perform set_config(
      'request.jwt.claims',
      json_build_object('role', 'authenticated', 'sub', actor_id::text)::text,
      true
    );

    perform pg_temp.run_check(
      'images.insert',
      role_name,
      format(
        $f$insert into public.images (user_id, organization_id, project_id, storage_path)
           values ('%s'::uuid, '%s'::uuid, '%s'::uuid, '%s')$f$,
        actor_id,
        org_id,
        project_id,
        format('%s/%s/%s.jpg', org_id, actor_id, gen_random_uuid())
      ),
      expected_allow
    );

    perform pg_temp.run_check(
      'images.update',
      role_name,
      format(
        $f$update public.images
              set updated_at = now()
            where id = '%s'::uuid$f$,
        image_id
      ),
      expected_allow
    );

    perform pg_temp.run_check(
      'images.delete',
      role_name,
      format(
        $f$do $inner$
            begin
              if (select count(*) from (delete from public.images where id = '%s'::uuid returning 1) d) = 0 then
                raise exception 'No row deleted';
              end if;
            end
            $inner$;$f$,
        delete_target
      ),
      expected_allow
    );

    perform pg_temp.run_check(
      'projects.update',
      role_name,
      format(
        $f$update public.projects
              set updated_at = now()
            where id = '%s'::uuid$f$,
        project_id
      ),
      expected_allow
    );

    perform pg_temp.run_check(
      'metadata_keys.insert',
      role_name,
      format(
        $f$insert into public.metadata_keys (organization_id, created_by, key_name)
           values ('%s'::uuid, '%s'::uuid, '%s')$f$,
        org_id,
        actor_id,
        format('rls_key_%s_%s', role_name, replace(gen_random_uuid()::text, '-', ''))
      ),
      expected_allow
    );

    perform pg_temp.run_check(
      'image_metadata.update',
      role_name,
      format(
        $f$update public.image_metadata
              set value_text = '%s'
            where image_id = '%s'::uuid and metadata_key_id = '%s'::uuid$f$,
        format('meta-updated-by-%s', role_name),
        image_id,
        metadata_key_id
      ),
      expected_allow
    );

    perform pg_temp.run_check(
      'storage.objects.insert',
      role_name,
      format(
        $f$insert into storage.objects (bucket_id, name)
           values ('images', '%s')$f$,
        format('%s/%s/%s.jpg', org_id, actor_id, gen_random_uuid())
      ),
      expected_allow
    );
  end loop;
end;
$$;

select
  check_name,
  actor_role,
  expected,
  actual,
  passed,
  details
from _rls_results
order by check_name, actor_role;

-- Keep this script non-destructive.
rollback;
