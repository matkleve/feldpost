> **Audits:** Reference / investigation (**not normative**). Verify against current `docs/specs/` and `docs/design/` before acting. [How to read `docs/audits/`](README.md).

# Grundriss → Feldpost — design system & interaction adoption

**Date:** 2026-09-08
**Companion to:** [`2026-09-08-grundriss-adoption.md`](2026-09-08-grundriss-adoption.md) (process layer)
**Status:** **Wave 1 landed** on 2026-09-08 (A3, A5, S1, S3, M1 — marked ✅ in § 6). The rest are proposals.
**Question:** past process, what is worth importing at the level a user actually feels — interaction states, motion, type, contrast?

---

## 1. TL;DR

Feldpost's design documentation is, in places, **better than Grundriss's**: the
three-tier attention budget (gold / blue / violet), the disabled recipe per host
type, the ownership triad, the interaction-emphasis CI guard. Nothing here
proposes replacing that.

What the measurements show is a different pattern from the process audit. There
the rules were unenforced. Here **the rules are enforced where they were
written, and the gaps sit where nobody wrote a rule at all** — the pressed
state, motion preferences, the type floor, and the moment a doc and its
implementation drifted apart.

Six things a user can feel today, all measured (§ 7):

| | |
| --- | --- |
| **The primary button has no pressed state.** | 3 of 6 `buttonVariants` (`default`, `secondary`, `link`) define `hover:` and no `active:`. Quiet, outline and destructive have all three. |
| **Hover on the primary button is an opacity shift.** | `hover:bg-primary/90`. On sandstone, `--primary` *is* the saturated gold — a 10 % alpha change on a saturated fill is close to invisible, and inverts on dark. |
| **The destructive button failed WCAG AA — in all three themes.** | `#fafafa` on `#ef4444` = **3.61:1**, needs 4.5:1. Fixed (✅ A3). Worse: the audit that should have found it was reading a **hand-copied hex palette** that had drifted from `styles.scss`, so it reported the failure in light only and passed dark and sandstone. Reading the real tokens turned 1 reported failure into **6 actual ones** — see A3/A5. |
| **No global `prefers-reduced-motion`.** | 7 component files and 2 global partials handle it ad hoc; 165 raw `ms` values elsewhere do not. |
| **The UI type floor is 12 px.** | `--font-size-2xs: 0.75rem` (12 px) and `--font-size-xs` ≈ 13.6 px carry chat, metadata, invite and upload copy — for a product whose constitution opens with *"sunlight, dirty gloves, one-handed use"*. |
| **The canonical disabled contract points at a deleted file.** | `state-visuals.md` cites `apps/web/src/styles/primitives/button.scss` and `opacity: 0.66`; that folder does not exist and the real primitive uses `disabled:opacity-50`. |

**24 changes** follow, with a priority table in § 6.

---

## 2. What is already strong — leave it alone

- **Keyboard reachability is good.** Of 346 elements carrying a click/keydown
  handler, **319 are real `<button>`s**; only 5 `<div>`s are click targets with
  no focus affordance, and all five read as overlay/backdrop handlers.
  `@angular-eslint/template/interactive-supports-focus` is already `error`.
- **`no-nested-interactive`** is a hand-written ESLint rule in
  `apps/web/eslint.config.mjs`. Grundriss has no equivalent.
- **The interaction-emphasis guard** (`guard-interaction-emphasis.mjs`) blocks
  inline `color-mix` for hover/selected and forces the mixins. That is exactly
  the "make the rule executable" move, already done.
- **The disabled recipe is host-aware** (native `disabled` vs `aria-disabled`
  vs compact trigger). Grundriss has one row in a table.
- **Motion tokens exist** — `--motion-duration-fast/standard/slow/entrance`,
  `--motion-ease-out`. The problem below is that they are bypassed, not absent.

---

## 3. The changes

### S · Interaction states

