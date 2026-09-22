# Agent benchmark — measuring repo fit

How to decide whether an agent can work in Feldpost, and at which change class. Moved out of
[`AGENTS.md`](../../AGENTS.md) on 2026-09-22 so the instruction file stays under its cap; nothing
here is optional when assigning agents to upload or Sensitive work.

**The rule:** `npm run verify` is necessary but not sufficient. Pair it with the tier ladder, frozen
trace scenarios, intake scorecard, and adversarial audit below.

---

## Tier ladder (pass/fail per tier)

| Tier | Example task | Pass criteria |
| --- | --- | --- |
| **T0 Trivial** | Single token swap, copy fix, comment | `npm run verify` green; no unrelated diff |
| **T1 Standard** | Wire existing shared component, add filter option | Component registry check; spec touched if behaviour changes; i18n if visible text |
| **T2 Upload-sensitive** | Street normalization, search-object fold, trace corpus | Red tests fail *before* fix; `firma_at_archive` numbers within bounds (below); adversarial audit finds 0 P1 defects |
| **T3 Sensitive** | RLS migration, auth boundary, org-scoped RPC | Red SQL validation fails before; 🔴 LIVE CHECK emitted; fresh-context reviewer agrees |

An agent that passes T0–T1 but fails T2 is **not upload-ready** — assign trivial/standard work only.

Change-class mapping: [`AGENTS.md`](../../AGENTS.md) § Change Classification.

---

## Frozen trace scenarios (objective numbers)

Quote these from [`docs/playbooks/upload-pipeline-trace.md`](../playbooks/upload-pipeline-trace.md),
not from the agent's narrative.

```bash
node scripts/upload-trace-scale.mjs --profile=firma_at_archive --count=1000
```

| Scenario | Expected (2026-09-16, post-correction) | Automatic fail if |
| --- | --- | --- |
| `firma_at_archive` @ 1000 — street groups | **21** | Count drifts without documented reason |
| `firma_at_archive` @ 1000 — pre-upload trays | **1** | Count rises without new documented defect |
| SF-05 `Wasagasse` vs `Wasagase` | **No** merge | Same `groupingKey` |
| SF-06 `Bischofgasse` vs `Bischoffgasse` | **No** merge | Same `groupingKey` |
| SF-01 `Straße` vs `Strasse` | **Yes** merge | Different `groupingKey` |
| Layer S5 `Annenstraße 11` vs `Annenstraße 1` | Package conflict | Silent agreement |

Do **not** quote the `adversarial` profile as company cost — it is defect-hunting only.

Known open tray source until [#211](https://github.com/matkleve/feldpost/issues/211): ~121/1000
`admin_conflict` from gazetteer fuzzy match (`Gase`→Gasen). That number may fall when #211 ships;
update this table when it does.

---

## Intake scorecard (before any code)

Grade the agent's first planning message. **0–2 checked → likely to drift.**

- [ ] Restated invariant in own words
- [ ] Listed ambiguities and asked (or cited spec that locks them)
- [ ] Named change class (Trivial / Standard / Sensitive)
- [ ] Listed files to touch / not touch / how to verify
- [ ] For synthetic data: every corpus shape traces to owner quote or spec ID

---

## Corpus honesty gate

For any generated or synthetic test data:

- [ ] At least one shape would **fail** the agent's initial hypothesis
- [ ] Proportions marked GUESS until a real path export ([#216](https://github.com/matkleve/feldpost/issues/216))
- [ ] No circular proof (corpus built to match the fix, not the archive)

If the corpus only contains shapes the fix expects → **automatic audit fail**.

---

## Adversarial two-agent protocol

Required for T2 upload work and all T3 Sensitive changes.

| Role | Job |
| --- | --- |
| **Implementer** | Fix + tests + PR |
| **Auditor** (fresh context, different run) | Owner description + diff only → PASS/FAIL with `file:line` defects |

Merge upload or Sensitive PRs only when the auditor PASSes. Template: PR #209 audit → PR #210
correction (2026-09-16).

---

## What verify does and does not measure

| Measures | Does **not** measure |
| --- | --- |
| Compile, unit tests, i18n diacritics, design tokens | Real tray behaviour at scale |
| Spec registry integrity | Whether normalization merges distinct streets |
| Build succeeds | Whether the agent understood owner intent |
| Soft-debt ratchet (do not add) | Adversarial correctness |

Full gate list: [`gates-and-commands.md`](./gates-and-commands.md).

Owner-only checks (gates cannot run): [`agent-communication.md`](./agent-communication.md) § 🔴 LIVE
VERIFICATION.

---

## Model selection (practical)

- **Opus-class / long context:** T2 upload, T3 Sensitive, anything with owner-described real-world
  folder shapes, adversarial audit.
- **Cheaper models:** T0–T1 only, with this checklist frozen and no upload normalization.

---

## Related

- [`agent-communication.md`](./agent-communication.md) — clarification checklist, LIVE VERIFICATION
- [`implementation-checklist.md`](./implementation-checklist.md) — post-implementation verification
- [`docs/playbooks/upload-pipeline-trace.md`](../playbooks/upload-pipeline-trace.md) — corpus profiles
- [`docs/study/009-tray-question-budget-and-priority.md`](../study/009-tray-question-budget-and-priority.md) — tray measurement that closed the budget question
