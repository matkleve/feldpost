---
id: STUDY-016
type: investigation
status: proposed
supersedes: none
corrected-by: none
---

# Database modularization parity with widgets

**Measured:** 2026-09-22, owner direction on [#258](https://github.com/matkleve/feldpost/issues/258): *“Database should be as modular as the widgets maybe that needs work.”*  
**Security anchor:** RLS remains the boundary [`supabase/AGENTS.md`](../../supabase/AGENTS.md).

---

## Question

What DB architecture makes widget **install / uninstall / bundle** safe and as modular as the UI manifest layer?

---

## Current state `[A]`

| Property | Finding |
| --- | --- |
| Migrations | Monolithic linear chain under `supabase/migrations/` |
| RLS | Table-scoped policies; org membership via `organization_id` |
| Feature gating | Mostly **code + routes**, not DB install registry |
| Partial features | No `organization_widgets` (or equivalent) table observed in planning grep `[A]` |

**Gap:** UI may hide a widget while tables + RLS remain world-readable if policies are coarse `[B]`.

---

## Target properties `[D]`

1. **Install record** — which widgets (bundles) an org has enabled  
2. **Policy linkage** — RLS respects install state where appropriate  
3. **Migration ownership** — schema changes attributable to a widget/bundle  
4. **Atomic bundle install** — Org+Colleagues enable together ([STUDY-014](./014-org-colleagues-widget-bundle.md))  
5. **Uninstall clarity** — constitution-aligned data handling  

---

## Architecture options

### Option A — Enablement table only `[B]`

```text
organization_installed_widgets (organization_id, widget_id, installed_at, …)
```

- Core schema always migrated; widgets gated in app + optional RLS helpers  
- **Pros:** Lowest migration risk; matches current monolithic DB  
- **Cons:** “Modular” only at app layer — owner asked for DB parity `[D]`

### Option B — Widget-tagged RLS `[B]` (recommended direction)

- Keep single schema; add SQL helper e.g. `org_has_widget(org_id, 'team')` used in policies  
- Policies for colleagues tables require `org_has_widget(..., 'team')`  
- **Pros:** Security follows install state; no schema fork  
- **Cons:** Policy sweep across tables; test matrix grows  

### Option C — Per-widget migration folders + registry `[C]`

```text
supabase/widgets/team/migrations/
supabase/widgets/media/migrations/
```

- Orchestrator applies widget migrations on install  
- **Pros:** True schema modularity  
- **Cons:** Ordering, rollback, hosted Supabase apply story — high operational risk `[C]`

### Option D — Hybrid `[D]` (study recommendation for investigation)

| Layer | Approach |
| --- | --- |
| **Core** | Map, auth, media_items, organizations — always present |
| **Widget tables** | Created in core migrations but **nullable / unused** until install **OR** created on first install via controlled migration runner |
| **RLS** | Option B tagging on widget-owned tables |
| **Manifest** | Widget declares `dbTables[]`, `requiredWidgets[]`, `rlsPolicySet` |

---

## Work estimate (planning — not calendar) `[C]`

| Work stream | Scope |
| --- | --- |
| Inventory | Map tables → widget owner (team, media, projects, …) |
| Install registry | New table + RLS on registry itself |
| Policy refactor | Colleagues/org tables first (bundle pilot) |
| Validation | `validate-*-rls.sql` per widget set |
| Tooling | Install/uninstall idempotent SQL scripts |

**Owner note:** *“maybe that needs work”* — Option D is non-trivial; likely **multi-phase** after shell grid ([#257](https://github.com/matkleve/feldpost/issues/257)) `[D]`.

---

## Relationship to bundle-only team widget `[D]`

Install transaction:

```text
BEGIN;
  INSERT organization_installed_widgets (widget_id = 'team') …;
  -- enables both organization + colleagues manifest ids
COMMIT;
```

Uninstall must define: soft-disable vs drop data vs archive `[D]` — **constitution review required**.

---

## Open sub-questions

| ID | Question |
| --- | --- |
| D1 | Enablement table only (A) vs tagged RLS (B) vs migration folders (C)? |
| D2 | Are widget-owned tables pre-created for all orgs or on install? |
| D3 | Uninstall data policy per widget class? |
| D4 | Who can install at DB level — match app admin role? |

---

## Acceptance (study → spec)

- [ ] Owner picks A/B/C/D direction (recommend starting **B + install registry**, defer **C**)
- [ ] Table→widget inventory complete for team bundle pilot
- [ ] Uninstall policy written with constitution cite
- [ ] RLS validation plan for widget gating

**Blocks:** Widget platform phase 2 ([#258](https://github.com/matkleve/feldpost/issues/258)); Sensitive-class security review.
