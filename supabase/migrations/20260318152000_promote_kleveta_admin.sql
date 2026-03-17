-- Promote a single user account to admin role.
-- Target: kleveta.matthias@gmail.com

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join auth.users u on u.id = p.id
join public.roles r on r.name = 'admin'
where lower(u.email) = lower('kleveta.matthias@gmail.com')
on conflict (user_id, role_id) do nothing;
