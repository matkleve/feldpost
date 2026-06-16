# app-chat-header

Shared header shell for channel and direct-message conversations on the colleagues page.

**Code:** `apps/web/src/app/features/colleagues/chat/chat-header.component.ts`

## Variants

| `variant` | Title treatment | Right-rail trigger | Members dropdown |
| --- | --- | --- | --- |
| `channel` | `#` prefix + channel name | Title or Details → channel inspector | Member-count button with searchable list |
| `dm` | Avatar initials + colleague name | Title or Details → member inspector | Hidden |
| `empty` | Static title only | None | Hidden |

## Inputs

| Input | Type | Description |
| --- | --- | --- |
| `variant` | `ChatHeaderVariant` | `channel`, `dm`, or `empty` |
| `title` | `string` | Display name (channel or DM partner) |
| `memberCount` | `number` | Shown on channel members button |
| `channelMembers` | `ChatChannelMember[]` | Populates members dropdown (channel only) |
| `searchQuery` | `string` | Message search field value |

## Outputs

| Output | Payload | When |
| --- | --- | --- |
| `detailsRequested` | `ChatDetailsRequest` | Title or Details clicked |
| `searchQueryChange` | `string` | Message search input changed |
| `searchSubmitted` | `void` | Message search submitted |

## `ChatDetailsRequest`

| `kind` | `channelTab` | Page response |
| --- | --- | --- |
| `channel` | `'about'` (default) or `'members'` | Opens `app-channel-detail-panel` on right rail |
| `member` | — | Opens `app-member-detail-panel` for active DM partner |

## Behaviour

- **Unified chrome**: Channels and DMs share the same top row (identity + actions) and Messages tab strip.
- **Right rail is explicit**: Header never auto-opens the rail; the page opens it only after `detailsRequested`.
- **Members dropdown (channel only)**: Opens anchored dropdown with search; lists members read-only (no rail navigation).
- **Variant reset**: Switching variant closes the members dropdown.

## Parent wiring

- `app-chat-area` hosts `app-chat-header` and forwards `detailsRequested` unchanged.
- `ColleaguesPageComponent` maps requests to `rightRailInspector`: `'closed' | 'channel' | 'member'`.

## Acceptance criteria

- [x] Channel and DM render the same header structure (title, Details, Messages tab)
- [x] Title and Details emit `detailsRequested` for both channel and DM
- [x] Channel member count opens searchable dropdown without opening right rail
- [x] Message search field delegates to parent via existing chat-area handlers
