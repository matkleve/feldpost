# Chat service module

Code: `apps/web/src/app/core/chat/`

Spec: `docs/specs/service/chat/chat-service.md`

## Boundaries

- `ChatService` — facade for colleagues chat UI
- `ChatChannelsAdapter` — channels, members, unread counts
- `ChatMessagesAdapter` — messages, reactions, attachments, entity links
- `ChatRealtimeAdapter` — Supabase Realtime subscriptions

## Consumers

- `ColleaguesPageComponent` and child chat components