**S1 — Give `default`, `secondary` and `link` a pressed state. ✅ Landed.**
Every variant defines `hover:`; only `ghost`/`outline` (via
`quietInteractionEmphasis`) and `destructive` define `active:`. So the *primary*
action — the one people press most — has no press feedback, while a quiet
toolbar icon does. On a touch device that is the only feedback there is, because
hover does not exist. Follow the pattern already in the file: a deeper stop for
`active:`, not a transform.

**S2 — Stop expressing hover as opacity.**
`default: hover:bg-primary/90`, `secondary: hover:bg-secondary/80`. Grundriss
carries a `-deep` token per accent for exactly this reason: on a saturated color
a 10–20 % alpha shift is barely perceptible, and over a dark surface it moves
the fill the *wrong way* (toward the background). Feldpost feels this harder
than Grundriss would, because in the sandstone theme `--primary` is the brand
gold. Define `--primary-deep` / `--secondary-deep` (and their dark and sandstone
values) and use them, the way `--brand-gold` washes are already tokenised.

**S3 — Reconcile the disabled contract with the code. ✅ Landed.**
`docs/design/state-visuals.md` § Disabled is normative and says `opacity: 0.66`
"matches `.ui-button:disabled` in `apps/web/src/styles/primitives/button.scss`".
That folder does not exist, `.ui-button` appears nowhere in the tree, and the
real primitive's base row says `disabled:opacity-50`. One of the two numbers is
the contract, and a reader following the doc implemented the wrong one.

The doc now states what ships (`0.5`, linked to `button-variants.ts`) and the
dead reference is gone. **Which number is right stays open**, recorded in the
doc as an owner decision: `0.66` is the more legible of the two, and this
product's first constitutional sentence is about sunlight and gloves. Raising it
is a one-token change — a deliberate visual decision, not a cleanup, so it was
not made here.

**S4 — Write the five-state table down in one place.**
`state-visuals.md` covers disabled (thoroughly), hover/selected (thoroughly) and
focus-visible (as a "shared reminder"). **`active` is not covered at all.** Add
the canonical table — default · hover · active · focus-visible · disabled — with
one reference implementation named, and make "all five, or a documented
exception" the rule for new interactive elements. This is Grundriss's Boundary 4
and it is the single rule most often skipped in any design system.

**S5 — Make the declared states executable.**
`docs/design/design-system/registry.json` already carries
`"states": ["default","hover","active","focus-visible","disabled"]` per
component, and `validate-design-system-registry.mjs` already validates that the
*vocabulary* is legal. Nothing checks that the component **implements** what it
declares. Extend the validator: for each declared state, assert the matching
selector exists in that component's SCSS or its `cva` variant string. The data
is already there; only the assertion is missing.

**S6 — Grow `registry.json` past 9 components.**
It describes **9**. The prose catalog (`docs/specs/component/registry*.md`)
describes **75**, and `shared/` alone holds **82** `*.component.ts`. S5 is worth
little at 9. This is the same machine-readable-registry argument as § C1 of the
process audit, from the design side.

**S7 — Say what happens on touch.**
`hover:` styles stick after a tap on touch devices. The product is explicitly
built for one-handed outdoor use, so this is not a footnote here. Either wrap
hover-only affordances in `@media (hover: hover)` or state in the kernel that
hover and active carry the same treatment on coarse pointers.

### A · Accessibility

**A1 — Turn on eight more template rules. Measured cost: 19 findings.**
Running them across 118 templates: `role-has-required-aria` 7 ·
`button-has-type` 5 · `label-has-associated-control` 4 · `no-autofocus` 2 ·
`elements-content` 1. And **`valid-aria`, `mouse-events-have-key-events` and
`table-scope` are already clean — those three are free.** Nineteen fixes buys a
permanent floor.

**A2 — Promote `click-events-have-key-events` from `warn` to `error`.**
It is a keyboard-access rule sitting at warning level in a config that runs with
`--max-warnings 0` — so it already fails the build, but reads as optional.

