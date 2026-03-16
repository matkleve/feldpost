-- QR invite flow schema and RLS
-- Supports invite generation from settings and slash command entrypoints.

create table if not exists public.qr_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  target_role text not null,
  invite_url text not null,
  qr_payload text not null,
  token_hash text not null,
  status text not null default 'active',
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_invites_target_role_check check (target_role in ('clerk', 'worker')),
  constraint qr_invites_status_check check (status in ('active', 'expired', 'revoked', 'accepted')),
  constraint qr_invites_token_hash_unique unique (token_hash),
  constraint qr_invites_accept_consistency check (
    (status = 'accepted' and accepted_at is not null and accepted_user_id is not null)
    or (status <> 'accepted')
  )
);

create index if not exists idx_qr_invites_org_status
  on public.qr_invites (organization_id, status, created_at desc);

create index if not exists idx_qr_invites_expires_at
  on public.qr_invites (expires_at);

create table if not exists public.invite_share_events (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.qr_invites(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null,
  created_at timestamptz not null default now(),
  constraint invite_share_events_channel_check check (channel in ('copy-link', 'email', 'whatsapp', 'qr-scan'))
);

create index if not exists idx_invite_share_events_invite_id
  on public.invite_share_events (invite_id, created_at desc);

create or replace function public.can_create_qr_invites()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name in ('admin', 'clerk', 'worker')
  );
$$;

create trigger trg_qr_invites_updated_at
  before update on public.qr_invites
  for each row execute function public.set_updated_at();

alter table public.qr_invites enable row level security;
alter table public.invite_share_events enable row level security;

create policy "qr_invites: org read"
  on public.qr_invites for select
  using (organization_id = public.user_org_id());

create policy "qr_invites: create by allowed role"
  on public.qr_invites for insert
  with check (
    organization_id = public.user_org_id()
    and created_by = auth.uid()
    and not public.is_viewer()
    and public.can_create_qr_invites()
    and target_role in ('clerk', 'worker')
  );

create policy "qr_invites: creator or admin update"
  on public.qr_invites for update
  using (
    organization_id = public.user_org_id()
    and (created_by = auth.uid() or public.is_admin())
  )
  with check (
    organization_id = public.user_org_id()
    and (created_by = auth.uid() or public.is_admin())
  );

create policy "invite_share_events: org read"
  on public.invite_share_events for select
  using (
    exists (
      select 1
      from public.qr_invites i
      where i.id = invite_id
        and i.organization_id = public.user_org_id()
    )
  );

create policy "invite_share_events: creator insert"
  on public.invite_share_events for insert
  with check (
    actor_user_id = auth.uid()
    and exists (
      select 1
      from public.qr_invites i
      where i.id = invite_id
        and i.organization_id = public.user_org_id()
        and (i.created_by = auth.uid() or public.is_admin())
    )
  );
