# Vercel Release Security Spec (Go-Live Contract)

**Purpose:** This spec defines mandatory controls before Feldpost is published on Vercel for real company users.

**Status policy:**

- `P0` must be complete for any public sharing.
- `P1` should be complete before team-wide use.
- `P2` is recommended hardening.

---

## 1. Scope

In scope:

- Angular frontend deployment on Vercel
- Supabase Auth, Postgres/RLS, Storage, Edge Functions
- Production domain and browser security posture

Out of scope:

- Mobile app/native wrappers
- Third-party integrations not currently in codebase

---

## 2. Non-Negotiable Security Requirements (P0)

- [ ] [P0-1] **Security headers enabled in production responses**
  - Minimum set: CSP, frame-ancestors (or X-Frame-Options), Referrer-Policy, X-Content-Type-Options, Permissions-Policy.
  - Verification: inspect headers on the deployed Vercel URL.

- [ ] [P0-2] **Supabase Auth redirect allow-list includes only approved production URLs**
  - Must include exact Vercel production domain and required auth callback/reset paths.
  - Must not include stale or wildcard domains beyond development needs.

- [ ] [P0-3] **RLS + Storage policy verification run completed and documented**
  - Confirm org isolation for read/write on core tables.
  - Confirm storage object access matches org/user path rules.

- [ ] [P0-4] **Incident owner and rollback path defined**
  - One named owner responsible for security incidents.
  - Rollback steps documented and tested once (redeploy previous known-good build).

- [ ] [P0-5] **Production error visibility enabled**
  - Frontend runtime errors and key Supabase auth/database/storage failures are observable.
  - Team can detect and triage failures on release day.

---

## 3. Strongly Recommended Before Broad Usage (P1)

- [ ] [P1-1] **Build-time environment strategy for production**
  - Production Supabase URL/anon key are injected from Vercel env config and not managed as hardcoded long-term values in app source.

- [ ] [P1-2] **Edge Function CORS restricted for production**
  - `geocode` allows only production app origin(s) and localhost dev origin.

- [ ] [P1-3] **Auth hardening review completed**
  - Email confirmation mode and password rules reviewed for company policy fit.
  - Reset-password redirect flow tested end-to-end on production URL.

- [ ] [P1-4] **Least-privilege role audit completed**
  - Confirm `admin`, `technician`, `viewer` assignments for all initial users.

---

## 4. Recommended Hardening (P2)

- [ ] [P2-1] Add lightweight periodic access review (monthly).
- [ ] [P2-2] Add explicit privacy notice for EXIF/location handling.
- [ ] [P2-3] Add security regression checks to release checklist (auth, RLS, signed URL expiry).

---

## 5. Acceptance Tests (must pass)

1. **Cross-org isolation test**

- Given two users in different orgs, each can only query and download own-org data.

2. **Viewer write-block test**

- Viewer cannot upload, edit, or delete images/projects/metadata.

3. **Signed URL expiration test**

- URL works before TTL expiry and fails after expiry.

4. **Auth reset flow test (production domain)**

- Reset email link returns user to `/auth/update-password` on production domain.

5. **Security header test**

- Production responses contain required headers with expected values.

---

## 6. Required Artifacts to store in repo/docs

- [ ] Header configuration snapshot (or file reference).
- [ ] RLS/storage policy verification notes.
- [ ] Incident owner + escalation contact section.
- [ ] Release-day sign-off record (date + approver).

---

## 7. Go/No-Go Rule

- **GO:** All P0 complete and acceptance tests pass.
- **CONDITIONAL GO:** P0 complete, one P1 open with explicit owner/deadline.
- **NO-GO:** Any open P0 item.