**A3 — Fix the destructive button contrast. ✅ Landed.**
3.61:1 against a required 4.5:1 — and once the audit was reading real tokens
(A5), in **all three themes**, not just light. `--destructive` lightness went
`oklch(0.6368 …)` → `oklch(0.5700 …)`; hue and chroma unchanged; white ink now
clears at **4.73:1** everywhere.

*What the real palette then showed.* Five further failures the stale table had
been hiding, none of them mechanical:

| Theme | Pair | Ratio | Why it is not a cleanup |
| --- | --- | --- | --- |
| sandstone | primary button text | **2.26:1** | white on the brand gold — the gold *is* the brand, so the ink is the decision |
| dark | primary button text | 3.62:1 | white on `#3e8cc9`; needs a darker primary or a dark ink |
| sandstone | muted on card | 4.42:1 | 0.08 short; a small darkening of `--muted-foreground` clears it |

These three are recorded in a `BASELINE` ratchet in the script: a listed pair
that gets *worse* fails, a listed pair that starts *passing* also fails (telling
you to delete the entry), and anything unlisted fails on its first regression.
They are owner decisions about brand colour, not something to fix by guessing.

**A4 — Decide the border-vs-background warnings. All three themes.**
1.27:1 (light), 1.34:1 (dark), 1.22:1 (sandstone) — against the 3:1 that
WCAG 1.4.11 asks for a *control boundary*. If these borders are decorative
separators the warning is fine and should be silenced explicitly per pair; if
any of them is the only thing marking an input's edge, it is a failure. Right
now the audit cannot tell the difference because the pair list does not record
which is which. Grundriss's contrast script records a purpose string per pair
(`"the border of a control (WCAG 1.4.11)"`) for exactly this reason.

**A5 — Wire the contrast audit into the gate. ✅ Landed — and it needed more than one line.**
`scripts/audit-theme-contrast.mjs` exits 1 correctly and was simply never
called. But wiring it in as it stood would have gated on the wrong numbers: its
palettes were a **hand-maintained hex table**, commented "hex values from
styles.scss", that had drifted from the product. It claimed dark `--destructive`
was `#7f1d1d` and sandstone `#c53030`; both themes actually resolve to
`#ef4444`. A contrast gate reading a second copy of the palette measures the
copy — the same one-owner-per-rule failure as everywhere else in these two
audits, in the one place where being wrong is invisible.

The script now parses `apps/web/src/styles.scss` directly: `:root` for light,
the `tweakcn-dark-semantic-palette` mixin for dark, the `html[data-theme="sandstone"]`
block layered over `:root` for sandstone, resolving `oklch()`, hex and `var()`
chains. A token it cannot resolve is **reported and fails the run** rather than
silently skipped. Then added to `design-system:check`, and so to `npm run verify`.

**A6 — Touch targets: the constitution and the size scale disagree.**
The constitution requires **≥ 44 px desktop / 48 px mobile**. The button scale
is `icon` 40 px (used 78×), `icon-sm` 32 px (7×), `icon-xs` 24 px (6×), and only
**6** SCSS files declare a 44/48 px minimum anywhere. The constitution allows
compact visuals *if* the real hit area still meets the minimum — but no
component states how, and nothing checks. Pick one: raise `icon` to 44, add a
hit-zone recipe to the action kernel, or amend the constitution to say where the
rule applies. Any of the three beats a rule that is quietly false.

**A7 — Put axe into the Playwright suite you already have.**
`apps/web/e2e/` has 4 specs and a working auth setup. A per-route axe pass is
about thirty lines and catches the class of defect no static rule can see:
contrast as rendered, focus order, aria on a live DOM, and the state of a dialog
*after* it opens. Grundriss runs axe in unit tests and still documents that
static audits never open a dialog — here the browser is already running.

