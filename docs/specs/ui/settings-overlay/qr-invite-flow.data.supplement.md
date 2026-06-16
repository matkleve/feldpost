# QR Invite Flow — Data Model

Parent: [qr-invite-flow.md](./qr-invite-flow.md)

## One-shot row shape

`reusable=false`, `display_name` null, `valid_from` null, `expires_at` default `now() + 7 days`.

Reusable rows, `invite_signups`, and 365-day cap: [colleagues-invites-workspace](../colleagues/colleagues-invites-workspace.md).

```mermaid
erDiagram
    organizations ||--o{ qr_invites : scopes
    auth_users ||--o{ qr_invites : creates
    auth_users ||--o| qr_invites : accepts
    qr_invites ||--o{ invite_share_events : logs
    qr_invites ||--o{ invite_signups : records

    qr_invites {
        uuid id PK
        uuid organization_id FK
        uuid created_by FK
        text target_role
        text display_name
        boolean reusable
        text invite_url
        text qr_payload
        text token_hash
        text status
        timestamptz valid_from
        timestamptz expires_at
        timestamptz accepted_at
        uuid accepted_user_id FK
    }

    invite_signups {
        uuid id PK
        uuid invite_id FK
        uuid user_id FK
        timestamptz joined_at
    }

    invite_share_events {
        uuid id PK
        uuid invite_id FK
        uuid actor_user_id FK
        text channel
        timestamptz created_at
    }
```
