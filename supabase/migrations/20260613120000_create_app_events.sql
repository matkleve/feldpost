-- =============================================================================
-- Wide-event logging: app_events table
-- @see docs/specs/service/wide-event/wide-event-service.md
-- =============================================================================

create table if not exists public.app_events (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null    default now(),
  org_id     uuid        not null    references public.organizations (id),
  user_id    uuid        not null    references auth.users (id),
  event      jsonb       not null
);

create index if not exists idx_app_events_event_gin
  on public.app_events using gin (event);

create index if not exists idx_app_events_org_created
  on public.app_events (org_id, created_at desc);

alter table public.app_events enable row level security;

create policy "app_events: org read"
  on public.app_events for select
  using (org_id = public.user_org_id());

create policy "app_events: user insert own org"
  on public.app_events for insert
  with check (
    user_id = auth.uid()
    and org_id = public.user_org_id()
  );
