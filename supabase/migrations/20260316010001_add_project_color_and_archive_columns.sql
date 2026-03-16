-- Add project presentation/state columns used by the projects workspace UI.
alter table public.projects
  add column if not exists archived_at timestamptz,
  add column if not exists color_key text;

-- Normalize existing/legacy values before applying constraints.
update public.projects
set color_key = 'clay'
where color_key is null
   or (
     color_key not in ('clay', 'accent', 'success', 'warning')
     and color_key !~ '^brand-hue-(?:[0-9]|[1-9][0-9]|[1-2][0-9]{2}|3[0-4][0-9]|35[0-9])$'
   );

alter table public.projects
  alter column color_key set default 'clay',
  alter column color_key set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_projects_color_key'
  ) then
    alter table public.projects
      add constraint chk_projects_color_key
      check (
        color_key in ('clay', 'accent', 'success', 'warning')
        or color_key ~ '^brand-hue-(?:[0-9]|[1-9][0-9]|[1-2][0-9]{2}|3[0-4][0-9]|35[0-9])$'
      );
  end if;
end
$$;
