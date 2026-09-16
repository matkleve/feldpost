---
id: STUDY-009
type: review
status: partially-remediated
supersedes: none
corrected-by: none
---

# Defensive security review (static) — September 2026

**Measured:** 2026-09-16 on branch `cursor/defensive-security-audit-chat-rls-43ea`, commit base `60cdbb41` (main at measurement start).  
**Method:** Static read of `docs/security-boundaries.md`, `supabase/migrations/**`, Edge Function sources, `scripts/validate-*.sql`, and selected `apps/web` call sites. **No offensive probing.** Live proof of F-01–F-03 via `scripts/local-verify/run.sh` on PostgreSQL 16 + PostGIS in this environment (2026-09-16). Supabase MCP / hosted `db push` were not available (auth skipped). Grades: `[A]` for repo text and commands actually run here; `[B]`/`[C]` otherwise.

### How this study is marked

Frontmatter stays `partially-remediated` until **hosted** has applied the restore/hardening migrations (`supabase migration list` Local=Remote) — that last step is operator-side, not a missing code fix. Per [`STUDY-FORMAT.md`](./STUDY-FORMAT.md): do not rewrite findings away; use the ledger. `corrected-by` is for superseding studies only.

When hosted is confirmed green, flip this file to `historical` (or leave the ledger and stop opening F-01…F-07 work).

### Remediation ledger

| Finding | Status | Where it landed |
| --- | --- | --- |
| F-01 chat private/DM isolation | **remediated** + local live PASS | `20260916162935_restore_chat_rls_membership_isolation.sql`; `scripts/validate-chat-rls.sql` (9/9 PASS in local-verify) |
| F-02 `user_roles` org scope | **remediated** | same migration |
| F-03 CI live RLS validators | **remediated** | `scripts/local-verify/run.sh`, `seed-rls-actors.sql`, `.github/workflows/local-rls-verify.yml`, `npm run supabase:local-verify` |
| F-04 public branding + SVG | **remediated** | `20260916165450_harden_branding_and_api_key_read.sql`; client accept-list + i18n |
| F-05 `org_api_keys` list breadth | **remediated** | same migration (drop broad SELECT; manage policy remains) |
| F-06 stale DSGVO orphan script | **remediated** | `scripts/validate-dsgvo-security.sql` → `media` / `media_items` |
| F-07 drop dead DEFINER RPCs | **remediated** (already on main) | `20260911150000_drop_dead_image_era_functions.sql` — no new work |

### Agent handoff (do not redo F-01…F-07)

Before any security/RLS work on chat, `user_roles`, branding, API keys, or grant validators:

1. Read this ledger.
2. Read [TRAP-022](../TRAPS.md#trap-022--an-rls-perf-wrap-that-reintroduces-pre-hardening-policies).
3. Run `npm run supabase:local-verify` (or wait for `local-rls-verify` CI).

**Do not** re-implement F-01…F-07 unless local-verify fails after a rebase. Remaining operator work: `supabase db push` on hosted, then `supabase migration list`.

## Trust model (already sound)

- RLS is the security boundary; the Angular client is untrusted. `[A]` — `docs/adr/0003-rls-is-the-security-boundary.md`, `docs/security-boundaries.md` §1–2.
- Media/images storage paths require `{org_id}/{user_id}/…` and private buckets. `[A]` — `20260304000001_storage_images.sql`, `20260327121000_storage_media_bucket_init.sql`.
- Chat attachments were flipped private with org-scoped SELECT. `[A]` — `20260622080000_chat_attachments_private_bucket.sql`.
- Anon EXECUTE on authenticated-only SECURITY DEFINER RPCs was systematically revoked (issues #193 / #201 lineage). `[A]` — `20260911120000`, `20260911130000`, `20260911140000`; gate `scripts/validate-authenticated-rpc-grants.sql` (85/85 PASS local-verify). `[A]`
- Edge Functions `geocode` and `generate-media-preview` set `verify_jwt = true`; preview uses user JWT for the row check before service-role storage I/O. `[A]` — `supabase/config.toml`, `generate-media-preview/index.ts`.

## Findings (detail)

### F-01 — Chat private/DM message isolation regressed (HIGH) — remediated

`20260621090100_chat_rls_initplan_perf_wrap.sql` re-copied pre-hardening bodies and re-created weak `chat_channels: org read` beside `accessible read` (Postgres ORs permissive policies). Message read/insert dropped `can_access_chat_channel`. `[A]`

**Fix:** `20260916162935_…`. **Live:** local-verify chat script 9/9 PASS. `[A]`

### F-02 — `user_roles` not org-scoped for admins (HIGH) — remediated

Admin/`members.view` SELECT (and legacy admin write/delete) lacked `profiles.organization_id`. `[A]` Fixed in `20260916162935_…`.

### F-03 — Live RLS/grant validators not in CI (MEDIUM) — remediated

Added ephemeral Postgres workflow + `scripts/local-verify/run.sh` covering grants, chat, and upload-role matrices. `[A]`

### F-04 — `org-branding` SVG MIME (LOW–MEDIUM) — remediated

Bucket allowlist and client upload accept-list are PNG/JPEG/WebP only. `[A]`

### F-05 — `org_api_keys` readable by every org member (LOW) — remediated

Dropped `org_api_keys: org read`; manage permission policy covers access. `[A]`

### F-06 — `validate-dsgvo-security.sql` targeted legacy `images` (LOW) — remediated

Orphan counts now use `media` / `media_items` (legacy images bucket kept as a secondary cleanup metric). `[A]`

### F-07 — Dead SECURITY DEFINER functions (LOW) — remediated

Already dropped in `20260911150000` (#202). STUDY-009 initially flagged revoke-only; drop had already landed. `[A]`

## What this review did **not** do

- No exploit payloads or hosted probing.
- No confirmation that **hosted** migration history matches git (requires `supabase migration list` on the linked project). `[D]` owner.
- No pen test of share-link / invite entropy beyond noting SHA-256 at rest. `[A]`/`[C]`

## Recommended owner sequence

1. Merge PR #207; `supabase db push`; `supabase migration list` — Local=Remote. `[D]`
2. Optionally mark this study `historical` once hosted is confirmed. `[D]`
3. External authorized pen test for share links / invites / export remains worthwhile and is outside this study. `[D]`
