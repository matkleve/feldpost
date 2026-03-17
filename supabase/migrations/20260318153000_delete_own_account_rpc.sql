-- Allow authenticated users to delete their own account safely.
-- Deleting auth.users cascades to public.profiles and dependent rows.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users
  where id = auth.uid();

  if not found then
    raise exception 'Authenticated user not found';
  end if;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
