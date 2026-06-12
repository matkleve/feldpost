---
name: implement-from-spec
description: "Implement a UI element from its element spec. Specs are contracts — follow them literally."
argument-hint: "Element spec name or path (e.g., search-bar)"
---

# Implement From Element Spec

## Rules — read these first

1. **The spec is a contract, not a suggestion.** If the spec says X, implement X.
2. **Mermaid diagrams are implementation instructions.** State machines become code state machines. Sequence diagrams become method call sequences. Do not substitute your own approach.
3. **Do not debate specified design choices.** The decisions have been made. Execute them.
4. **Do not modify spec content.** You may only update Acceptance Criteria checkboxes `[ ]` → `[x]`. If something in the spec seems wrong, stop and ask the user — do not fix it yourself.
5. **Do not add anything the spec doesn't mention.** No extra state, no extra features, no extra error handling beyond what's specified.
6. **Preserve working code.** Only change what's needed to satisfy the spec. Don't rewrite correct code for style.

## Procedure

### 1. Read

1. Read the element spec markdown under `docs/specs/` (exact path from the task, or locate via `docs/specs/README.md`) — every section
2. Read matching **service facade specs** under `docs/specs/service/` (see `docs/specs/service/README.md`) for any `core/` modules involved.
3. Read design docs only if the spec doesn't answer a styling question

### 2. Check existing code

1. Check files from the spec's File Map — do they exist? Are they complete?
2. Compare against Actions, State, Wiring, Acceptance Criteria
3. Note what's done, what's missing, what's wrong

### 3. Implement

1. Create missing files from the File Map
2. Fix incorrect code to match the spec
3. For state machines in the spec: implement the exact states and transitions shown
4. For sequence diagrams: implement the exact call order shown
5. For data flows: use the exact queries and service methods listed
6. Wire into parent per the Wiring section
7. Use design tokens, not hardcoded values

### 4. Verify

1. Run `ng build` — must pass
2. Walk through each Acceptance Criteria item
3. Mark `[x]` for items the code satisfies; leave `[ ]` for items that are incomplete or blocked
4. If blocked on something, say what and why — don't guess

### 4b. Stateful / layered UI (FSM) — extra gates

When the spec defines a **state enum** and **stacked layers**:

1. **Transition map:** grep every `goTo(` / state assignment against `MEDIA_DISPLAY_TRANSITIONS` (or equivalent). Spec-allowed edges must exist in the map.
2. **FSM ↔ CSS:** update the supplement **layer opacity matrix** (`#fsm-layer-opacity-matrix` or equivalent); SCSS must implement every cell — no visibility outside the table (see `.cursor/rules/ui-state-machine.mdc` § FSM ↔ CSS ↔ DOM alignment).
3. **DOM gates:** if template uses `@if` on a computed separate from `data-state`, document it in the spec; do not treat `data-state` alone as “what the user sees.”
4. **🔴 LIVE CHECK (you):** for cache, route revisit, or `media-display` work, the agent **must** tell the owner to run the live table in `docs/agent-workflows/agent-communication.md` § **LIVE VERIFICATION** (map → `/media` ×2 minimum). Build green is not enough.

## What NOT to do

- Do not re-plan what the spec already planned
- Do not reason about alternative approaches to specified flows
- Do not add defensive error handling the spec doesn't call for
- Do not refactor surrounding code
- Do not create abstractions for one-time operations
- Do not edit spec prose, diagrams, or tables — only checkboxes
