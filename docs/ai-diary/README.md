# AI diary

Daily notes from coding agents working on Feldpost — what was decided, what shipped, what went wrong, and what the next session needs to know.

The diary is **narrative memory**: it answers *what happened on a given day*. It is not a contract, not an analysis, and not a warning list. Keeping that boundary is the whole job of this README — a diary that absorbs the other three kinds of memory becomes unsearchable, and then nobody opens it.

## What belongs here, and what does not

| It answers | It goes in | Shape |
| --- | --- | --- |
| **What happened**, on a date, in order | this folder | Narrative. What was changed, what was found, what was decided, what was left open. |
| **Why this and not the alternative** | [`docs/study/`](../study/README.md) | A reasoning document with an **evidence grade** (`[A]`–`[D]`) on every claim and a `status` saying whether it still holds. |
| **How this code misleads** | [`docs/TRAPS.md`](../TRAPS.md) | A misleading surface, what a reader assumes, what is actually true, and how to detect it. |
| **What it should do** | [`docs/specs/`](../specs/README.md) | The contract. Normative — code follows the spec, not the reverse. |
| **What still needs doing** | GitHub Issues | The register. See [`docs/backlog/README.md`](../backlog/README.md) § Where open work lives. |

The boundary that actually gets tested is the first three. A worked example from the same day:

- *"Installed PostgreSQL 16, replayed all 132 migrations, found `add_media_item_location` ambiguous"* — **diary**. It is what happened, on a date.
- *"A static read of SQL is not verification; a local replay needs no credentials"* — that is a claim about how this repository misleads a reviewer, and it had already cost a wrong answer on a load-bearing question. **TRAPS** ([TRAP-003](../TRAPS.md#trap-003--create-or-replace-function-does-not-replace)).
- *"Full containment versus centroid distance for radius selection, and what each costs"* — a comparison of alternatives that someone will re-derive if it is not written down with its evidence. **Study**.

If you cannot tell which one you are writing, ask what a reader would be doing when they need it. Someone catching up on a feature area reads the diary. Someone stuck on a bug for the second time reads TRAPS. Someone about to re-litigate a decision reads the study. Someone implementing reads the spec.

## Layout

- **One file per calendar day: `YYYY-MM-DD.md`.** Example: [`2026-05-19.md`](./2026-05-19.md). The name is the only index this folder has; "the latest entry" must be a question with an answer.
- Multiple sessions on the same day append to the same file, under their own `##` heading.
- Two files predate this rule and are not a precedent: [`2026-05-23-file-preview-prereq.md`](./2026-05-23-file-preview-prereq.md) and `photon-curl-gate-2026-05-25.json` (a captured command output, not an entry). Both are exempted by name in the checker below, so the rule holds for everything added from here on.
- Enforced by `node scripts/verify.mjs specs` (rule `diary-entry-filename`), which also rejects a well-formed name that is not a real date, such as `2026-02-31.md`.

## Rules

1. **Append, never rewrite.** An entry records what was believed and done on that day. When it turns out to be wrong, the correction goes in a **later** entry — and, if the old one would mislead someone reading it alone, a one-line correction note pointing forward. Never edit the claim away: the sequence of a wrong belief followed by its correction is the most useful thing in the folder.
2. **Entries are never deleted.**
3. **Skip the day if nothing was learned.** A run of empty entries teaches people to stop opening the folder, which costs more than the missing days.
4. **Promote or lose it.** A lesson is *noticed* here and *promoted* elsewhere: a rule that lives only in a dated diary entry will be missed, because an agent resuming work reads the **latest** entry for its area and will not find a warning recorded eight weeks earlier under a different feature. Promote to [`docs/TRAPS.md`](../TRAPS.md) when a lesson has **bitten twice, or once with a user-visible consequence**; to a **spec** when it changes what the code should do; to a **study** when it is reasoning someone will otherwise re-derive.
5. **Write for the next session, not for yourself.** Name files and symbols in full, say what you deliberately did *not* do and why, and end with what the next person should pick up.
6. **Record corrections from the user.** When the product owner corrects an assumption, that is an invariant update — [`AGENTS.md`](../../AGENTS.md) § Collaboration with the user asks for a diary note whenever the mistake is likely to recur.

## Before you resume work

**Read the latest entry for your feature area before resuming it** ([`AGENTS.md`](../../AGENTS.md) § Document Authority). The diary is short-term memory across sessions: it carries the open questions, the deliberate omissions, and the "this looked broken but is not" notes that no spec will ever contain.

Normative "ask early / how to prompt" rules for agents: [`docs/agent-workflows/agent-communication.md`](../agent-workflows/agent-communication.md).