**A8 — Colour is currently the only channel for the attention tiers.**
Gold / blue / violet distinguish high-attention, context and navigation. The
constitution says colour is never the sole state indicator. For selected rows
that is a real gap: add a second channel (a leading bar, a check, a weight
change) to the emphasis mixins so the tiers survive both a colour-vision
deficiency and direct sunlight.

### M · Motion

**M1 — One global `prefers-reduced-motion` block. ✅ Landed.**
7 component SCSS files and 2 global partials handled it; everything else
animated regardless — while `motion.md` already said reduced motion "disables
all transforms and fades". `apps/web/src/styles/_reduced-motion.scss`, emitted
last, now owns it: durations and delays collapse to 0.01 ms (not 0, so
`transitionend` / `animationend` still fire and no FSM waiting on them hangs).

Two decisions worth knowing. The `!important` is deliberate and the comment says
what it fights — component SCSS and Tailwind utilities both declare transitions
later in the cascade, and an OS accessibility setting has to win over both.
And continuous progress indicators are **exempt**: a spinner frozen mid-rotation
reads as a hung app, which is worse than the motion it avoids. The existing two
are BEM `…__spinner`; new ones opt out with `data-motion="essential"`.
Per-component copies can be deleted as those files are touched.

**M2 — Use the motion tokens that already exist.**
**165** raw `ms` literals and **11** `cubic-bezier()` calls in component SCSS,
against a defined scale of `--motion-duration-fast/standard/slow/entrance` and
`--motion-ease-out`. This is not a missing decision, it is an unenforced one —
the pattern-rule gate in § B1 of the process audit catches it, and the migration
is mechanical because the target tokens exist.

**M3 — Name the properties you transition. Three primitives use `transition-all`.**
`toggle-group-variants.ts`, `toast-variants.ts` and `tabs-variants.ts` all carry
`transition-all`, which animates layout properties too — a repaint per frame,
and a surprise the moment an unrelated property changes. The button base gets it
right with `transition-colors`. Three call sites is the whole migration; then
the rule ("name the properties") can be a gate rule alongside § B1's motion
patterns, and it stays at zero.

### T · Type and density

**T1 — Set a type floor, and put `2xs` back in its box.**
`--font-size-2xs` is **12 px**; `--font-size-xs` ≈ **13.6 px**. Both are used
across chat messages, metadata rows, invite panels and the upload tray — text
people read in sentences. Grundriss's rule: **14 px is the floor for anything a
user reads**; 12 px is for badges and counters only. For a product whose first
constitutional sentence is about sunlight and gloves, this is a product bug, not
a preference. Proposal: state the floor in the constitution, then audit `2xs`
call sites — chip, counter and badge keep it; prose moves up a step.

**T2 — Line-height belongs to the baseline, not to 65 components.**
`_typography-baseline.scss` sets 14 line-height rules; component SCSS sets
**174 more across 65 files**. That is duplicate ownership at scale, and it is
why type rhythm drifts between panels. Ownership rule: a component overrides
line-height only with a comment saying why the baseline is wrong there.

### E · Loading, empty, error

**E1 — `state-visuals.md` § "Loading and error" is a placeholder. Fill it.**
`AGENTS.md` § Component Structure already says loading/error/empty are mutually
exclusive with one visual owner each — a *structural* rule with no *visual*
contract behind it. That is the half that produces "the spinner is stuck behind
the error message".

**E2 — There is no shared empty-state component.**
`docs/design/components/empty-states.md` is 23 lines and 4 templates roll their
own. Empty states are where a product either explains itself or looks broken;
they deserve one primitive with a slot for the action.

**E3 — Skeletons over spinners, per the constitution — 19 files say spinner.**
12 mention skeleton. Not a rule violation per se (some of those are legitimate
indeterminate waits), but worth one pass: any wait whose layout is known should
be a skeleton, and the kernel should say which is which.

### X · Ownership and drift

