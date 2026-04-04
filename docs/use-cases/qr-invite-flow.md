# QR Invite Flow - Use Cases and Interaction Scenarios

> Element spec: [element-specs/qr-invite-flow.md](../element-specs/qr-invite-flow.md)
> Related specs: [element-specs/settings-overlay.md](../element-specs/settings-overlay/settings-overlay.md), [element-specs/search-bar.md](../element-specs/search-bar/search-bar.md)

## Overview

These use cases define the invite creation and sharing workflow that starts from Settings or command-mode search (`/image`).

Focus areas:

- auto-generation of QR invite when Invite Management opens
- role preselection (`clerk` or `worker`) at invite creation time
- multi-channel sharing (`copy`, `email`, `whatsapp`)
- permission-safe behavior with RLS-backed enforcement

### High-Level Flow (Mermaid)

```mermaid
flowchart TD
  A[User enters Invite Management or runs /image command] --> B[System auto-creates invite row]
  B --> C[Role is selected for target user]
  C --> D[QR payload and URL rendered]
  D --> E{Share channel}
  E -- Copy --> F[Clipboard + share log]
  E -- Email --> G[Email intent + share log]
  E -- WhatsApp --> H[WhatsApp intent + share log]
  D --> I{Invite lifecycle}
  I -- Scanned and accepted --> J[Mark accepted]
  I -- Expired --> K[Mark expired]
  I -- Revoked --> L[Mark revoked]
```

## UC-1: Open Invite Management and Auto-Generate QR

Context: A clerk opens Invite Management in settings and expects instant QR generation.

```mermaid
sequenceDiagram
  actor Clerk
  participant Settings as SettingsOverlay
  participant Invite as InviteService
  participant DB as Supabase

  Clerk->>Settings: Open Invite Management
  Settings->>Invite: createInvite(targetRole=worker)
  Invite->>DB: insert qr_invites
  DB-->>Invite: invite row
  Invite-->>Settings: inviteUrl + qrPayload
  Settings-->>Clerk: Render QR immediately
```

Expected:

- No extra click is needed to generate the first QR.
- Status starts as `active`.
- Expiration timestamp is visible.

## UC-2: Launch from Search Command `/image`

Context: User types `/image` and chooses `Create QR Invite`.

```mermaid
sequenceDiagram
  actor User
  participant Search as SearchBar
  participant Settings as SettingsOverlay
  participant Invite as InviteService

  User->>Search: Type /image
  Search-->>User: Show command candidates
  User->>Search: Select Create QR Invite
  Search->>Settings: openSection(invite-management)
  Settings->>Invite: createInvite(defaultRole)
  Invite-->>Settings: invite model
```

Expected:

- Command jumps directly into Invite Management.
- Same generation logic as settings entry is used.

## UC-3: Select Role Clerk Before Sharing

Context: Creator needs a clerk invite.

```mermaid
flowchart LR
  A[Role dropdown opens] --> B[Select clerk]
  B --> C[Invalidate current draft token]
  C --> D[Create new invite for target_role=clerk]
  D --> E[Refresh QR and invite link]
```

Expected:

- Role change regenerates invite payload.
- UI clearly shows the selected target role.

## UC-4: Select Role Worker Before Sharing

Context: Creator needs a worker invite.

Expected:

- Selecting `worker` generates a worker-scoped invite.
- Newly generated QR replaces the previous QR.
- Old token cannot be accepted anymore.

## UC-5: Share Invite via Copy Link

Context: Creator copies invite URL and sends manually.

```mermaid
sequenceDiagram
  actor Creator
  participant UI as InvitePanel
  participant Clip as Clipboard API
  participant DB as Supabase

  Creator->>UI: Click Copy Link
  UI->>Clip: writeText(inviteUrl)
  UI->>DB: insert invite_share_events(channel=copy-link)
  UI-->>Creator: Show Copied confirmation
```

Expected:

- Clipboard receives full invite URL.
- Share event is logged with `copy-link`.

## UC-6: Share Invite via Email

Context: Creator sends invite through email client.

Expected:

- Email share opens mail intent with invite URL.
- Share event is logged with `email`.
- Failure to open email app shows non-blocking fallback text.

## UC-7: Share Invite via WhatsApp

Context: Creator sends invite through WhatsApp.

Expected:

- WhatsApp deep link opens with invite URL payload.
- Share event is logged with `whatsapp`.
- If WhatsApp is unavailable, UI offers copy-link fallback.

## UC-8: Invitee Scans QR and Accepts

Context: Target user scans QR and completes registration/join.

```mermaid
sequenceDiagram
  actor Invitee
  participant Join as Join Flow
  participant DB as Supabase

  Invitee->>Join: Scan QR and open invite URL
  Join->>DB: validate token + status + expires_at
  DB-->>Join: valid active invite
  Join->>DB: set status=accepted, accepted_user_id, accepted_at
  Join-->>Invitee: Join success
```

Expected:

- Invite can be accepted exactly once.
- Accepted invite state is persisted.

## UC-9: Expired Invite Cannot Be Accepted

Context: Invitee scans a QR after expiry time.

Expected:

- Validation fails with `expired` state.
- No user role is assigned from expired invite.
- UI suggests requesting a new invite.

## UC-10: Permission Deny for Unauthorized Creator

Context: Viewer (or out-of-org actor) tries to create invite.

```mermaid
sequenceDiagram
  actor Viewer
  participant UI as InvitePanel
  participant DB as Supabase RLS

  Viewer->>UI: Open Invite Management
  UI->>DB: insert qr_invites
  DB-->>UI: RLS deny
  UI-->>Viewer: Show no-permission message
```

Expected:

- RLS blocks unauthorized insert.
- UI displays clear permission feedback.
- No orphan invite row is created.

## Acceptance Checklist for This Use-Case Set

- [ ] Covers both entry points: settings and `/image` command.
- [ ] Covers role preselection for `clerk` and `worker`.
- [ ] Covers three share channels and logging.
- [ ] Covers accept, expire, and revoke lifecycle outcomes.
- [ ] Covers RLS deny behavior for unauthorized creators.

