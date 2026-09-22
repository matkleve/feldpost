---
id: STUDY-014
type: investigation
status: proposed
supersedes: none
corrected-by: none
---

# Org + Colleagues widget bundle — bundle-only install model

**Measured:** 2026-09-22, owner decision on [#258](https://github.com/matkleve/feldpost/issues/258).  
**Parent plan:** [STUDY-013](./013-widget-modularity-platform-change-plan.md)

**Owner decision `[D]`:** **Bundle-only** — Organization and Colleagues install **together**, not as separate catalog installs. Owner note: *“I think we would need both”* — meaning the product unit requires **both** capabilities, not that users may pick one.

---

## Question

How should the catalog, manifest, and DB represent a **two-widget bundle** that only installs as one action?

---

## Current coupling `[A]`

| Area | Evidence |
| --- | --- |
| Routes | `/colleagues` and `/organization` are separate authenticated routes [`authenticated-app.routes.ts`](../../apps/web/src/app/layout/authenticated-app.routes.ts) |
| Colleagues | Channels, DMs, invites — org-scoped [`features/colleagues/`](../../apps/web/src/app/features/colleagues/) |
| Organization | Roles, members, org settings [`features/organization/`](../../apps/web/src/app/features/organization/) |
| Nav | Both appear as separate nav items [`nav.component.ts`](../../apps/web/src/app/features/nav/nav.component.ts) |

Colleagues features assume `organization_id` scoping via RLS `[B]` — org structure is a logical prerequisite.

---

## Recommended model `[D]` (for owner confirmation)

### Catalog UX

| Element | Behavior |
| --- | --- |
| **One catalog card** | e.g. “Team” or “Organization & Colleagues” — single rectangle |
| **Detail page** | Lists **two constituent widgets** with roles: Organization (structure) + Colleagues (communication) |
| **Install CTA** | One button — installs **bundle id** `team` (name TBD) |
| **No separate install** | Organization-only or Colleagues-only cards **absent** from catalog (bundle-only) |

### Manifest (code)

```text
WidgetBundle "team"
├── widget: organization  (not independently installable)
├── widget: colleagues    (not independently installable)
└── install: atomic — both routes + services + DB flags enabled together
```

Each constituent still exists as a **manifest entry** (for left-rail icons, uninstall audit, RLS tags) but `installable: false` except via bundle `[D]`.

### Left rail after install `[D]`

| Option | Pros | Cons |
| --- | --- | --- |
| **A — Two icons** | Matches today’s mental model | More rail clutter |
| **B — One “Team” icon** | Cleaner rail | Hides Org vs Colleagues entry |
| **C — One icon + in-widget tabs** | Single rail slot | More navigation inside widget |

**Open:** owner preference (not decided 2026-09-22).

### Uninstall `[D]`

Bundle-only implies **atomic uninstall** of both — data retention must be specified in STUDY-016 / constitution review (delete means delete).

---

## Why “both” are needed `[B]`

1. Colleagues without Organization admin surfaces is incomplete for construction orgs (roles, invites).  
2. Organization without Colleagues is viable for admin-only orgs `[C]` — but owner rejected split install; bundle-only trades that flexibility for simpler UX.  
3. Shared DB tables (members, roles, channels) likely overlap — partial install risks RLS gaps `[B]`.

---

## Open sub-questions

| ID | Question |
| --- | --- |
| B1 | Bundle display name (Team / Organization & Colleagues / …)? |
| B2 | Left rail: one icon or two after install? |
| B3 | Uninstall: one action removes both — confirm data policy |

---

## Acceptance (study → spec)

- [ ] Owner confirms bundle-only catalog (no separate Org/Colleagues cards)
- [ ] Constituent manifest shape agreed
- [ ] Rail icon count decided (B2)
- [ ] Uninstall policy cross-reviewed with STUDY-016

**Blocks:** Widget platform spec § install model; phase 5 migration in [#258](https://github.com/matkleve/feldpost/issues/258).
