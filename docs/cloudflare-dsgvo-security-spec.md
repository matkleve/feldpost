# Cloudflare + DSGVO Security Spec (Go-Live Contract)

**Purpose:** Define mandatory technical and process controls for a DSGVO-compliant Feldpost production rollout on Cloudflare Pages + Supabase.

**Status policy:**

- `P0` must be complete before any production sharing with real company users.
- `P1` should be complete before broad team usage.
- `P2` is recommended hardening.

**How to read status:**

- **Implemented** = control exists in code/migration/docs.
- **Verified** = control was tested in the target production environment and evidence is stored.

---

## 1. Scope

In scope:

- Hosting: Cloudflare Pages (`apps/web` static build)
- Backend: Supabase Auth, Postgres/RLS, Storage, Edge Function `geocode`
- Personal data: account identity, image metadata, location/address data, invite/share tokens

Out of scope:

- Native mobile clients
- Non-Feldpost third-party processors not used by production traffic

---

## 2. Normative References

Legal and guidance references:

- GDPR legal framework (EU Commission): https://commission.europa.eu/law/law-topic/data-protection/data-protection-eu_en
- Regulation (EU) 2016/679 (GDPR): https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Cloudflare GDPR resources (DPA/SCC/subprocessors): https://www.cloudflare.com/trust-hub/gdpr/
- Supabase RLS guide: https://supabase.com/docs/guides/database/postgres/row-level-security
- Cloudflare Pages headers: https://developers.cloudflare.com/pages/configuration/headers/

Repository references:

- Security boundary model: `docs/security-boundaries.md`
- User lifecycle + deletion flow: `docs/user-lifecycle.md`
- Cloudflare runbook: `docs/cloudflare-deployment-security-runbook.md`
- Storage cleanup migration: `supabase/migrations/20260318130000_storage_orphan_cleanup_job.sql`
- Storage cleanup API-mode migration: `supabase/migrations/20260318143000_storage_cleanup_api_mode.sql`
- Storage cleanup runner guard migration: `supabase/migrations/20260318144000_storage_cleanup_runner_api_only.sql`
- Storage cleanup script: `scripts/cleanup-storage-orphans.mjs`
- Share-token hash hardening migration: `supabase/migrations/20260318140000_share_set_token_sha256.sql`

---

## 3. Data Protection Controls

### 3.1 Access control and tenant isolation

- Authorization enforcement is server-side only (RLS + storage policies).
- Every access path must be organization-scoped (`organization_id = user_org_id()`).
- Viewer role remains write-blocked on protected domains.

### 3.2 Authentication and API surface hardening

- `geocode` edge function must require JWT (`verify_jwt = true`).
- CORS must be explicit allow-list only via `ALLOWED_ORIGINS`.
- Empty allow-list is fail-closed for browser origins.
- Wildcard origin (`*`) is not accepted for browser requests.

### 3.3 Storage lifecycle and deletion accountability

- Deletion of DB image rows must be paired with storage-object cleanup.
- Orphan cleanup runs are auditable in `public.storage_cleanup_runs`.
- Cleanup execution must be regular (scheduled if `pg_cron` is available) and observable.

### 3.4 Hosting security baseline (Cloudflare Pages)

- Security headers must be present on static responses (`_headers`).
- SPA fallback must be present (`_redirects`) and deep-link safe.
- If Pages Functions are introduced later, equivalent headers must be set in function responses.

### 3.5 Processor governance (DSGVO)

- Cloudflare DPA/SCC and subprocessor posture must be reviewed and recorded for the chosen plan.
- Supabase processor documentation must be part of the release evidence set.
- Data transfer safeguards for non-EEA processing must be documented per Art. 44ff.

---

## 4. Mandatory Requirements (P0)

