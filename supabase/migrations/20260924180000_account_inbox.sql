-- One row per other account, newest message first.
create or replace function public.list_account_inbox()
returns table (email text, body text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (lower(people.email))
    people.email,
    messages.body,
    messages.created_at
  from public.account_messages messages
  join auth.users people on people.id = case
    when messages.sender_id = auth.uid() then messages.recipient_id
    else messages.sender_id
  end
  where auth.uid() in (messages.sender_id, messages.recipient_id)
  order by lower(people.email), messages.created_at desc;
$$;

revoke all on function public.list_account_inbox() from public;
grant execute on function public.list_account_inbox() to authenticated;
