-- =============================================================================
-- i18n text source + translation tables
-- =============================================================================

create table if not exists public.app_texts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  key text not null,
  source_text text not null,
  source_lang text not null default 'en' check (source_lang in ('en', 'de')),
  context text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  scope_key text generated always as (
    coalesce(organization_id::text, 'global') || ':' || key
  ) stored,
  unique (scope_key)
);

create table if not exists public.app_text_translations (
  id uuid primary key default gen_random_uuid(),
  app_text_id uuid not null references public.app_texts (id) on delete cascade,
  lang text not null check (lang in ('en', 'de')),
  translated_text text not null,
  status text not null default 'published' check (status in ('draft', 'reviewed', 'published')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_text_id, lang)
);

create index if not exists idx_app_texts_org_key on public.app_texts (organization_id, key);
create index if not exists idx_app_texts_key on public.app_texts (key);
create index if not exists idx_app_text_translations_lang_status on public.app_text_translations (lang, status);

create trigger trg_app_texts_updated_at
  before update on public.app_texts
  for each row execute function public.set_updated_at();

create trigger trg_app_text_translations_updated_at
  before update on public.app_text_translations
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.app_texts enable row level security;
alter table public.app_text_translations enable row level security;

-- Read global text and current-organization text.
create policy "app_texts: global or org read"
  on public.app_texts for select
  using (
    organization_id is null
    or organization_id = public.user_org_id()
  );

-- Admins can manage text rows in their org scope and global scope.
create policy "app_texts: admin insert"
  on public.app_texts for insert
  with check (
    public.is_admin()
    and (organization_id is null or organization_id = public.user_org_id())
  );

create policy "app_texts: admin update"
  on public.app_texts for update
  using (
    public.is_admin()
    and (organization_id is null or organization_id = public.user_org_id())
  )
  with check (
    public.is_admin()
    and (organization_id is null or organization_id = public.user_org_id())
  );

create policy "app_texts: admin delete"
  on public.app_texts for delete
  using (
    public.is_admin()
    and (organization_id is null or organization_id = public.user_org_id())
  );

-- All authenticated users can read published translations for visible app_texts rows.
create policy "app_text_translations: published read"
  on public.app_text_translations for select
  using (
    status = 'published'
    and exists (
      select 1
      from public.app_texts t
      where t.id = app_text_id
        and (t.organization_id is null or t.organization_id = public.user_org_id())
    )
  );

-- Admins can read all statuses in visible scope.
create policy "app_text_translations: admin read"
  on public.app_text_translations for select
  using (
    public.is_admin()
    and exists (
      select 1
      from public.app_texts t
      where t.id = app_text_id
        and (t.organization_id is null or t.organization_id = public.user_org_id())
    )
  );

create policy "app_text_translations: admin insert"
  on public.app_text_translations for insert
  with check (
    public.is_admin()
    and exists (
      select 1
      from public.app_texts t
      where t.id = app_text_id
        and (t.organization_id is null or t.organization_id = public.user_org_id())
    )
  );

create policy "app_text_translations: admin update"
  on public.app_text_translations for update
  using (
    public.is_admin()
    and exists (
      select 1
      from public.app_texts t
      where t.id = app_text_id
        and (t.organization_id is null or t.organization_id = public.user_org_id())
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1
      from public.app_texts t
      where t.id = app_text_id
        and (t.organization_id is null or t.organization_id = public.user_org_id())
    )
  );

create policy "app_text_translations: admin delete"
  on public.app_text_translations for delete
  using (
    public.is_admin()
    and exists (
      select 1
      from public.app_texts t
      where t.id = app_text_id
        and (t.organization_id is null or t.organization_id = public.user_org_id())
    )
  );
