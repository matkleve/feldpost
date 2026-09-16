---
id: STUDY-009
type: review
status: partially-remediated
supersedes: none
corrected-by: none
---

# Defensive security review (static) — September 2026

**Measured:** 2026-09-16 on branch `cursor/defensive-security-audit-chat-rls-43ea`, commit base `60cdbb41` (main at measurement start).  
**Method:** Static read of `docs/security-boundaries.md`, `supabase/migrations/**`, Edge Function sources, `scripts/validate-*.sql`, and selected `apps/web` call sites. **No live database, no hosted project, no offensive probing.** Supabase MCP was unauthenticated in this environment. Grades below are therefore at most `[A]` for repository text and `[B]`/`[C]` for runtime effect.

### How this study is marked

Frontmatter `status: partially-remediated` is the correct label while **any** finding remains open. Do **not** flip the whole study to “fixed” / `active` / `historical` until F-03…F-07 are closed (or explicitly rejected). Per [`STUDY-FORMAT.md`](./STUDY-FORMAT.md):

| When | Status to use |
| --- | --- |
| Some findings fixed, some still open | `partially-remediated` (this file) — ledger below names where each fix landed |
| Every finding closed and owner signed off | keep this file as `partially-remediated` → then `historical` **or** leave it and open a short follow-up study that says “all STUDY-009 findings closed”; do not rewrite findings away |
| A later study replaces the reasoning | new study gets a new id; set this file’s `corrected-by` and `status: superseded` |

`corrected-by` in frontmatter is for **superseding studies**, not for listing migrations. Migrations and commits belong in the ledger.

### Remediation ledger

| Finding | Status | Where it landed |
| --- | --- | --- |
| F-01 chat private/DM isolation | **remediated** (code) — live DB proof still owner-side | `supabase/migrations/20260916162935_restore_chat_rls_membership_isolation.sql`; checks in `scripts/validate-chat-rls.sql`; commit on PR #207 |
| F-02 `user_roles` org scope | **remediated** (code) — same | same migration |
| F-03 CI live RLS validators | **open** | — |
| F-04 public branding + SVG | **open** | — |
| F-05 `org_api_keys` list breadth | **open** | — |
| F-06 stale DSGVO orphan script | **open** | — |
| F-07 drop dead DEFINER RPCs | **open** | — |

## Trust model (already sound)

