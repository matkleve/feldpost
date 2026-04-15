# Prompt: Role-Permissions Audit Agent

Use this prompt with the Explore or reviewer-style subagent.

## Quick Start

- Preferred first pass: `Explore` (thorough)
- Verification pass: `reviewer`
- Spec conformance pass: `checker`

---

You are auditing role-based permissions for Feldpost.

Goal:

1. Enumerate every user action in the app that reads, creates, updates, or deletes data.
2. Map each action to database tables and storage operations.
3. Map each action to currently effective role permissions (`admin`, `user`, `viewer`) based on migrations and live policies.
4. Produce a single role-permission file that can be used to drive RLS migration updates.

Scope:

- Frontend code in `apps/web/src/app/**`
- Supabase migrations in `supabase/migrations/**`
- Security docs in `docs/security-boundaries.md`, `docs/user-lifecycle.md`, `docs/architecture/database-schema.md`

Output requirements:

- Create/update `docs/playbooks/security/role-permissions.md`.
- Include a complete matrix of actions vs roles.
- For every matrix row, cite source files/lines for both:
  - UI action implementation location
  - Effective RLS/storage policy location
- Add a section "Policy Gaps" with concrete mismatches between expected product behavior and current RLS behavior.
- Add a section "Required Migrations" with exact SQL changes needed.
- Add a section "Validation Plan" with SQL test cases by role.

Hard constraints:

- Do not assume frontend checks are security.
- Treat PostgreSQL RLS and storage policies as authority.
- If an action cannot be mapped, mark it as `UNKNOWN` and list required investigation.
- Prefer explicit least-privilege recommendations suitable for production.

Specific checks to run:

- Verify whether non-admin `user` can edit/delete any image in org.
- Verify metadata write boundaries (`metadata_keys`, `image_metadata`).
- Verify project update/delete boundaries for non-admin.
- Verify role assignment boundaries (`user_roles`).
- Verify storage upload/delete constraints in `storage.objects` policies.

Return format:

1. Executive summary (max 10 bullets)
2. Full action matrix
3. Policy gaps (severity-tagged)
4. Migration plan (ordered)
5. Validation SQL snippets

---

Optional follow-up:

- Generate first-pass migration files for the approved target model after review.

---

## Invocation Prompt (Explore)

Use the full prompt above with this header:

"Perform a thorough codebase-wide role and permission audit for Feldpost. Read frontend actions, SQL migrations, and security docs. Update docs/playbooks/security/role-permissions.md with current effective permissions, policy gaps, and migration recommendations."

## Invocation Prompt (reviewer)

Use this focused prompt:

"Review docs/playbooks/security/role-permissions.md against the actual code and migrations. Flag mismatches by severity, include exact file citations, and propose minimal SQL policy changes to enforce least privilege before production."

## Invocation Prompt (checker)

Use this focused prompt:

"Check whether the permissions model in docs/playbooks/security/role-permissions.md is consistent with element specs and security-boundaries docs. Report contract violations and missing acceptance checks, without writing implementation code."
