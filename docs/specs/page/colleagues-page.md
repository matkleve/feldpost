# Colleagues Page

> **Status:** Implementation contract — live on `main`. Route `/colleagues`.

## Philosophy: chat as background protocol

feldpost is not a chat tool. The primary work happens on the map, in projects, and through the media workflow. Chat is the **coordination layer** that accompanies that workflow — not a replacement for WhatsApp or Slack.

Core principle: **sharing is the primary act; chat is the protocol around it.**

Consequences for every decision in the chat area:

- **Sharing-first**: Wherever a medium or project can be shared, the primary button is external sharing (WhatsApp, Mail, link copy). "Share in chat" is secondary in the same affordance.
- **Link-open → chat event**: When a share link is opened, that event appears automatically in the relevant channel (Spotify-style: activity is written passively into the social layer). Users do nothing actively.
- **No feature overload**: @mentions, pins, and load-more make sense. Slash commands, scheduled messages, custom status, rich-text editor — they don't. The more complex chat becomes, the more it competes with the core product.
- **Externals stay external**: Recipients of share links don't need a chat account. Chat is for internal org coordination, not for communication with external parties.

## What It Is

A split-layout page: a left rail lists channels and DMs; the center is the chat area; the right rail shows contextual details (member detail or channel detail).

## Where It Lives

- **Route**: `/colleagues`
- **Parent**: `app-authenticated-app-layout`
- **Sidebar nav**: Colleagues icon → `/colleagues`
- **Query param**: `?tab=invites` switches to the invites view

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Clicks channel in sidebar | Loads messages, subscribes to realtime; right rail stays closed | `onChannelSelected()` → `selectChannel()` |
| 2 | Clicks member in sidebar | Opens DM channel (find-or-create); right rail stays closed | `onMemberSelected()` → `openDirectMessage()` |
| 3 | Clicks chat title or Details (channel or DM) | Opens matching right-rail inspector | `onChatDetailsRequested()` |
| 4 | Clicks channel member count (header) | Opens searchable members dropdown; right rail stays closed | `app-chat-header` members dropdown |
| 5 | Switches to Invites tab | Shows invite management in center | Router query param |
| 6 | Creates channel | Opens create panel on right; after confirm new channel becomes active | `onChannelCreateOpen()` / `onChannelCreate()` |
| 7 | Archives channel | Channel removed from list; next channel becomes active | `onChannelArchive()` |
| 8 | Invites member to channel | Member added to `chat_channel_members` via RPC | `onChannelMemberInvite()` |
| 9 | Sends a message | Sent via `ChatService.sendMessage()`; realtime distributes to all | `ChatAreaComponent` |

## Component Hierarchy

```
ColleaguesPageComponent (shell)
├── MemberListComponent               ← left rail ~220px
│   ├── Channels section (collapsible, starred sorted first)
│   └── Direct Messages section (collapsible)
├── ChatAreaComponent                 ← center, main chat
│   ├── app-chat-header               ← shared channel/DM header; see chat-header.md
│   ├── MessageList (date groups, reactions, attachments, entity links)
│   ├── ThreadPanelComponent          ← right of messages when thread open
│   └── Composer (text, file, project link)
├── ChannelDetailPanelComponent       ← right rail — create mode or channel inspector
│   ├── Create form (name, private toggle)
│   └── View tabs: About | Members (archive, add-member search)
└── MemberDetailPanelComponent        ← right rail — DM colleague inspector
    ├── Avatar + Name
    ├── Role (editable for managers)
    └── Actions (Message, Suspend, Remove)
```

## State

| Signal | Type | Default | Controls |
| --- | --- | --- | --- |
| `selectedChannelId` | `string \| null` | `general` on load | Active chat |
| `rightRailInspector` | `'closed' \| 'channel' \| 'member'` | `'closed'` | Which right-rail panel is open |
| `inspectorMemberId` | `string \| null` | `null` | Member shown when inspector is `member` |
| `channelDetailTab` | `'about' \| 'members'` | `'about'` | Active tab in channel detail panel |
| `creatingChannel` | `boolean` | `false` | Create form overrides inspector on right rail |
| `channelMembers` | `ChatChannelMember[]` | `[]` | Typing indicator, header dropdown, channel panel |
| `onlineUserIds` | `Set<string>` | empty | Presence dots |

## Data

| Field | Source |
| --- | --- |
| Members + Roles | `MemberService.loadMembers()`, `RoleService.loadRoles()` |
| Channels + Unread | `ChatService.loadChannels()` — cached 30 s, invalidated on mutation |
| Messages | `ChatService.loadMessages()` — cached per channel, realtime keeps current |
| Channel Members | `ChatService.loadChannelMembers()` — on each channel switch |
| Presence | `ChatService.subscribePresence()` — Supabase Presence per channel |

## Caching strategy

- **Channels**: 30-second TTL. No reload on channel switch; invalidated only on create/archive.
- **Messages per channel**: In-memory, no TTL. Switching channels shows cached messages instantly; background refresh on next `loadMessages()`. Realtime events keep the cache live.
- **Unread count**: Set to 0 locally when a channel is opened; actual count refreshed on next `loadChannels()`.

## Realtime

Each active channel holds three Supabase subscriptions:

1. `chat:{channelId}` — Postgres Changes (INSERT/UPDATE/DELETE on `chat_messages`)
2. `chat:{channelId}` broadcast `typing` — typing indicator
3. `presence:{channelId}` — online status

## Security

RLS via `can_access_chat_channel()`: public channels visible to all org members; private and DM channels require membership. No chat access for external link recipients.

## File Map

| File | Purpose |
| --- | --- |
| `features/colleagues/page/colleagues-page.component.*` | Shell, state coordination |
| `features/colleagues/sidebar/member-list.component.*` | Left rail: channels + DMs |
| `features/colleagues/chat/chat-header.component.*` | Shared channel/DM header |
| `features/colleagues/chat/chat-header.types.ts` | Header variant + details request types |
| `features/colleagues/chat/chat-area.component.*` | Message area + composer |
| `features/colleagues/chat/thread-panel.component.*` | Thread side panel |
| `features/colleagues/channel/channel-detail-panel.component.*` | Channel create/view |
| `features/colleagues/member-detail/member-detail-panel.component.*` | Member context |
| `features/colleagues/invites/colleagues-invites-panel.component.*` | Invite management |
| `core/chat/chat.service.ts` | Facade: channels, messages, realtime |

## Acceptance Criteria

- [x] Channel switch triggers ≤ 4 HTTP requests (no redundant full channel list reload)
- [x] Returning to a visited channel shows messages instantly (message cache)
- [x] Typing indicator shows name: "Hans is typing…" instead of "Someone is typing…"
- [x] Member detail header shows "Details"; name displayed below avatar
- [x] Unread badge in sidebar; zeroed immediately on open
- [ ] Share link open → chat event (R2 — not yet implemented)
- [ ] @mention with autocomplete (future, if demand grows)

## Open

- R2: link-open → chat event attribution (anonymous vs. identified)
- Pagination: currently 50-message limit, no "load more"
