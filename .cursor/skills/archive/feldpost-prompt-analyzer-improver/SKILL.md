---
name: feldpost-prompt-analyzer-improver
description: "Analyze and improve draft prompts intended for the Feldpost coding agent. Use when a user asks to audit, rewrite, or harden a Feldpost task prompt before implementation."
argument-hint: "Paste the draft Feldpost task prompt to evaluate and improve"
---

# Feldpost Prompt Analyzer & Improver

Use this skill to evaluate and improve prompts that are meant for the Feldpost coding agent.

## WHEN TO USE

- The user submits a draft task description intended for Feldpost implementation work.
- The user asks to audit, tighten, or rewrite a Feldpost coding prompt.
- The prompt targets Feldpost architecture or process constraints (for example AGENTS rules, Angular layering, service symmetry, i18n delivery, or audit-first workflow).

## WHEN NOT TO USE

- The user asks for direct code implementation instead of prompt improvement.
- The request is a general coding question that is not specifically about preparing a Feldpost agent prompt.
- The input is not a task prompt (for example runtime error logs, stack traces, or plain feature discussion without rewrite intent).

## Trigger Condition (Strict)

Run this skill only if both conditions are true:

1. The user is asking for prompt analysis or prompt rewriting.
2. The prompt is intended for Feldpost agent execution.

If either condition is false, do not run this skill.

## Status Legend

- `✓ OK` = criterion is explicit and actionable
- `~ Weak` = partially present but ambiguous
- `✗ Missing` = absent or too vague to execute safely

## Step 1 - Structural Scan

Evaluate the prompt against all criteria below and produce a table row for each one.

| #   | Criterion                  | Status | One-line Note |
| --- | -------------------------- | ------ | ------------- |
| 1   | Intent Clarity             |        |               |
| 2   | Scope Boundary             |        |               |
| 3   | Specificity vs. File Paths |        |               |
| 4   | Anti-Pattern Constraints   |        |               |
| 5   | Audit Requirement          |        |               |
| 6   | Output Format              |        |               |
| 7   | Permission to Fail         |        |               |
| 8   | Architecture Layer         |        |               |

Use the following checks:

1. **Intent Clarity**
   - Is the goal unambiguous (refactor, feature, fix, audit)?
   - If the prompt can reasonably mean two different outcomes, mark `✗ Missing`.

2. **Scope Boundary**
   - Are explicit constraints present (for example no template changes, no API surface changes, refactor only no logic changes)?
   - If no clear boundary is stated, mark `✗ Missing`.

3. **Specificity vs. File Paths**
   - Exact file paths are not required because the agent has filesystem access.
   - The prompt must still provide a clear anchor (component name, service name, or unique feature description).
   - Score rules:
     - `✓ OK`: clear component/service/module anchor
     - `~ Weak`: only broad area (for example upload stuff)
     - `✗ Missing`: no anchor, agent must guess domain

4. **Anti-Pattern Constraints**
   - Minimum constraints for Feldpost when refactor/new code is requested:
     - no RxJS in new/refactored logic
     - no hardcoded user-facing strings
     - do not bundle refactor and logic change in one step
   - If task is a pure feature request without refactor framing, `~ Weak` is acceptable.

5. **Audit Requirement**
   - If change scope is non-trivial (estimated more than 5 lines of code), prompt should require a written audit before code edits.
   - If missing for non-trivial work, mark `✗ Missing`.

6. **Output Format**
   - Is the deliverable format explicit (for example audit table only, improved prompt text, code diff, updated method)?
   - If at least three reasonable output formats remain possible, mark `✗ Missing`.

7. **Permission to Fail**
   - The prompt should explicitly allow the agent to say it cannot determine missing context.
   - If absent, mark `✗ Missing`.

8. **Architecture Layer**
   - Prompt should target the right Angular layer clearly:
     - component = thin delegation and UI wiring
     - service = logic and adapters
     - new/refactored code avoids RxJS
   - If layer ownership is ambiguous, mark `~ Weak`.

## Step 2 - Score and Decision

Count how many `✗ Missing` statuses are present.

- `0-1` missing: proceed with direct improvement output
- `2-3` missing: provide improved prompt and list one-line fixes for each missing gap
- `4+` missing: do not improve yet; ask focused clarifying questions first (maximum 3)

Apply this gate before final output:

- If any `✗ Missing` criterion would force implementation guessing, ask first instead of improving.

## Step 3 - Output

### Format A (Improve Path)

Use this structure exactly:

```markdown
### Analyse

[Criteria table with ✓/~/✗ and one-line notes]

### Improved Prompt

[Rewritten Feldpost-ready prompt in technical English, using Angular signals/effects/computed language and embedding relevant AGENTS constraints]
```

If this is the `2-3` missing path, append:

```markdown
### Gaps to Fix

- [One-line fix for gap 1]
- [One-line fix for gap 2]
- [One-line fix for gap 3 if present]
```

### Format B (Ask Path)

Use this structure exactly:

```markdown
### Analyse

[Criteria table with ✓/~/✗ and one-line notes]

### Open Questions (answer those first)

1. [Most critical gap]
2. [Second critical gap]
3. [Third critical gap]
```

## Improved Prompt Quality Rules

When producing an improved prompt:

- Write in technical English.
- Keep wording implementation-ready and unambiguous.
- Embed Feldpost-relevant constraints only (no generic boilerplate).
- Include explicit scope limits.
- Include expected output format.
- Include explicit permission to stop and request context.
- Prefer architecture-aware wording (component vs service responsibilities).

## Permission to Fail (Mandatory)

If the user specification is contradictory or underspecified, do not silently invent behavior.
Output this exact pattern and stop for clarification:

`⚠ SPEC GAP: [describe the ambiguity]`