- [ ] [P0-1] Cloudflare production responses include security headers:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options` or CSP `frame-ancestors`
  - `Permissions-Policy`
  - `Strict-Transport-Security`

- [ ] [P0-2] `geocode` edge function has JWT verification enabled and reject-by-default browser CORS.

- [ ] [P0-3] `ALLOWED_ORIGINS` configured for production Cloudflare domain (+ localhost for dev only).

- [ ] [P0-4] Storage orphan cleanup is operational:
  - [x] migration applied
  - [ ] at least one successful run recorded in `storage_cleanup_runs`

- [ ] [P0-5] RLS/storage org-isolation tests pass for two users in different organizations.

- [ ] [P0-6] DPA/SCC/subprocessor review completed for Cloudflare and Supabase and linked in release notes.

### 4.1 P0 Status Matrix

| ID   | Requirement (short)                       | Implemented | Verified | Evidence target                      |
| ---- | ----------------------------------------- | ----------- | -------- | ------------------------------------ |
| P0-1 | Cloudflare security headers               | Yes         | No       | Curl/header output in release notes  |
| P0-2 | geocode JWT + fail-closed CORS            | Yes         | No       | Endpoint denial/allow test output    |
| P0-3 | ALLOWED_ORIGINS configured                | No          | No       | Screenshot/export of function secret |
| P0-4 | Storage orphan cleanup operational        | Yes         | No       | `storage_cleanup_runs` SQL output    |
| P0-5 | Cross-org RLS/storage isolation           | Yes         | No       | Test notes with actor/results        |
| P0-6 | Processor governance (DPA/SCC/subprocess) | No          | No       | Linked documents in release notes    |

### 4.2 Latest Verification Update

- 2026-03-17: Migration push for `20260318140000_share_set_token_sha256.sql` completed successfully.
- 2026-03-17: Migration push for `20260318143000_storage_cleanup_api_mode.sql` and `20260318144000_storage_cleanup_runner_api_only.sql` completed successfully.
- 2026-03-17: Current `storage_cleanup_runs` evidence query returned `[]` (no run recorded yet).
- 2026-03-17: Current orphan backlog is `47` objects in bucket `images`.
- Remaining for full P0-4 verification: execute `node scripts/cleanup-storage-orphans.mjs 1000` and store SQL evidence from `storage_cleanup_runs`.

---

## 5. Strongly Recommended (P1)

- [x] [P1-1] Share-token hashing upgraded from MD5 to SHA-256/HMAC for defense-in-depth.
- [ ] [P1-2] Privacy controls in UI map to enforced backend behavior (retention/telemetry are not display-only).
- [ ] [P1-3] Incident response checklist includes GDPR breach notification decision flow (Art. 33/34).

---

## 6. Recommended Hardening (P2)

- [ ] [P2-1] Monthly access review of admin/non-viewer memberships.
- [ ] [P2-2] Add periodic RLS regression tests in CI for critical tables.
- [ ] [P2-3] Add signed-link token leak checks in URL/referrer/log handling tests.

---

## 7. Acceptance Criteria

1. **Tenant isolation**

- Given users from org A and org B,
- when both execute equivalent reads/writes,
- then no cross-org row/object access is possible.

2. **Viewer write-block**

- Given a viewer account,
- when attempting image/project/metadata writes,
- then operations are denied by RLS/storage policy.

3. **Geocode endpoint hardening**

- Given an untrusted origin or missing JWT,
- when calling `geocode`,
- then response is denied (`403` for origin, auth failure for JWT).

4. **Storage deletion accountability**

- Given orphaned objects in `storage.objects` bucket `images`,
- when cleanup runs,
- then orphans are removed and run metadata is persisted (`status`, `deleted_count`, timestamps).

5. **Cloudflare header posture**

- Given production Cloudflare domain,
- when fetching response headers,
- then all mandatory headers from P0-1 are present.

6. **Processor documentation**

- Given release evidence bundle,
- when audited,
- then current DPA/SCC/subprocessor references for Cloudflare + Supabase are attached.

### 7.1 Deterministic Execution Steps

1. Run SQL verification script in production/staging DB:

- `scripts/validate-dsgvo-security.sql`

2. Run API-based orphan cleanup:

- `node scripts/cleanup-storage-orphans.mjs 1000`

3. Capture HTTP response headers from production domain.
4. Run geocode deny/allow checks:

- deny from unallowlisted origin
- deny without JWT
- allow with valid JWT from allowlisted origin

5. Execute org-isolation and viewer write-block tests with two users.
6. Attach Cloudflare and Supabase DPA/SCC/subprocessor links.
7. Update this spec's checklist and sign-off block.

---

## 8. Evidence Checklist (release sign-off)

- [ ] Curl/header output for production domain
- [ ] SQL output proving recent successful `storage_cleanup_runs`
- [ ] RLS/storage test notes (org isolation + viewer denial)
- [ ] Screenshot/config export for `ALLOWED_ORIGINS`
- [ ] Links/PDFs for Cloudflare and Supabase processor terms (DPA/SCC/subprocessors)
- [ ] Final approver + date

### 8.1 Sign-Off Block

- Environment: `production` / `staging`
- Checked by: `________________`
- Date (UTC): `________________`
- Decision: `GO` / `CONDITIONAL GO` / `NO-GO`
- Open P1 items with owners: `________________`

---

## 9. Go/No-Go Rule

- **GO:** all P0 items complete and all acceptance criteria pass.
- **CONDITIONAL GO:** all P0 complete, exactly one P1 open with owner/deadline.
- **NO-GO:** any open P0 item.
