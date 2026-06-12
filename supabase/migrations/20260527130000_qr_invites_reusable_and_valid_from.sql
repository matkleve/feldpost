-- Reusable invites + optional validity window (valid_from .. expires_at).
-- Reusable rows stay status = 'active' so the same code works for multiple sign-ups.

alter table public.qr_invites
  add column if not exists reusable boolean not null default false;

alter table public.qr_invites
  add column if not exists valid_from timestamptz;

comment on column public.qr_invites.reusable is
  'When true, signup does not mark the invite accepted; code remains active until expires_at.';
comment on column public.qr_invites.valid_from is
  'When set, invite is valid only when now() >= valid_from (and expires_at > now()).';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
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

  insert into public.profiles (id, organization_id, full_name, avatar_url)
  values (
    new.id,
    v_invite.organization_id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  select id into v_role_id from public.roles where name = v_invite.target_role;

  if v_role_id is null then
    select id into v_role_id from public.roles where name = 'user';
  end if;

  if v_role_id is not null then
    insert into public.user_roles (user_id, role_id) values (new.id, v_role_id);
  end if;

  if not coalesce(v_invite.reusable, false) then
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
