# The Team

> Single source of truth for who does what. Agent files live in `.github/agents/`.
> The pipeline that orchestrates them: [`idea-to-ship-pipeline.md`](idea-to-ship-pipeline.md).

---

## The Five

| Name | Role | When to call | Skills owned |
| --- | --- | --- | --- |
| **Nav** | Planner | Before any code — file map, reuse decision, change-class, one runnable check | `component-structure`, `issue-triage-next` |
| **Lex** | Spec-Writer | When a spec is missing, wrong, or needs updating | `write-element-spec`, `spec-audit` |
| **Brix** | Implementer | When spec + plan exist and it's time to build | `implement-from-spec`, `service-symmetry`, `safe-file-split` |
| **Val** | Checker | After Brix finishes — code↔spec validation, checkbox updates | `check-spec`, `verify-issues`, `audit-scope-to-issues` |
| **Revy** | Reviewer | Last gate — adversarial, fresh context, Sensitive-class mandatory | `design-audit`, `spec-audit` |

---

## The Pipeline — who calls whom

```
You (Product Owner)
  └── ship-pipeline (orchestrator skill)
        │
        ├── Stage 0–1  →  You + Nav    (Intake, DoR, change-class)
        ├── Stage 2    →  Lex          (Spec — behavior, coherence contract, FSM)
        ├── Stage 3    →  Nav          (Plan — file map, reuse, runnable check)
        ├── Stage 4    →  Nav          (Task slices)
        ├── Stage 5    →  Brix         (Implement — red-test-first)
        ├── Stage 6    →  Val → Revy   (Check then adversarial review)
        └── Stage 7    →  You + Val    (DoD — completeness, spec sync, ship)
```

Shortcut for Standard-class work: **Lex → Brix → Val**. Revy only if Val surfaces real gaps or it's Sensitive.

---

## How they address each other

When an agent hands off, it says the name directly:

> *"Handing to **Revy** for adversarial review."*
> *"**Lex**, the spec is missing the State-Coherence Contract — please add it."*
> *"**Brix**, Val found two gaps — see the report below."*

When you want to call one directly:

> "**Nav**, is this Standard or Sensitive?"
> "**Lex**, write a spec for X."
> "**Val**, check the upload-panel implementation."
> "**Revy**, full review — this is Sensitive."

---

## Change-class quick reference

| Class | Examples | Required ceremony |
| --- | --- | --- |
| **Trivial** | typo, copy text, token swap | build + gate script only. Skip Nav/Lex. |
| **Standard** | new component, service method, list/filter | Lex spec + Nav plan + Brix build + Val check |
| **Sensitive** | RLS, migrations, auth, FSM, upload pipeline | Full ceremony + Revy adversarial + LIVE VERIFICATION |

---

## Archived

| What | Where | Why |
| --- | --- | --- |
| `feldpost-prompt-analyzer-improver` | `.cursor/skills/archive/` | Meta-utility, not part of the standard pipeline flow |
| Old agent files (planner, spec-writer, implementer, checker, reviewer) | Replaced by named agents above | — |
