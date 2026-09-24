-- New organizations get the same app rules as a new account: Map and Media on, the rest off.
-- Account messages are addressed by email because profiles are not readable across organizations.

create or replace function public.seed_organization_widget_policies(p_organization_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.organization_widget_policies (organization_id, widget_id, allowed, preinstalled, locked)
  select p_organization_id, widgets.widget_id, true, widgets.preinstalled, false
  from (
    values
      ('map', true),
      ('media', true),
      ('projects', false),
      ('colleagues', false),
      ('organization', false)
  ) as widgets (widget_id, preinstalled)
  on conflict (organization_id, widget_id) do nothing;
$$;

create or replace function public.organizations_seed_widget_policies()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_organization_widget_policies(new.id);
  return new;
end;
$$;

drop trigger if exists organizations_seed_widget_policies on public.organizations;
create trigger organizations_seed_widget_policies
  after insert on public.organizations
  for each row
  execute function public.organizations_seed_widget_policies();

select public.seed_organization_widget_policies(id)
from public.organizations;

create or replace function public.send_account_message(p_email text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_recipient uuid;
  v_id uuid;
begin
  if v_sender is null then
    raise exception 'not allowed';
  end if;
  if nullif(btrim(p_body), '') is null then
    raise exception 'message required';
  end if;

  select id into v_recipient
  from auth.users
  where lower(email) = lower(btrim(p_email));

  if v_recipient is null or v_recipient = v_sender then
    raise exception 'recipient not found';
  end if;

  insert into public.account_messages (sender_id, recipient_id, body)
  values (v_sender, v_recipient, btrim(p_body))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.send_account_message(text, text) from public;
grant execute on function public.send_account_message(text, text) to authenticated;