- RLS is the security boundary; the Angular client is untrusted. `[A]` — `docs/adr/0003-rls-is-the-security-boundary.md`, `docs/security-boundaries.md` §1–2.
- Media/images storage paths require `{org_id}/{user_id}/…` and private buckets. `[A]` — `20260304000001_storage_images.sql`, `20260327121000_storage_media_bucket_init.sql`.
- Chat attachments were flipped private with org-scoped SELECT. `[A]` — `20260622080000_chat_attachments_private_bucket.sql`.
- Anon EXECUTE on authenticated-only SECURITY DEFINER RPCs was systematically revoked (issues #193 / #201 lineage). `[A]` — `20260911120000`, `20260911130000`, `20260911140000`; gate `scripts/validate-authenticated-rpc-grants.sql`.
- Edge Functions `geocode` and `generate-media-preview` set `verify_jwt = true`; preview uses user JWT for the row check before service-role storage I/O. `[A]` — `supabase/config.toml`, `generate-media-preview/index.ts`.

## Findings

### F-01 — Chat private/DM message isolation regressed (HIGH) — **remediated in this change**

`20260621090100_chat_rls_initplan_perf_wrap.sql` says it reproduces “current” policies but cites `20260615180000` and re-creates weak bodies. `[A]` — migration header lines 14–18 and policy bodies at lines 24–82.

After that migration, `chat_messages: channel read` / `member insert` only require `organization_id = user_org_id()`, not `can_access_chat_channel`. `[A]` — same file.

Postgres ORs multiple permissive SELECT policies. Recreating `chat_channels: org read` while leaving `accessible read` in place re-opens private/DM channel rows to every org member. `[A]`+`[C]` — policy names across `20260615200000` (drops org read, adds accessible read), `20260615202043` (keeps accessible read), `20260621090100` (re-adds org read without dropping accessible read); OR semantics are PostgreSQL RLS default `[C]` from docs knowledge, not re-measured here.

**Fix shipped:** drop weak `org read`; restore `accessible read`, membership-scoped member read, and `can_access_chat_channel` on message read/insert. Live proof: extended checks in `scripts/validate-chat-rls.sql` (must be run against a real DB — not executable in this sandbox). `[D]` owner should apply migration to hosted before treating production as closed.

### F-02 — `user_roles` SELECT/write not org-scoped for admins (HIGH) — **remediated in this change**

Policy `user_roles: org read` allows `is_admin()` or `has_permission('members.view')` with **no** `profiles.organization_id` predicate. `[A]` — `20260615180000` lines 756–762. An admin JWT therefore satisfies SELECT for every `user_roles` row in the catalog. `[C]` — runtime cross-org read not executed here.

Legacy `user_roles: admin write` / `admin delete` only checked `is_admin()`. `[A]` — `20260303000005_rls.sql`. Product role changes use DEFINER `assign_org_member_role` (org-checked), but direct PostgREST inserts were under-gated. `[A]`+`[C]`.

**Fix shipped:** org-scoped SELECT/INSERT/DELETE policies in `20260916162935_…`.

### F-03 — Live RLS/grant validators not in `npm run verify` (MEDIUM) — open

`scripts/verify.mjs` runs `check-rpc-param-contract.mjs` but not `validate-chat-rls.sql`, `validate-upload-role-rls.sql`, or `validate-authenticated-rpc-grants.sql`. `[A]` — `scripts/verify.mjs`. Those scripts require a live DB (`scripts/local-verify/README.md`). `[A]`. The F-01 regression could merge without a red gate. `[C]`.

**Proposal `[D]`:** add a CI job (or local-verify step) that applies migrations to ephemeral Postgres and runs the validate-*.sql suite on every migration PR.

### F-04 — `org-branding` public bucket + SVG MIME (LOW–MEDIUM) — open

Bucket `public = true` and allowlist includes `image/svg+xml`. `[A]` — `20260616160000_org_branding_storage.sql`. UI renders logos via `<img [src]>`. `[A]` — `organization-branding-section.component.html`. Script execution inside `<img>` SVG is generally blocked by browsers, but a public SVG still expands the stored-XSS / content-sniff surface for any consumer that inlines the file. `[C]`.

**Proposal `[D]`:** drop SVG from the allowlist (PNG/WebP/JPEG only) unless a product requirement forces it; keep the bucket public only if marketing needs hotlinkable logos.

### F-05 — `org_api_keys` readable by every org member (LOW) — open

SELECT policy is org-wide with no `org.api_keys.manage` check; hashes are SHA-256 of the raw key (client-side). `[A]` — table + policy in `20260615180000`; `organization.service.ts` `sha256`. Metadata leak (names, prefixes, last_used) to viewers/workers. `[C]` severity depends on product intent.

**Proposal `[D]`:** gate SELECT on `org.api_keys.manage` (or a dedicated view permission).

### F-06 — `validate-dsgvo-security.sql` still targets legacy `images` (LOW) — open

Orphan check joins `public.images`. `[A]` — `scripts/validate-dsgvo-security.sql`. Media cutover moved storage to `media_items` / `media` bucket. `[A]` — media migrations. Script is stale as an operational gate. `[C]`.

### F-07 — Dead SECURITY DEFINER functions still present (LOW) — open

`20260911140000` revoked client EXECUTE on dead location RPCs but deferred DROP. `[A]` — migration comments. Residual attack surface if grants regress. `[C]`.

## What this review did **not** do

- No exploit payloads, no unauthenticated probing of hosted APIs, no credential harvesting.
- No confirmation that hosted migration history matches git (requires `supabase migration list` on the linked project).
- No pen test of share-link token entropy or invite QR flows beyond noting tokens are SHA-256 hashed at rest. `[A]` hash usage in share-set migrations; entropy not measured `[C]`.

## Recommended owner sequence

1. Apply `20260916162935_restore_chat_rls_membership_isolation.sql` to hosted; run `psql "$DATABASE_URL" -f scripts/validate-chat-rls.sql` — expect PASS. `[D]`
2. Decide F-03 (CI live RLS) and F-04 (SVG/public branding). `[D]`
3. Schedule external authorized pen test for share links, invites, and export — outside agent scope. `[D]`
