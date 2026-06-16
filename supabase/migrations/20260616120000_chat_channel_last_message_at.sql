-- Track last root message time per channel for sidebar recency grouping.

alter table public.chat_channels
  add column if not exists last_message_at timestamptz;

update public.chat_channels c
   set last_message_at = sub.max_created_at
  from (
    select m.channel_id, max(m.created_at) as max_created_at
      from public.chat_messages m
     where m.parent_id is null
       and m.deleted_at is null
     group by m.channel_id
  ) sub
 where c.id = sub.channel_id;

create or replace function public.bump_chat_channel_last_message_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_id is not null or new.deleted_at is not null then
    return new;
  end if;

  update public.chat_channels
     set last_message_at = new.created_at,
         updated_at = now()
   where id = new.channel_id;

  return new;
end;
$$;

drop trigger if exists trg_chat_messages_bump_channel_activity on public.chat_messages;

create trigger trg_chat_messages_bump_channel_activity
  after insert on public.chat_messages
  for each row
  execute function public.bump_chat_channel_last_message_at();
