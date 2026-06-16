# Local dev invite codes

Registration is **invite-only**. The app hashes the code you type with SHA-256 and matches `qr_invites.token_hash`.

## Default product behavior (UI-created invites)

| Property | Behavior |
| --- | --- |
| **Uses** | **One signup per invite row** (`status` → `accepted`) unless `reusable = true` |
| **One-shot expiry** | Default **7 days** from creation (`expires_at`) |
| **Reusable expiry** | Default **30 days**; user presets up to **365 days** max — **no unlimited for any role** |
| **Code** | Random hex token in URL — not a custom passphrase |

Product UI MUST NOT create invites with open-ended validity. Dev seeds below may use far-future dates for local testing only.

## Seeded dev codes (local)

Run after `supabase start` and `node scripts/create-local-dev-user.mjs`:

```bash
node scripts/seed-dev-invites.mjs
```

Re-run after `supabase db reset` (wiped DB).

| Code | Reusable | Valid | Notes |
| --- | --- | --- | --- |
| `KlevetaKamin` | Yes | Until 2099 (open dev code) | **Dev-only** — not allowed in product UI |
| `KlevetaKamin-Mai-2026` | Yes | 2026-05-01 → 2026-06-01 (Europe/Vienna) | |
| `KlevetaKamin-Juni-2026` | Yes | 2026-06-01 → 2026-07-01 (Europe/Vienna) | |

Codes are **case-sensitive** (`KlevetaKamin`, not `klevetakamin`).

## Hosted Supabase

These rows are **not** on cloud unless you run equivalent SQL there. Cloud users need invites created in **Settings → Invite management** or a one-off admin SQL with a real `created_by` user id.
