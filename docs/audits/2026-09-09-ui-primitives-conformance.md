> **Audits:** Reference / investigation (**not normative**). Verify against current `docs/specs/` and `docs/design/` before acting. [How to read `docs/audits/`](README.md).

# UI primitives — what each one holds, and what it does not

**Date:** 2026-09-09
**Scope:** all 17 primitives under `apps/web/src/app/shared/ui/` (2,197 LOC).
**Companion to:** [`2026-09-08-design-system-adoption.md`](2026-09-08-design-system-adoption.md).
**Status:** the cleanup items landed on 2026-09-09 (P-1, P-4, P-5, P-6, P-11 — ✅ in § 5). The judgement calls did not.

## 1. What each primitive was checked against

Every criterion is a rule this repository already states somewhere. Nothing here
is imported taste.

| # | Criterion | Where the rule lives |
| --- | --- | --- |
| 1 | Five interaction states on interactive elements — default · hover · active · focus-visible · disabled | `docs/design/state-visuals.md`, and the state vocabulary in `docs/design/design-system/registry.json` |
| 2 | `focus-visible`, not `focus` | `state-visuals.md` § Focus-visible |
| 3 | Named transition properties, no `transition-all` | `docs/design/motion.md`; § M3 of the design audit |
| 4 | Motion tokens, not literals | `motion.md`, `.cursor/rules/token-usage-gate.mdc` |
| 5 | No inline `color-mix` for hover/selected — use the mixins/tokens | `state-visuals.md` § Mandatory implementation contract, enforced by `scripts/guard-interaction-emphasis.mjs` |
| 6 | No raw colours | `token-usage-gate.mdc` |
| 7 | Touch targets by surface: field 44/48px, dense chrome ≥24px + spacing | `docs/design/constitution.md` § Sizes & Touch (as amended 2026-09-08) |
| 8 | A dedicated element spec per production component | `AGENTS.md` § Component Spec Coverage |
| 9 | Nothing unused left in the tree | `AGENTS.md` § Change-Completeness Rule |

---

## 2. First: a defect in the reduced-motion rule I shipped yesterday — fixed

`_reduced-motion.scss` exempted continuous indicators with
`:not([class*="__spinner"])`. Going through the primitives is what surfaced the
problem: **three of the nine spinners in the app do not match that pattern** and
were being frozen mid-rotation —

- `hlm-spinner`, the shared primitive, which carries `animate-spin` and no BEM class at all
- `.upload-panel__thumbnail-spinner`
- `.invite-editor__qr-spinner`

The exemption depended on naming luck, which is not an exemption. It now matches
`spinner` anywhere in the class list plus `animate-spin`; all nine spinner
classes contain `spinner`, and nothing that is not a spinner does. Verified in
the built CSS.

---

## 3. The matrix

`✓` present · `·` absent · `n/a` not meaningful for this primitive.
Usage = occurrences in templates.

| Primitive | Uses | hover | active | focus-visible | disabled | Verdict |
| --- | ---: | :---: | :---: | :---: | :---: | --- |
| **button** | 197 | ✓ | ✓ | ✓ | ✓ | **complete** (since 2026-09-08) |
| **input** | 56 | n/a | n/a | ✓ | ✓ | **complete** |
| **label** | 49 | n/a | n/a | n/a | ✓ `peer-disabled` | **complete** |
| **menu** item | 36 | ✓ | ✓ | ✓ | ✓ | complete, but states live in an **unlayered** global SCSS |
| **switch** | 18 | · | ✓ checked | ✓ | ✓ | complete (press is not meaningful on a switch) |
| **toggle-group** item | 17 | ✓ | ✓ on/off | ✓ | ✓ | complete; `transition-all` ✅ fixed, 9 inline `color-mix` open |
| **form-field** | 15 | n/a | n/a | n/a | n/a | layout only — fine |
| **dialog** | 7 | n/a | n/a | n/a | n/a | ✅ scrim now `var(--scrim)`; `duration-200` stays — see § 4.7 |
| **tabs** trigger | 5 | ✓ | ✓ active | ✓ | ✓ | complete; `transition-all` ✅ fixed, 5 inline `color-mix` open |
| **badge** | 4 | · | · | ✅ fixed | · | ring now `focus-visible:`; **still has no other state** — see § 4.1 |
| **select** | 2 | · | · | ✅ fixed | ✓ | was `focus:` — ring stayed after a mouse click |
| **skeleton** | 2 | n/a | n/a | n/a | n/a | fine; settles correctly under reduced motion |
| **popover** | 1 | n/a | n/a | · `outline-none` | n/a | panel suppresses outline with no replacement |
| **spinner** | 1 | n/a | n/a | n/a | n/a | fine (after § 2) |
| **range** | — | n/a | n/a | n/a | n/a | progress-fill directive only |
| ~~**card**~~ | 0 | — | — | — | — | ✅ **deleted** 2026-09-09 — 8 files, no consumer |
| ~~**toast**~~ | 0 | — | — | — | — | ✅ **deleted** 2026-09-09 — 3 files, no consumer |