**X1 — Every `!important` names what it fights.**
19 occurrences in 6 files; **2** have an adjacent comment.
`.cursor/rules/token-usage-gate.mdc` § 6 already documents the stale-escape-hatch
trap — the one that cost a real bug on 2026-07-01. The missing half is the
convention that writing one requires saying what it beats, so the next reader
can tell when it has gone stale.

**X2 — `outline: none` without a replacement.**
30 SCSS files use `outline: none`; **4** of them define no `:focus-visible`
anywhere. Those four are keyboard-invisible controls unless a parent covers them.

**X3 — Two canonical design docs cite a folder that was deleted.**
`apps/web/src/styles/primitives/` is gone; `state-visuals.md` cites
`button.scss` in it and `ui-primitives.badges-and-chips.md` cites `chip.scss`
(the latter now carries a `⚠ SPEC GAP` marker from the link repair pass). When
the *contract* file points at a deleted implementation, every downstream reading
is guesswork.

**X4 — Record where Feldpost deliberately differs from the base project.**
Three of the decisions above (attention tiers, host-aware disabled, the
Tailwind + SCSS split) are Feldpost being *right* and Grundriss being generic.
They should be ADRs (§ D2 of the process audit) so the next agent comparing the
two repos does not "fix" them.

---

## 4. Sequencing

| Wave | Contents | Why together |
| --- | --- | --- |
| **1 — user-visible defects** ✅ *landed 2026-09-08* | A3, A5, S1, S3, M1 | Each is small, each is felt: a failing contrast pair, a missing press, a contradictory doc, motion that ignores the OS setting. |
| **2 — floors that stay** | A1, A2, X2, M3, T1 | Turn on the rules while the violation count is 19, 4, 0 and a known list. Cheapest they will ever be. |
| **3 — the contracts** | S2, S4, S7, A4, A6, A8, E1, T2, X1, X3 | Documentation and token work that needs owner decisions, not just code. |
| **4 — enforcement reach** | S5, S6, A7, E2, E3, X4 | Bigger builds: registry coverage, axe in e2e, an empty-state primitive. |

---

## 5. What is deliberately not proposed

- **Grundriss's token names** (`ink`, `canvas`, `surface`, `accent-deep`).
  Feldpost is on tweakcn semantics with three themes; renaming would be pure
  churn. Only the `-deep`-for-hover *idea* is worth taking (S2).
- **Replacing the three-tier attention budget** with Grundriss's single accent.
  Feldpost's is more expressive and better documented.
- **Dropping SCSS for utilities.** `AGENTS.md` already settled that both are
  standard and the rule is "do not solve the same visual concern twice".
- **A component-level `prefers-reduced-motion`** — that is the thing M1 removes.

---

## 6. Priority table

**Impact** = what a user feels. **Effort:** S ≤ 1 h · M ≤ ½ day · L > 1 day.

