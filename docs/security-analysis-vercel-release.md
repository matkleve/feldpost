# Security Analysis for Public Vercel Release

**Project:** Feldpost (sitesnap)
**Date:** 2026-03-16
**Scope:** Angular web app (`apps/web`), Supabase (Auth, Postgres + RLS, Storage), Edge Function `geocode`
**Goal:** Decide whether the app can be shared with non-dev company users (brother + father) on a public Vercel URL.

---

## 1. Executive Summary

Current security posture is **good for an internal pilot**, because the most important boundary is in place:

- Authentication + Authorization are enforced server-side via Supabase and Postgres RLS.
- Storage bucket is private and signed URLs are used.
- Organization scoping is consistently implemented (`user_org_id()`).

However, before public release, there are **high-priority operational hardening gaps**:

- Missing explicit production security header setup (CSP, frame-ancestors, etc.) at hosting layer.
- Missing documented incident/monitoring baseline for fast detection + response.
- Frontend env values are hardcoded in source instead of Vercel-managed environment strategy.

**Recommendation:**

- Proceed with a staged rollout only after all `P0` items in the release spec are completed.

---

## 2. Verified Strengths (already implemented)

1. RLS as true security boundary

- All core tables have RLS enabled and org checks are implemented.
- Evidence: `supabase/migrations/20260303000005_rls.sql`.

2. Storage is private + policy-scoped by org/user path

- Bucket `images` is private (`public = false`).
- Upload/read/delete policies enforce org and ownership/admin constraints.
- Evidence: `supabase/migrations/20260304000001_storage_images.sql`.

3. Upload hardening already exists

- Function `search_path` hardening and policy optimization migration applied.
- Evidence: `supabase/migrations/20260316204500_upload_security_perf_hardening.sql`.

4. Auth flow separation is sound

- Browser uses Supabase anon client only; no service-role usage in frontend.
- Evidence: `apps/web/src/app/core/supabase.service.ts`.

5. Geocoding proxy exists (no direct browser->Nominatim)

- Server-side rate limiting and timeout in edge function.
- Evidence: `supabase/functions/geocode/index.ts`.

---

## 3. Risk Register (pre-release)

## P0 (must fix before public URL sharing)

### R-01: Missing explicit production security headers

- Severity: **High**
- Impact: Increased XSS/clickjacking/data exfiltration risk if a dependency or rendering bug appears.
- Current state: No repository-level Vercel header policy (`vercel.json` not present).
- Required controls:
  - `Content-Security-Policy` (start strict, then relax only where needed)
  - `X-Frame-Options` or `frame-ancestors` in CSP
  - `Referrer-Policy`
  - `X-Content-Type-Options: nosniff`
  - `Permissions-Policy`

### R-02: Missing production observability/incident baseline

- Severity: **High**
- Impact: Security events may go undetected; slower containment.
- Current state: No explicit monitoring/on-call/incident doc for prod release in this repo.
- Required controls:
  - Error and auth anomaly monitoring (at minimum Supabase logs + frontend error capture)
  - Named incident owner and response steps
  - Contact/rollback playbook

## P1 (fix immediately after P0, ideally before first external users)

### R-03: Hardcoded frontend environment values

- Severity: **Medium**
- Impact: Operational friction and accidental cross-environment usage; difficult key rotation discipline.
- Current state:
  - `apps/web/src/environments/environment.ts`
  - `apps/web/src/environments/environment.development.ts`
    include concrete Supabase URL + anon key.
- Notes:
  - Supabase anon key is not a secret in the same sense as service-role, but hardcoding still weakens operational hygiene.
- Required controls:
  - Build-time env injection for production in Vercel
  - Separate dev/staging/prod projects or at least keys
  - Key rotation procedure documented

### R-04: Edge function CORS currently allows `*`

- Severity: **Medium**
- Impact: Broader than necessary cross-origin callable surface.
- Evidence: `supabase/functions/geocode/index.ts` uses `Access-Control-Allow-Origin: *`.
- Required controls:
  - Restrict CORS origins to known app domains for production
  - Keep localhost for dev only

## P2 (recommended hardening)

### R-05: Client-side HTML swap in map marker rendering

- Severity: **Low-Medium** (currently mitigated by escaping)
- Context:
  - Marker HTML is inserted via `innerHTML` in map rendering path.
  - Evidence: `apps/web/src/app/features/map/map-shell/map-shell.component.ts` and `apps/web/src/app/core/map/marker-factory.ts`.
- Why not critical now:
  - URL attribute is escaped (`escapeHtmlAttribute`) and source is signed URL.
- Recommendation:
  - Keep strict CSP and avoid introducing untrusted HTML fields into marker builder.

---

## 4. Release Decision Gate

**Go for pilot:** only if all `P0` items are complete and validated.

**Go for wider company rollout:** all `P0` + `P1` complete.

**No-Go:** any unresolved P0 item.

---

## 5. Validation Evidence to collect

- Screenshot/export of active Supabase RLS policies for tables + storage.
- Proof of private bucket settings.
- Test records proving org isolation (user from org A cannot read org B).
- Security headers visible in production response (network tab or curl).
- Auth redirect allow-list matches production URL.
- Signed URL TTL validation (expired URL becomes unusable).

---

## 6. Suggested timeline (small-team realistic)

1. Day 1: Implement security headers + Vercel env strategy.
2. Day 2: Add monitoring + incident contacts + rollback checklist.
3. Day 3: Execute go-live checklist and run controlled pilot with 2-3 internal users.

---

## 7. Final assessment

The core architecture is built in the right way (RLS-first, private storage, signed URLs).
The remaining work is mostly **deployment hardening and operations readiness**, not a full security redesign.
