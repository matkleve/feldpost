# app-chat-area

Main area of the colleagues page: header, message list, composer, search, threads, reactions, attachments.

**Code:** `apps/web/src/app/features/colleagues/chat/chat-area.component.ts`

## Composition

```
app-chat-area
├── app-chat-header          ← see chat-header.md
├── Search results panel     ← optional overlay list
├── Message list + thread    ← app-thread-panel when open
└── Composer
```

## Inputs

| Input | Type | Description |
| --- | --- | --- |
| `channel` | `ChatChannel \| null` | Active channel |
| `headerTitle` | `string \| null` | Display title (DM name or channel name) |
| `messages` | `ChatMessage[]` | Live signal from `ChatService.liveMessages` |
| `typingUserIds` | `Set<string>` | Currently typing user IDs |
| `channelMembers` | `ChatChannelMember[]` | Header members dropdown + typing name resolution |
| `searchResults` | `ChatMessage[]` | Full-text search hits |
| `canDeleteAny` | `boolean` | Admin right to delete other users' messages |

## Outputs

| Output | Payload | When |
| --- | --- | --- |
| `detailsRequested` | `ChatDetailsRequest` | Forwarded from `app-chat-header` |
| `messageSent` | `SendMessageInput` | Composer submitted |
| `typing` | `void` | Keystroke in composer |
| `searchRequested` | `string` | Search submitted |
| `messageEdited` | `{ messageId, content }` | Edit saved |
| `messageDeleted` | `string` | Delete confirmed |
| `reactionToggled` | `{ messageId, emoji }` | Reaction clicked |

## Behaviour

- **Header variant**: Derived from active channel — `channel`, `dm`, or `empty` when none selected.
- **Typing indicator**: Shows name — "Hans is typing…", "Hans, Maria are typing…". Falls back to "Someone is typing…" if the user ID cannot be resolved from `channelMembers`.
- **Message groups**: Grouped by date with a date separator line between groups.
- **Entity links**: Messages with linked projects/media show a link card (type + label).
- **Thread**: Clicking "Reply in thread" opens `app-thread-panel` alongside the message list.
- **Composer**: File attachment and project link selectable; Enter sends; Shift+Enter line break not implemented (plain textarea).

## Acceptance criteria

- [x] Renders channel messages with author and timestamp
- [x] Sends messages via output to `ChatService`
- [x] Opens thread panel for threaded replies
- [x] Edit/delete own messages; delete-any when permitted
- [x] Quick emoji reactions (6 predefined)
- [x] File attachment picker in composer
- [x] Project entity link in composer
- [x] Search results panel with jump-to-message
- [x] Typing indicator shows name instead of "Someone"
- [x] Delegates header chrome to `app-chat-header`; single `detailsRequested` output to page