| # | Change | Prio | Effort | Impact | Evidence |
| --- | --- | :---: | :---: | :---: | --- |
| ✅ **A3** | Fix destructive-button contrast | **P0** | S | High | was 3.61:1 in **all 3** themes, now 4.73:1 |
| ✅ **A5** | Contrast audit reads real tokens, and is in the gate | **P0** | M | High | its palette was a stale hand-copy; hid 5 failures |
| ✅ **S1** | Pressed state for `default` / `secondary` / `link` | **P0** | S | High | was 3 of 6 variants with `hover:` and no `active:` |
| ✅ **S3** | Reconcile disabled: doc now matches code, dead ref gone | **P0** | S | Med | 0.5-vs-0.66 left as an owner decision |
| ✅ **M1** | One global `prefers-reduced-motion` | **P0** | S | High | was 7 files handling it, the rest ignoring it |
| **A1** | Turn on 8 more a11y template rules | **P1** | M | High | **19** findings total; 3 rules already clean |
| **A2** | `click-events-have-key-events` → `error` | **P1** | S | Med | keyboard rule sitting at `warn` |
| **X2** | `outline: none` with no focus replacement | **P1** | S | High | 4 files |
| **T1** | Type floor: 14 px for read text, `2xs` for chips only | **P1** | M | High | `2xs` = 12 px, `xs` ≈ 13.6 px, used for prose |
| **S4** | Canonical five-state table in `state-visuals.md` | **P1** | S | Med | `active` is not covered anywhere |
| **S2** | `-deep` hover tokens instead of `/90` opacity | **P1** | M | High | invisible on saturated gold, inverts on dark |
| **M3** | Replace `transition-all` in 3 primitives, then lock the rule | **P1** | S | Med | toggle-group, toast, tabs |
| **A6** | Touch targets: 40 px `icon` vs the 44/48 px rule | **P1** | M | High | `icon` used 78×; 6 files declare a minimum |
| **A4** | Border contrast + the 3 baselined pairs | **P1** | M | High | borders 1.18–1.32:1; sandstone primary button **2.26:1** |
| **E1** | Fill the loading/error visual contract | **P2** | M | Med | section is literally marked "(placeholder)" |
| **X1** | Every `!important` names what it fights | **P2** | S | Med | 19 occurrences, 2 commented |
| **X3** | Repair the two dead `styles/primitives/` citations | **P2** | S | Med | contract files citing deleted code |
| **S7** | Say what hover does on coarse pointers | **P2** | S | Med | outdoor one-handed use is the primary persona |
| **T2** | Line-height back to the baseline | **P2** | M | Med | 174 overrides in 65 files vs 14 global rules |
| **A8** | A second channel besides colour for the tiers | **P2** | M | Med | constitution: colour is never the sole indicator |
| **M2** | Migrate raw motion literals to the tokens | **P2** | M | Med | 165 raw `ms`, 11 `cubic-bezier` |
| **S5** | Assert declared states are implemented | **P3** | M | High | `registry.json` declares them; nothing checks |
| **S6** | Grow `registry.json` past 9 components | **P3** | L | High | 9 declared vs 75 catalogued vs 82 in `shared/` |
| **A7** | axe pass in the existing Playwright suite | **P3** | M | High | 4 e2e specs and auth setup already exist |
| **E2** | A shared empty-state primitive | **P3** | M | Med | 23-line doc, 4 bespoke implementations |
| **E3** | Skeleton-vs-spinner pass | **P3** | M | Low | 19 spinner files, 12 skeleton |
| **X4** | ADRs for where Feldpost deliberately differs | **P3** | S | Med | three decisions a comparison could "fix" |

---

## 7. How the numbers were measured

```bash
S=apps/web/src/app
node scripts/audit-theme-contrast.mjs; echo $?          # 1 failure, 3 warnings, exit 1
rg -l ':active'        $S --glob '*.scss' | wc -l       # 5   of 133 component SCSS
rg -l ':focus-visible' $S --glob '*.scss' | wc -l       # 51
rg -l 'outline: *none' $S --glob '*.scss' | wc -l       # 30  (4 with no :focus-visible)
rg -l 'prefers-reduced-motion' $S --glob '*.scss' | wc -l   # 7
rg -o '[0-9]+ms'       $S --glob '*.scss' | wc -l       # 165
rg -o 'cubic-bezier\(' $S --glob '*.scss' | wc -l       # 11
rg -o 'line-height:'   $S --glob '*.scss' | wc -l       # 174 in 65 files
rg -o '!important'     $S --glob '*.scss' | wc -l       # 19  in 6 files
rg -o 'transition-all' $S | wc -l                       # 3   (toggle-group, toast, tabs)
rg -n -- '--font-size-2xs:' apps/web/src/styles/_typography-baseline.scss   # 0.75rem
```

Click-handler reachability (346 handlers, 319 on `<button>`, 5 unreachable
`<div>`s) came from a tag-aware scan of every template. The 19 a11y findings
came from running the eight candidate rules over `src/**/*.html` with a
throwaway flat config. Button-variant state coverage was read directly from
`apps/web/src/app/shared/ui/button/button-variants.ts`.