**The five-state contract is in better shape than the design audit implied.**
Of the seven genuinely interactive primitives, six carry all applicable states.
The gaps are concentrated in the two least-used ones.

---

## 4. Findings

### 4.1 `focus:` where it should be `focus-visible:` — badge and select ✅ fixed

`badgeVariants` and `selectVariants` both use `focus:ring-2`. The consequence is
the one `state-visuals.md` already warns about: **every mouse click leaves a ring
behind**, and the usual response is a request to remove focus rings entirely —
which breaks keyboard users. Both now use `focus-visible:`, including the
`error` variant's `focus:ring-destructive` on select.

`badge` is the odder of the two. It is a **static label** with no hover, no
active and no disabled — but it declares a focus ring, which means either it is
meant to be interactive (and is missing three states) or it is not (and the ring
is dead code). Both readings are defects; the spec has to say which. **Still open** — the fix
above corrected the pseudo-class, not the question.

### 4.2 The interaction-emphasis guard cannot see the primitives

`scripts/guard-interaction-emphasis.mjs` bans inline `color-mix` for hover and
selected states and points offenders at the `emphasis.*` mixins. Its file scan
is `entry.endsWith(".scss")` — **TypeScript is invisible to it**.

The primitive layer holds **23 inline `color-mix()` calls**, of which the guard's
own banned patterns match **7** (button 1, tabs 3, toggle-group 3). So the exact
construct that is CI-blocked in a component stylesheet is the standard idiom one
directory over, in the files that define the primitives everything else inherits.

That is not an argument for rewriting the primitives — a `cva` string cannot
`@include` a Sass mixin, so the TS layer needs its own answer (a shared exported
constant per emphasis level, which button, tabs and toggle-group already
approximate with `quietInteractionEmphasis` and `toggleOffEmphasis`). It is an
argument for the guard to **say so** rather than silently not looking.

### 4.3 `registry.json` and the primitives are disjoint sets

The machine-readable registry declares per-component `states` for nine entries:
`ui-container`, `segmented-switch`, `field-select-toggle-family`, `breadcrumbs`,
`dropdown-shell`, `settings-overlay-shell`, `popover-panel`, `table-primitive`,
`workspace-pane`.

**Not one of them is a `shared/ui/` primitive.** The registry describes
design-system compositions; the primitives are the layer underneath, and they
declare nothing. So § S5 of the design audit — "assert that declared states are
implemented" — currently has no primitive in its reach. S6 (grow the registry) is
the prerequisite, and the seven interactive primitives are the obvious first
entries, because the matrix above is exactly the data the registry wants.

### 4.4 Spec coverage: nine primitives have no dedicated spec

`AGENTS.md` § Component Spec Coverage: *"Every production component must have its
own dedicated element spec."* Present: button, badge/chips, popover, panel
trigger, container, toggle, tab, menu-panel parts, field controls. **Missing:
`dialog`, `form-field`, `input`, `label`, `select`, `skeleton`, `spinner`,
`toast`, `card`.** `input` at 56 usages and `label` at 49 are the ones worth
writing first — they carry validation and disabled semantics that nothing
documents.

### 4.5 `transition-all` in three primitives ✅ fixed

Already filed as § M3. Worth repeating here with the reason: `transition-all`
animates layout properties too, so a width or padding change anywhere in the
subtree becomes an animation nobody asked for. `button` gets it right with
`transition-colors`. tabs and toggle-group now name
`transition-[color,background-color,box-shadow]` — all three properties do change
with state, including the active tab's `shadow-sm` and the toggle item's
attention shadow. The third call site was toast, which no longer exists (§ 4.6).

### 4.6 Two dead primitives ✅ deleted

`shared/ui/card/` (7 files, 6 directives) and `shared/ui/toast/` (3 files) are
imported by **nothing** outside their own folders — not by a template, not by a
component, not even for their variant constants. `AGENTS.md` § Change-Completeness
is explicit that unused exports go. Toast in particular was misleading: there
*is* a working toast system (`shared/toast/`), so a reader found two and had to
work out which was real. Both folders are deleted — 11 files. They carry
`TODO(spartan-v4)` headers, so if they were staged for a migration that intent
belongs in `docs/migration/`, not in an unreferenced folder; git history holds
them either way.

