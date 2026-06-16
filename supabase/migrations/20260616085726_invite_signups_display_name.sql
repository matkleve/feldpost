-- Reusable invite labels + signup tracking for referral list union.
-- @see docs/specs/ui/colleagues/colleagues-invites-workspace.reusable-time.supplement.md

alter table public.qr_invites
  add column if not exists display_name text;

comment on column public.qr_invites.display_name is
  'Internal label for reusable invites (required when reusable=true at app layer).';

create table if not exists public.invite_signups (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.qr_invites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint invite_signups_invite_user_unique unique (invite_id, user_id)
);

create index if not exists idx_invite_signups_invite_id
  on public.invite_signups (invite_id, joined_at desc);

create index if not exists idx_invite_signups_user_id
  on public.invite_signups (user_id);

alter table public.invite_signups enable row level security;

create policy "invite_signups: org read via invite"
  on public.invite_signups for select
  using (
    exists (
      select 1
      from public.qr_invites i
      where i.id = invite_id
        and i.organization_id = public.user_org_id()
    )
  );

-- Inserts happen only from security-definer handle_new_user(); no client insert policy.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_invite_token_hash text;
  v_invite public.qr_invites%rowtype;
  v_role_id uuid;
begin
  v_invite_token_hash := nullif(new.raw_user_meta_data->>'invite_token_hash', '');

  if v_invite_token_hash is null then
    raise exception 'Invite code is required for registration.';
  end if;

  select *
    into v_invite
  from public.qr_invites
  where token_hash = v_invite_token_hash
    and status = 'active'
    and expires_at > now()
    and (valid_from is null or valid_from <= now())
  limit 1
  for update;

  if not found then
    raise exception 'Invite code is invalid, expired, or already used.';
  end if;

  perform public.seed_org_default_roles(v_invite.organization_id);

  insert into public.profiles (id, organization_id, full_name, avatar_url)
  values (
    new.id,
    v_invite.organization_id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  select id into v_role_id
  from public.org_roles
  where organization_id = v_invite.organization_id
    and name = v_invite.target_role;

  if v_role_id is null then
    select id into v_role_id
    from public.org_roles
    where organization_id = v_invite.organization_id
      and is_default = true;
  end if;

  if v_role_id is not null then
    insert into public.user_roles (user_id, org_role_id) values (new.id, v_role_id);
  end if;

  if coalesce(v_invite.reusable, false) then
    insert into public.invite_signups (invite_id, user_id)
    values (v_invite.id, new.id)
    on conflict (invite_id, user_id) do nothing;
  else
    update public.qr_invites
    set
      status = 'accepted',
      accepted_at = now(),
      accepted_user_id = new.id
    where id = v_invite.id;
  end if;

  return new;
end;
$$;
