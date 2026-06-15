# app-thread-panel

Side panel for viewing and replying in a message thread.

**Code:** `apps/web/src/app/features/colleagues/chat/thread-panel.component.ts`

## Acceptance criteria

- [x] Shows parent message and reply list
- [x] Loads replies via `ChatService.loadThreadReplies`
- [x] Realtime subscription for new thread replies
- [x] Reply composer sends with `parentId`
