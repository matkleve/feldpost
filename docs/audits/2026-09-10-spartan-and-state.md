> **Audits:** Reference / investigation (**not normative**). Verify against current `docs/specs/` and `docs/design/` before acting. [How to read `docs/audits/`](README.md).

# Spartan dependency and state architecture — findings and proposals

**Date:** 2026-09-10
**Question asked:** what can we change about the Spartan situation, and how can we improve state?
**Status:** one fix landed (§ 2, the encapsulation leak). Everything else here is a proposal.

---

## 1. Spartan: the real footprint is much smaller than the 52 `TODO(spartan-v4)` comments suggest

**The comment on every local primitive says the same thing:** *"Replace this local hlm implementation with the published `@spartan-ng/ui-X-helm` package once spartan ships Tailwind v4-compatible helm releases."* It's on 52 files. It reads like the whole primitive layer is waiting on an alpha dependency.

**It isn't.** Cross-referencing the 52 files against actual `import ... from '@spartan-ng/...'` statements:

| | Count |
| --- | --- |
| Files carrying the `TODO(spartan-v4)` comment | 52 |
| Of those, files that actually import `@spartan-ng` | **2** |
| Files app-wide with a real `@spartan-ng/brain` import | **24** |

The real dependency, broken down by module:

| Module | Files | What it provides |
| --- | --- | --- |
| `@spartan-ng/brain/toggle-group` | 13 | roving-tabindex keyboard nav, ARIA `role="radiogroup"`/`radio` wiring, value cycling |
| `@spartan-ng/brain/dialog` | 8 | focus trap, `aria-modal`, overlay/backdrop, escape-to-close |
| `@spartan-ng/brain/tabs` | 2 | `role="tablist"`/`tab`/`tabpanel` wiring, arrow-key nav |
| `@spartan-ng/brain/popover` | 1 | anchor positioning, focus return on close |
| `@spartan-ng/brain/button` | 1 | (minimal — mostly type augmentation) |

Every one of the other 12 primitives (badge, form-field, input, label, menu, select, skeleton, spinner, switch, range — plus the two deleted ones, card and toast) is **100% local Tailwind + `cva` code with zero runtime dependency on Spartan.** The `TODO(spartan-v4)` comment on those 50 files describes a migration that was never actually started, because there's nothing to migrate — they only ever mirrored spartan's *file-naming convention* (`hlm-x.directive.ts`), not its code.

### What this changes about the risk picture

The earlier framework comparison in this engagement flagged "an alpha package (`@spartan-ng/brain@0.0.1-alpha.691`) as a runtime dependency" as a real risk. That's still true — but it's a risk in **5 behaviors** (focus trap, roving tabindex, ARIA wiring for dialog/toggle-group/tabs/popover), not in the whole design system. That's a much smaller, much more tractable surface.

---

## 2. Fixed now: the one state-encapsulation leak in 172 services

While mapping the map-shell test migration (previous doc), a broader check across every `@Injectable` service in the app for a specific footgun: **a class field declared `readonly X = signal(...)` without `.asReadonly()`.** `readonly` on a TypeScript class field only blocks *reassigning the property* — it does nothing to stop an external caller with a reference to the service from calling `.set()` or `.update()` on the signal itself. The correct, and near-universally followed, pattern in this codebase is: private mutable signal, public `.asReadonly()` alias, explicit setter methods.

**Checked:** 172 `@Injectable`-decorated service files.
**Found:** exactly **1** field breaking the pattern — `UploadShellUiService.uploadPanelPinned`.

That's a 99.4%-consistent convention already, with a single, exact outlier — and it wasn't hypothetical: it's the reason `map-shell.component.spec.ts:166` could write `fixture.componentInstance.uploadPanelPinned.set(true)` directly instead of going through `toggleUploadPanel()`/`openUploadPanel()` like every other consumer is supposed to.

**Fixed:** `uploadPanelPinned` renamed to `_uploadPanelPinned` and made `private`; the three internal mutation sites (`toggleUploadPanel`, `closeUploadPanel`, `openUploadPanel`) updated; the existing public `uploadPanelOpen = this._uploadPanelPinned.asReadonly()` alias is unchanged, so every other consumer in the app (which already only ever read `uploadPanelOpen`, never `uploadPanelPinned`) is unaffected. The one test that reached through the hole is already in the map-shell migration backlog — its mapping table entry has been corrected to point at the mutator methods instead.

Verified: `ng build` passes; no other file referenced the old public name.

---

## 3. Proposals (not started)

### Spartan

| # | Proposal | Why | Effort |
| --- | --- | --- | --- |
| S1 | Correct or remove the `TODO(spartan-v4)` comment on the 50 files that don't import spartan | The comment is actively misleading — it makes a near-zero-dependency file look coupled to an alpha package, and the next person "resolving" it would waste time hunting for a migration that isn't there | S — mechanical, one shared comment block |
| S2 | Pin the version exactly, drop the caret | `"^0.0.1-alpha.691"` — a caret range on a `0.0.x-alpha` version is close to meaningless under semver (any 0.0.1-alpha.N could match depending on the resolver), so a routine `npm install` could silently move the pin. `"0.0.1-alpha.691"` exact until Spartan reaches a stable release | S — one line in `package.json` |
| S3 | Evaluate vendoring the focus-trap and roving-tabindex behavior for `dialog` and `toggle-group` | These are well-documented, small (WAI-ARIA APG "Dialog (Modal)" and "Radio Group" patterns are ~50–100 lines each) and would remove the alpha dependency from the two heaviest consumers (8 + 13 = 21 of the 24 real dependent files) entirely. Not urgent — Spartan hasn't caused an incident — but worth a spike before the next major Angular upgrade forces a compatibility check anyway | M — a spike first, then a real implementation only if the spike looks good |
| S4 | Leave `tabs`/`popover`/`button` on Spartan | 4 files total, low risk, not worth vendoring | — (do nothing) |

### State

| # | Proposal | Why | Effort |
| --- | --- | --- | --- |
| T1 | Write the private-signal + `.asReadonly()` + explicit-setters pattern down as a rule | It's followed by 171 of 172 services already — it's not a new idea, it's an unwritten one. `.cursor/rules/ui-state-machine.mdc` covers *visual* FSM (typed enum, `data-state`, transition maps) but has nothing about *service-level* signal encapsulation. A few sentences in that file (or a new, small companion rule) turns tribal knowledge into something a reviewer — or a future agent — can check against | S |
| T2 | A lint rule (or a script like `check-doc-links.mjs`'s pattern) that flags `readonly \w+ = signal\(` without a matching `.asReadonly()` in an `@Injectable` class | Turns T1 from a written rule into an enforced one — same "make the rule executable" principle behind every other gate added this week. Given the pattern is followed 172/172 times *now* that the one exception is fixed, this rule would start green and just hold the line | M — needs a small custom ESLint rule or a standalone script; the 99.4% baseline makes false positives unlikely |
| T3 | Audit the other `MapShellComponent`-style "thin component + N injected state services" refactors for the same test-drift risk that caused the 62 map-shell errors | The root cause there wasn't bad state architecture — it was good state architecture with **no gate** to catch that the tests weren't updated when the refactor moved state out of the component. Worth checking whether any other heavily-refactored component (media detail, workspace pane) has specs quietly testing an API that moved | M — needs a scan across other `*.component.spec.ts` files for the same "property does not exist" shape, once the map-shell rewrite establishes the pattern for what the fix looks like |

None of T1–T3 is urgent on its own. Together they're the same lesson as the rest of this engagement: the good pattern already exists in the code: write it down, then make the absence of it a build failure instead of something a person has to notice.
