> **Audits:** Reference / investigation (**not normative**). Verify against current `docs/specs/` and `docs/design/` before acting. [How to read `docs/audits/`](README.md).

# Engagement summary — found, fixed, left alone

**Date:** 2026-09-08 → 2026-09-10
**Purpose:** one place that says, plainly, what this multi-day pass actually did to Feldpost — across process, design system, UI primitives, and the test suite — and what it deliberately did not touch. Everything below is traceable to a specific commit; nothing here is asserted from memory.

**Not covered here:** a second, parallel agent session ran a 16-phase audit of the upload pipeline over the same period (`docs/audits/upload-process-analysis-2026-09-08/`) and landed its own fixes — storage-leak on cancel, silent-failure guards, mojibake re-encoding, dead-code deletion. That work is real, merged, and unrelated to this one (zero file overlap, confirmed at merge time). It has its own findings doc; this summary only notes where it intersects with what's below.

---

## 1. Why this happened

The starting question was simple: *is Feldpost's process — specs, gates, design system — as solid as the product itself?* The answer, pass after pass, was the same shape: **the rules were already written down correctly. Almost nothing enforced them.** A script existed and was never called. A comment described a value that had since changed. A test asserted an API that no longer existed. Four different audits, four different layers of the stack, the same root cause each time.

---

## 2. Process & gates — [full detail](2026-09-08-grundriss-adoption.md)

**Comparison target:** the `grundriss` base-project template, on the premise that its whole value is process discipline, not product code.

**Found:** Feldpost had 5 separate npm scripts an agent had to remember to run per change class instead of one gate; 5 CI workflows with path filters so specific that editing the very files a guard protects could skip the guard; 109 broken relative links in the docs (`CONTRIBUTING.md` sent every contributor to a folder that had been renamed); a `.claude/settings.json` hook that used a schema that doesn't exist — the ESLint config it claimed to protect was never protected, silently, since it was written.

**Fixed (Wave 1, landed):**
- `npm run verify` — one gate, runs everything, keeps going after a failure, prints one summary
- `.github/workflows/verify.yml` — the same command, on every push, no path filter
- `scripts/check-doc-links.mjs` — new gate; the 109 broken links are repaired
- `.claude/hooks/protect-paths.mjs` — a working `PreToolUse` hook (tested: allow / block / malformed-input cases)
- Deleted two committed build-log files that had been sitting in the repo since a past session

**Left alone, on purpose:** 26 more proposals (P1–P3 in that doc) — a machine-readable component registry, one skills source instead of duplicated `.github/`/`.cursor/` copies, a reviewer subagent for Sensitive-class changes, use-case IDs. None blocks anything; they're queued by priority.

---

## 3. Design system — [full detail](2026-09-08-design-system-adoption.md)

**Found:** the destructive button failed WCAG AA in **all three themes** — 3.61:1 against a required 4.5:1. The audit script that should have caught it (`audit-theme-contrast.mjs`) was reading a **hand-copied hex palette** commented "hex values from styles.scss" that had silently drifted from the real tokens; it reported 1 failure where there were 6. Separately: 3 of 6 button variants had `hover:` states and no `active:` — the primary action gave no press feedback while a quiet toolbar icon did. `prefers-reduced-motion` was handled ad hoc in 7 files and ignored everywhere else.

**Fixed (Wave 1, landed):**
- `--destructive` darkened (`oklch 0.6368 → 0.5700`) — clears AA at 4.73:1, all three themes
- The contrast script now **parses `styles.scss` directly** instead of a copy, and fails loudly on any token it can't resolve rather than skipping it silently
- Pressed states added to the three variants that lacked them
- One global `_reduced-motion.scss`, emitted last in the cascade
- `state-visuals.md`'s disabled-opacity contract corrected to match what the code actually ships (it cited a deleted file)

**A correction made along the way:** an early version of this pass flagged Feldpost's smaller touch targets (24px in dense desktop chrome) as an accessibility violation. It wasn't — WCAG 2.2's actual AA requirement is 24×24px with a spacing condition; 44/48px is AAA plus platform guidance, not a hard floor. The real defect was the *constitution* stating 44/48px as non-negotiable everywhere when the product never did that. Fixed by scoping the rule to the surface it's actually meant for (field vs. dense desktop chrome) — see `docs/design/constitution.md`'s 2026-09-08 amendment.

**Left alone, on purpose:** the sandstone theme's primary button and the dark theme's primary button both fail AA too (2.26:1 and 3.62:1) — these are brand-colour decisions, not typos, so they're recorded in a `BASELINE` ratchet in the script rather than silently "fixed" by darkening the brand gold.

---

## 4. UI primitives — [full detail](2026-09-09-ui-primitives-conformance.md)

