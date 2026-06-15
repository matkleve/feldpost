# Sharing-first direction + workspace pane simplification (plan)

**Status:** Planning — backlog, not a normative spec. Captured 2026-06-15 after a design
review, re-grounded against `main` (`f3d6e4a`). When executing, update `docs/specs/`
contracts in the same change set as behavior.

This plan reconciles a design discussion (project media, workspace pane simplification,
chat-vs-sharing) with what already shipped on `main`. Much of it is **already built**;
the genuinely-open work is small and listed under "Remaining".

---

## Locked decisions

1. **Chat stays (option a).** The full colleagues/chat system on `main`
   (channels, DMs, threads, org roles, RLS, realtime) is kept — not rolled back.
2. **Share is external-first.** Everywhere media or a project can be shared, the
   **primary/foreground** action is **share via WhatsApp / Mail / copy-link**.
   **"Share in chat" is the secondary** option in the same affordance.
3. **Opening a shared link surfaces it in chat.** When a recipient opens an external
   share link, that open-event is posted into chat as a message/event (the
   "Spotify-style background protocol", layered on top of the real chat).
4. **Security tag = secrecy, not audit.** Security-tagged media never leave via an
   anonymous link (no OTP request-access flow). Cross-company visibility is governed
   by roles inside the app, not by share links.

---

## Reality check (what is already built on `main`)

| Thread | Status on `main` | Key files |
| --- | --- | --- |
| Project media: Upload + Add-existing buttons | ✅ Done | `features/projects/detail/project-detail-view.component.*` (`openPicker()`, `onUploadMedia()`), `shared/media-picker-dialog/` |
| Projects split layout + dashboard shell | ✅ Done | `features/projects/{sidebar,dashboard,detail,details-panel,media-section}/` |
| `/projects` vs detail relationship | ✅ Resolved | `/projects` = dashboard, `/projects/:id` = detail; grid/list/board/map removed |
| Map filter toolbar (Filter / Projects / Timespace) | ✅ Done | `features/map/map-filter-toolbar/`, `core/map-timespace/` |
| Additive selection (Ctrl/Cmd/Shift) | 🟡 Partial | `core/workspace-selection/workspace-selection.helpers.ts`, `workspace-selected-items-grid.component.ts` |
| Share mechanics (audience dialog, share-set, restore) | ✅ Exists | `shared/share-link-audience-dialog/`, `core/share-set/` |
| Chat entity-links ("share in chat" data model) | ✅ Exists | `chat_message_links` table, `ChatMessageEntityLink` |
| Colleagues/chat full system | ✅ Done | `features/colleagues/`, `core/chat/`, 6 migrations |

---

## Remaining work

### R1 — External-first share affordance
- Audit the existing share entry points (workspace footer, project header, media detail)
  so the **primary** button is external share; **chat** is secondary in the same menu.
- Add **WhatsApp** (`wa.me/?text=<link>`) and **Mail** (`mailto:?body=<link>`) deep-link
  actions + copy-link, reusing `core/share-set` URL generation.
- Note: `wa.me` only deep-links to individual contacts / the share sheet, **not** to
  WhatsApp groups — do not promise "post to the project group".

### R2 — Link-open → chat event
- When a share link is opened (`share-link-restore.service.ts` path), emit a chat
  event/message via `chat_message_links` so the share shows up in the relevant channel.
- Decide attribution: anonymous open ("link opened") vs. identified open (only if the
  opener is a logged-in org member). External anonymous opens stay anonymous.

### R3 — Workspace pane simplification (the only untouched redesign)
- **B (blocker, decide first):** floating overlay vs. the current fixed split pane.
- **C:** strip pane toolbar to Sort + grid + Remove + footer (Grouping out; Filter/Projects
  already live in the map filter toolbar, R-side). Update `docs/specs/ui/workspace/workspace-pane.md`
  and `docs/specs/component/workspace/active-selection-view.md`.
- **A:** finish remove-only interaction (×-on-tile) + a **touch affordance** for additive
  selection (no Ctrl on tablets). Additive plumbing already exists.
- **E:** confirm the global Upload button opens the pane's Upload tab (plumbing:
  `UploadShellUiService.openUploadPanel()` already used by projects detail).

### R4 — Security tag (small, greenfield)
- Add a `security`/`restricted` flag on media items.
- Exclude tagged media from anonymous share links entirely (no placeholder, no request flow).
- Visibility for tagged media handled by roles (org membership) when logged in.
- Keep the flag model loose enough to survive future **multi-org projects**.

### R5 — Dashboard widget content (WS2 finish)
- Fill dashboard widgets with real content (currently structural).
- **Team widget is now unblocked** — the `org_roles_colleagues` migration provides
  membership/roles data.
- Still deferred: widget layout persistence (localStorage vs DB).

---

## Recommended order

1. **R3-B decision** (floating vs split) — unblocks R3-C/A.
2. **R1** external-first share affordance (mostly reorder + deep-links).
3. **R2** link-open → chat event (the new backend wiring).
4. **R3-C/A/E** pane simplification package.
5. **R4** security tag (independent, anytime).
6. **R5** dashboard widget content + Team widget.

## Open decisions

- **R3-B:** floating overlay or keep fixed split pane?
- **R2:** how are external (non-account) opens attributed in chat — anonymous only?
- **R4:** exact semantics of "security tag" once multi-org projects exist.
