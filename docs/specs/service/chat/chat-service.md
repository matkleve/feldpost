# Chat service

**Code:** `apps/web/src/app/core/chat/`

## Role in the system

The chat service is **not** the primary purpose of feldpost. It is the coordination layer that accompanies sharing activity. Design principle: chat must never develop enough weight to compete with the primary media/project workflow.

Consequence for the service architecture: the service caches aggressively and minimises network requests, because chat reacts to other actions — users frequently switch between map/projects and chat, not the other way around.

## Facade

`ChatService` orchestrates channel/message operations and exposes signals:

- `liveMessages` — top-level messages for the active channel
- `typingUserIds` — broadcast typing state (Set of user IDs)
- `searchResults` — full-text search hits

## Caching

| Layer | Strategy | Invalidation |
| --- | --- | --- |
| Channels + Unread | 30-second TTL in `channelsCache` | Immediately on `createChannel()` / `archiveChannel()` |
| Messages per channel | `messageCache: Map<channelId, ChatMessage[]>` — no TTL | Realtime events keep cache live; `loadMessages()` replaces after fetch |

Callers of `loadMessages()` receive cached state immediately (zero latency), then fresh state after the fetch completes.

## Adapters

| Adapter | Responsibility |
| --- | --- |
| `ChatChannelsAdapter` | CRUD channels, DMs, members, unread counts |
| `ChatMessagesAdapter` | Messages, threads, reactions, attachments, entity links |
| `ChatRealtimeAdapter` | Postgres changes, broadcast typing, presence |

## Realtime contract

- Channel subscription: `chat:{channelId}` with INSERT/UPDATE/DELETE on `chat_messages`
- Typing: broadcast on the same channel
- Presence: `presence:{channelId}` with `user_id` track payload
- Thread: `thread:{parentId}` INSERT filter on `parent_id`
- All realtime inserts/updates/deletes also update `messageCache`

## Security

RLS enforced in Postgres via `can_access_chat_channel()` — public channels visible to org; private/DM require membership.

Membership integrity (migration `20260620100000_chat_and_branding_rls_hardening.sql`):

- **Self-join is gated by `can_self_join_chat_channel()`** — a user may insert their own `chat_channel_members` row only for a public channel, a channel they created, or one they already belong to. Joining a private/DM channel goes exclusively through the SECURITY DEFINER RPCs (`find_or_create_dm_channel`, `invite_chat_channel_member`). This closes the prior hole where any org member could self-insert into a private channel and read its history.
- **Message updates** are constrained by a `WITH CHECK` that re-asserts authorship (or `chat.messages.delete_any`) and `can_access_chat_channel(channel_id)`, so a message cannot be moved into an inaccessible channel.
- **Role changes** on `chat_channel_members` are blocked by trigger `enforce_chat_member_role_change()` unless the caller owns the channel or holds `chat.channels.manage` — a plain member cannot self-elevate to `owner`.

Further hardening (migration `20260621090200_chat_unread_and_attachment_hardening.sql`):

- **`get_chat_unread_counts`** ignores its `p_user_id` argument and always scopes to `auth.uid()`, so a caller cannot read a colleague's unread state for shared channels.
- **chat-attachments uploads** require a non-viewer role (`not is_viewer()`), matching the `images`/`media` buckets.

Performance: the chat RLS policies are InitPlan-wrapped (`(select public.user_org_id())` etc.) in `20260621090100_chat_rls_initplan_perf_wrap.sql` so the argument-free helpers evaluate once per statement rather than per row.
