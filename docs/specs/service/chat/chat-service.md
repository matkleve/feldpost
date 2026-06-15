# Chat service

**Code:** `apps/web/src/app/core/chat/`

## Facade

`ChatService` orchestrates channel/message operations and exposes signals:

- `liveMessages` — top-level messages for active channel
- `typingUserIds` — broadcast typing state
- `searchResults` — full-text search hits

## Adapters

| Adapter | Responsibility |
| --- | --- |
| `ChatChannelsAdapter` | CRUD channels, DMs, members, unread counts |
| `ChatMessagesAdapter` | Messages, threads, reactions, attachments, links |
| `ChatRealtimeAdapter` | Postgres changes, broadcast typing, presence |

## Realtime contract

- Channel subscription: `chat:{channelId}` with INSERT/UPDATE/DELETE on `chat_messages`
- Typing: broadcast on same channel
- Presence: `presence:{channelId}` with `user_id` track payload
- Thread: `thread:{parentId}` INSERT filter on `parent_id`

## Security

RLS enforced in Postgres via `can_access_chat_channel()` — public channels visible to org; private/DM require membership.