**The grep-to-zero pass on the deletion found something worse than the dead
code.** `docs/specs/service/toast/toast-system.md` — a live contract — stated
that the toast chrome *is* "Spartan `hlmToast` + `toastVariants` CVA", and the
acceptance criteria required "severity styling from `hlmToast` / `toastVariants`".
Neither was ever true: the real toast renders `.toast-surface` styled entirely in
`toast-item.component.scss`, with severity applied to `.toast-indicator` through
a host class bound from `item().type`. So the spec described wiring that did not
exist, and an implementer following it would have built the wrong thing. Both
files are corrected to describe what actually renders. This is the § 4.4
spec-coverage problem in its more expensive form: not a missing spec, but a
present one that is wrong.

References in `docs/migration/phase-*.md` are left as they are — those are dated
records of what was done at the time, and editing them to look consistent is the
one thing the diary and ADR conventions both forbid.

### 4.7 Smaller items

- **`dialog`: `bg-black/80`** was the only raw colour in the entire primitive
  layer. ✅ Now `bg-[var(--scrim)]`, with `--scrim: rgb(0 0 0 / 80%)` defined in
  light and dark — the same computed value, so nothing moved visually; sandstone
  can now warm it without touching the primitive.
- **`dialog`: `duration-200`** — **left alone deliberately.** The motion scale is
  100 / 150 / 250 / 300 ms; there is no 200 ms step, so "use the token" would
  retime the overlay fade by 50 ms. That is a scale question for the owner, not a
  cleanup.
- **`popover`: `outline-none`** on a panel with no focus replacement — the § X2
  pattern, in a primitive.
- **`toggle-group`: `motion-reduce:` utilities** ✅ removed — the global rule
  from § M1 owns reduced motion, and three copies of it in one file is the
  duplicate ownership the design system forbids.
- **Menu row states are deliberately unlayered** ("so icon + label hover beat
  Tailwind utilities on the host"). Justified and documented — but it is exactly
  the escape hatch that `token-usage-gate.mdc` § 6 says goes stale. It needs a
  stated condition for removal, not just a reason for existing.
- **Touch targets:** every primitive clears the amended constitution. `icon-xs`
  (24px) and the toggle-group `icon` (28px) are dense-chrome sizes at or just
  above the AA floor, where the spacing condition applies.

---

## 5. Priority

| # | Change | Prio | Effort | Why |
| --- | --- | :---: | :---: | --- |
| ✅ P-1 | `focus:` → `focus-visible:` in badge and select | **P0** | S | done 2026-09-09 |
| P-2 | Decide whether `badge` is interactive; give it the states or drop the ring | **P0** | S | both current readings are defects |
| P-3 | Make `guard-interaction-emphasis.mjs` scan `.ts` | **P1** | M | 7 banned-pattern hits are invisible to their own guard |
| ✅ P-4 | `transition-all` → named properties | **P1** | S | done 2026-09-09; zero left in the layer |
| ✅ P-5 | Delete `shared/ui/card` and `shared/ui/toast` | **P1** | S | done 2026-09-09; 11 files |
| ✅ P-6 | Scrim token for `bg-black/80` | **P1** | S | done; `duration-200` left — no 200 ms token exists |
| P-7 | Specs for `input` and `label` first, then the other seven | **P1** | M | 105 usages between them, no contract |
| P-8 | Add the seven interactive primitives to `registry.json` with their states | **P2** | M | prerequisite for asserting states (§ S5) |
| P-9 | Focus replacement on the popover panel | **P2** | S | one primitive |
| P-10 | Removal condition for the unlayered menu-row hatch | **P2** | S | prevents the 2026-07-01 recurrence |
| ✅ P-11 | Drop the redundant `motion-reduce:` utilities | **P3** | S | done 2026-09-09 |

---

## 6. How this was measured

```bash
# state markers per primitive, across every .ts in each folder
rg -c 'hover:|active:|focus-visible:|disabled:' apps/web/src/app/shared/ui/*/*.ts
# usage counts
rg -o 'hlmBtn' apps/web/src/app --glob '*.html' | wc -l          # 197
# inline color-mix in the primitive layer
rg -o 'color-mix\(' apps/web/src/app/shared/ui --glob '*.ts' | wc -l   # 23
# the guard's file filter
grep -n 'endsWith(".scss")' scripts/guard-interaction-emphasis.mjs
# dead primitives
rg -l 'hlmCard|hlmToast|card-variants|toast-variants' apps/web/src/app | grep -v shared/ui/
```
