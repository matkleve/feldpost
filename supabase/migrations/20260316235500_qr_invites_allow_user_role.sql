-- Allow baseline 'user' role to create QR invites.
-- This keeps viewers blocked while enabling existing org members.

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
      and r.name in ('admin', 'clerk', 'worker', 'user')
  );
$$;
