# Organization Administration — Audit & Gap-Closing Plan

**Who this is for:** engineers and product owners planning org-level admin, member/role
management, and sharing controls.
**What you'll get:** a verified current-state inventory (DB + RLS + UI), an evaluation
against standard SaaS administration areas, and a prioritized implementation plan.

See also: `role-permissions.md`, `user-lifecycle.md`, `security-boundaries.md`,
`element-specs/org-administration-section.md` (the new UI contract derived from this audit).

Status: audit complete (2026-06-12). Implementation not started.

---

## 1. Scope & Corrections to Prior Assumptions

This audit verified the repository state directly. Three assumptions from earlier
planning notes turned out to be wrong and are corrected here:

1. **There is no `settings-section-registry.ts` and no `isOrgAdmin` UI gating.**
   The settings overlay section list is a hardcoded `computed` in
   `features/settings-overlay/settings-overlay.component.ts` (lines 69–127).
   No settings section is role-gated in the UI today — including Search Tuning.
   All gating happens at the database (RLS) level only.
2. **`features/groups/` is NOT a placeholder for org teams.** It is the placeholder
   for personal *image* groups (`saved_groups`, per-user collections — see
   `element-specs/groups-page.md`, planned for M-UI7). Org/team management has no
   reserved feature folder yet; this plan introduces it under the settings overlay
   instead (see §5), because every other org-scoped control already lives there.
3. **There are no anonymous share links.** `resolve_share_set()` requires an
   authenticated session in the same organization (`public.user_org_id()` check in
   `supabase/migrations/20260318090000_share_sets.sql`). Share-set tokens are
   org-internal deep links, not public links.

## 2. Verified Current State

### 2.1 Database

| Table | Purpose | Admin-relevant RLS |
| --- | --- | --- |
| `organizations` | Org identity — `name` only, no branding/settings/updated_at | Read own org only; **no update policy at all** |
| `profiles` | 1:1 with `auth.users`, carries `organization_id` | **Self-read only** (or admin); self-update |
| `roles` | 5 seeded roles: `admin`, `clerk`, `user`, `worker`, `viewer` | Read: authenticated |
| `user_roles` | M:N user↔role | Read: self or admin; **insert/delete: admin only** (UI missing) |
| `projects` | Org-scoped | Update org-wide for non-viewers (relaxed); delete owner-or-admin |
| `qr_invites` | Invite links/QR, `target_role ∈ {clerk, worker}`, status lifecycle, hashed token, 7-day expiry | Create: admin/clerk/worker via `can_create_qr_invites()`; update: creator or admin |
| `invite_share_events` | Append-only log of invite share channel (copy-link/email/whatsapp/qr-scan) | Org read; actor insert |
| `share_sets` + `share_set_items` | Stable shareable image selections (workspace export), hashed token, `revoked_at` soft revoke, fingerprint reuse | Org read (active only); revoke/delete: creator or admin |
| `coordinate_corrections` | Append-only audit of marker moves | Org read; non-viewer insert; no update/delete |
| `saved_groups` | Personal image groups — **not** teams | Owner-only everything |

Helper functions: `user_org_id()`, `is_admin()`, `is_viewer()`
(`supabase/migrations/20260303000004_functions_and_triggers.sql:5–45`).

RPCs: `create_or_reuse_share_set()`, `resolve_share_set()`
(`20260318090000_share_sets.sql:114–252`).

### 2.2 Frontend

| Area | State |
| --- | --- |
| Role exposure | `UserProfileService.getOwnProfile()` returns `roles: string[]`; no cached signal, **no `isAdmin` computed anywhere** |
| Settings overlay | 8 hardcoded sections (general, appearance, notifications, map, search, data, account, invite-management); none role-gated |
| Invite management UI | Create draft (worker/clerk), QR render, copy/email/WhatsApp share, regenerate, revoke — but only the invite created in the current session; **no invite history list** |
| Share-set UI | Create/copy link in `workspace-export-bar.component.ts`; resolve via `?share=` param; **no list/revoke UI anywhere** |
| Member management UI | **None.** Role assignment happens via SQL migrations (e.g. `20260318152000_promote_kleveta_admin.sql` hardcodes an email) |
| Org settings UI | **None** (account page edits the personal profile only) |
| Audit log UI | **None** (and no general audit table to read from) |

## 3. Evaluation Against Standard SaaS Areas

| # | Standard area | Status | Gap summary |
| --- | --- | --- | --- |
| A | Org settings (name, branding, defaults) | 🔴 Missing | DB has only `name` with no update policy; no UI |
| B | Member/team management (list, change role, remove) | 🔴 Missing | RLS for role writes exists (admin), but profiles are self-read-only so an admin cannot even *list* members; no removal path (needs service-role/edge function for `auth.users` delete) |
| C | Role-based UI surface | 🔴 Missing | No frontend role signal; viewers see write affordances that RLS then rejects; admin-only sections impossible today |
| D | Sharing controls (view/revoke active share sets) | 🟡 Partial | DB fully supports list + soft revoke (creator/admin RLS); zero UI |
| E | Invites | 🟡 Partial | Solid create/share/revoke flow + share-event logging, but session-local only: no history, no admin oversight of others' invites, no `user`/`viewer`/`admin` target roles |
| F | Audit/activity log | 🔴 Missing | Only `coordinate_corrections` and `invite_share_events` exist; no membership/role/sharing/org-settings audit, no UI |
| G | Project-level vs org-wide access | 🟡 Partial | All access is org-wide; no per-project membership. Relaxed policies (org-wide update/delete on images/projects for any non-viewer) are documented in `role-permissions.md` as a pre-launch decision |