**Found, by reading all 17 `shared/ui/` primitives against the same rules used above:** two entire primitives (`card/`, `toast/` — 11 files) were dead code, imported by nothing; `badge` and `select` used `focus:` instead of `focus-visible:`, leaving a ring after every mouse click; `transition-all` sat in two primitives that should name their properties; the dialog scrim was the one remaining raw colour (`bg-black/80`) in the whole layer.

**Fixed, same day:**
- Deleted the 11 dead files
- `focus-visible:` in both primitives
- Named transitions instead of `transition-all`
- `--scrim` token, identical computed value, so sandstone can warm it later without touching the primitive
- **A bug in my own prior fix, caught by this pass:** the global reduced-motion rule from §3 was matching `[class*="__spinner"]`, which froze three of the app's nine spinners mid-rotation — including the shared `hlm-spinner` primitive, which has no BEM class at all. Fixed to match `spinner` anywhere in the class list.
- **A live spec found to be simply wrong:** deleting `shared/ui/toast/` triggered the grep-to-zero check required for any deletion, which turned up `docs/specs/service/toast/toast-system.md` claiming the toast chrome *is* "Spartan `hlmToast` + `toastVariants` CVA" — it never was; the real component renders its own SCSS. Corrected in the same change.

**Left alone, on purpose:** whether `badge` should be interactive at all (it has a focus ring and no other state — that's a design question, not a typing question); a guard script that only scans `.scss` and can't see the same violations sitting in `.ts` files; specs for 9 of the 17 primitives that don't have one yet.

---

## 5. The test suite — [migration plan](2026-09-10-map-shell-test-migration-plan.md)

**Found:** `npm test` hadn't compiled in weeks. 90 TypeScript errors across 14 files. **Nobody could tell whether any test still passed**, because the bundle never got that far. Made worse by a separate, structural problem: **GitHub Actions does not execute on this repository at all** — every workflow dies 4–8 seconds after starting, before its first real step, which is an account-level condition (billing/settings), not a code problem. That's out of reach from inside the repo; documented and flagged for whoever holds that access.

**Fixed:** 28 of the 90 errors — every one that was mechanical: wrong relative import depth, a missing object key, a mock shape that didn't match a type that had changed, a signal typed as the type of its own accessor method by mistake. One of the fixes (`upload-cancel-residue.util.ts`) was in fresh code from the parallel upload-audit session — its test mock couldn't satisfy an unnecessarily wide parameter type, narrowed to what the function actually calls.

**Left alone, on purpose:** the remaining 62 errors are one architectural drift, not 62 separate bugs — `MapShellComponent` used to hold GPS/placement/panel state directly and now delegates to 5 injected services, and its 4 spec files were never updated. The full old→new mapping is written up (§ 5 above); rewriting it means deciding *how* to mock geolocation across ~62 call sites in one shared setup file that all four suites depend on — a design decision, not a typo fix, and exactly the kind of stateful-UI change `AGENTS.md` calls Sensitive-class.

---

## 6. One thread through all four

The pattern repeats at every layer: **a check that reads a copy of the thing it's checking is not a check.** The contrast script copied the palette. The constitution copied a number nobody re-verified against the code. The toast spec copied an architecture that had already changed. The reduced-motion rule copied a naming convention from two examples instead of searching for all of them. Four different bugs, same shape — and in every case, the fix was to make the check read the *real* thing (the live tokens, the live component tree, the live spec target) instead of a description of it.

---

## 7. What's still open, ranked by what would help most

| # | What | Why it matters | Where |
| --- | --- | --- | --- |
| 1 | Rewrite the 4 map-shell test files | `npm test` is currently non-functional; nothing here is verified by CI | § 5, full plan linked |
| 2 | Get GitHub Actions running again | Every gate above only runs locally right now; there is no safety net | needs account/billing access, outside this repo |
| 3 | Work down the 201 spec-lint errors and 151 lint errors | Both are soft-gated with a no-new-debt rule, but they're still real debt | `docs/specs/SPEC-SIZE-BACKLOG.md`, `npm run lint` |
| 4 | Decide the `badge` primitive's interactivity | Currently has a focus ring and nothing else — an unresolved question, not a bug | § 4 |
| 5 | The remaining Wave 2/3 items in all three earlier audits | Registry machine-readability, one skills source, primitive specs, etc. | linked docs, priority tables in each |

---

## 8. Verification

Every commit referenced above was pushed after a green `npm run verify` (the soft-gated debt counts — specs, lint, test — are unchanged or reduced by each commit, never increased) and a clean `node scripts/check-doc-links.mjs`. That claim is checkable: `git log --oneline e893490..5c26d9a`.
