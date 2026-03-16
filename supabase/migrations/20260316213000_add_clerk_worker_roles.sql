-- Add explicit clerk and worker roles.
-- Current behavior target: clerk and worker should have the same permissions as user.
-- Existing RLS is mostly role-agnostic for non-viewers, so no policy changes are required yet.

insert into public.roles (name)
values
  ('clerk'),
  ('worker')
on conflict (name) do nothing;