## 4. Prioritized Gap-Closing Plan

Ordering rationale: C unblocks everything (no admin UI can ship without a frontend
role signal); B is the most painful operational gap (role changes require migrations
today); D is high-value/low-cost (DB already done); A, E-extensions, F, G follow.

### P0 — Role signal + admin gating foundation (prereq, small)

- Add `OrgRoleService` (`core/org-role.service.ts`): loads own roles once per session,
  exposes `roles: Signal<string[]>`, `isAdmin: Signal<boolean>`, `isViewer: Signal<boolean>`.
- Extend the settings overlay section model with `adminOnly?: boolean` and filter
  `sectionList` through `OrgRoleService.isAdmin()`. This is UX-gating only; RLS remains
  the security boundary (frontend stays untrusted).
- Optionally hide write affordances from viewers using the same signal (separate, incremental).

### P1 — Member management (closes B, the operational blocker)

- **Migration:** `list_org_members()` security-definer RPC returning
  `{ user_id, full_name, email, roles[], created_at }` for the caller's org, admin-only
  (preferred over widening `profiles` RLS, which would leak member emails to all members).
- **Migration:** `set_user_role(user_id, role_name)` RPC — admin-only, same-org check,
  refuses to remove the last admin, writes an audit row (see P4 — ship the `audit_events`
  table with this migration so role changes are logged from day one).
- **Edge function:** `remove-member` — service-role deletion from `auth.users`
  (cascades per `user-lifecycle.md` §5); admin-only, refuses self-removal and last-admin removal.
- **UI:** "Members" settings section (admin-only) — list, role dropdown, remove with
  confirm dialog. Contract: `element-specs/org-administration-section.md`.

### P2 — Sharing controls (closes D; DB already complete)

- **UI only:** "Sharing" settings section (admin-only) listing active share sets
  (`token_prefix`, creator, item count, created/expires) with per-row revoke
  (`update share_sets set revoked_at = now()` — existing RLS already permits creator/admin).
- Include revoked/expired rows behind a toggle. Requires a small RLS addition:
  current `org read active` policy hides revoked rows, so add an admin-read-all policy.

### P3 — Invite completeness (closes E)

- **UI:** invite history list inside the existing Invite Management section: all org
  invites (org-read RLS already allows this) with status, target role, creator,
  expiry, and revoke action for active ones.
- **Decision needed:** whether `user` and `viewer` become valid `target_role` values
  (one-line check-constraint migration). `admin` should stay excluded from invites
  (admin promotion only via Members UI, which is audited).
- Surface `invite_share_events` per invite (channel + time) in an expandable row.

### P4 — Audit log (closes F)

- **Migration:** `audit_events` table — `id, organization_id, actor_user_id, action,
  target_type, target_id, detail jsonb, created_at`; append-only (no update/delete
  policies), org-scoped admin read. Writes happen inside the P1/P2/P3 RPCs and
  triggers, never from the client.
- Seed actions: `role.assigned`, `role.revoked`, `member.removed`, `invite.created`,
  `invite.revoked`, `share_set.created`, `share_set.revoked`, `org.renamed`.
- **UI:** "Activity" settings section (admin-only), reverse-chronological, filter by action type.

### P5 — Org settings (closes A)

- **Migration:** add `organizations: admin update` RLS policy (+ `updated_at` column);
  defer branding/logo until a concrete need exists (storage bucket + render surface).
- **UI:** "Organization" settings section (admin-only): rename org; show org id and
  member count. Future home for defaults (e.g. default invite expiry, default map layer org-wide).

### P6 — Project-level access (G — decision, not a quick fix)

- Resolve the `role-permissions.md` "Production Decision Required" first (tighten
  org-wide non-viewer writes to owner-or-admin, or accept current behavior).
- Per-project membership (a `project_members` table consulted by RLS) is a structural
  change touching every image/project policy. Recommendation: defer until a customer
  needs sub-org isolation; the role split (clerk/worker explicit policies) should land first.

## 5. Where the UI Lives

All new surfaces are **settings overlay sections** (not a separate admin dashboard
route): the overlay is already the home of org-scoped controls (invite management,
custom properties), it is reachable from everywhere, and sections are cheap to gate
once P0 lands. If the admin surface outgrows the overlay (audit log pagination,
member search), promote the sections to a routed `/admin` page later — the section
components are written to be host-agnostic so this is a re-mounting exercise.

`features/groups/` stays reserved for image groups (M-UI7) and is not used by this plan.

## 6. Acceptance Snapshot (when is this "done")

- [ ] An admin can see who is in the org, change any member's role, and remove a member — without SQL.
- [ ] A non-admin never sees admin sections; a viewer never sees write affordances that RLS would reject.
- [ ] An admin can list and revoke every active share link and every active invite in the org.
- [ ] Every role change, member removal, invite/share-set lifecycle event, and org rename is in `audit_events` and visible in the Activity section.
- [ ] The org can be renamed from the UI.
- [ ] The last admin cannot be demoted or removed (enforced in DB, not just UI).
