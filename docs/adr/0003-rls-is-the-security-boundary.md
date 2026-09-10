# ADR-0003 — Row-Level Security is the security boundary; the frontend is untrusted

- **Status:** accepted
- **Date:** predates the ADR folder; in force since the Supabase schema was introduced, written down in [`docs/security-boundaries.md`](../security-boundaries.md)
- **Deciders:** repository owner
- **Applies to:** every table, every RPC, every storage bucket, and every query the Angular app makes

## Context

Feldpost is an Angular SPA talking to Supabase over the network with a JWT the browser holds.
There is no server of ours between the two. Everything the client sends is attacker-controlled:
the filter arguments, the `organization_id` it claims, the row ids it asks for. The product
stores photographs of job sites with coordinates and timestamps — personal data under DSGVO —
and each organization must never see another's.

Given that shape, either the database enforces access or nothing does.

## Decision

**Authorization lives in PostgreSQL Row-Level Security, and nowhere else.** RLS is enabled on
all tables, scoped by `organization_id` and `auth.uid()`; storage policies scope object paths
the same way. Client-side filtering is a user-experience feature and carries **no** security
weight: a query that would be safe only because the frontend adds a `.eq('organization_id', …)`
is an unprotected query. Frontend validation is UX; server-side constraints, triggers and
policies are the contract.

This is item 1 of the instruction precedence in `AGENTS.md` — it outranks every other
engineering rule in the repository.

## Alternatives considered

### A trusted backend-for-frontend holding the service-role key

Rejected because it moves the boundary rather than creating one, and it creates a second
place where organization scoping can be forgotten — with the service-role key, forgetting it
is silent and total. It also buys nothing the database cannot do: the checks are row-shaped,
and PostgreSQL already knows the rows.

### Enforce scoping in the Angular data layer (adapters/services)

Rejected outright: the frontend is code the user runs. This is the alternative that has to be
named explicitly, because it *looks* like it works in every manual test.

### RLS plus a duplicate check in application code, as defence in depth

Rejected as a **stated** boundary, though redundant client filters are fine as UX. Two places
that both "enforce" access is how one of them drifts and how a reviewer stops being able to
answer "what actually protects this row?". One boundary, named, testable.

## Consequences

- **Good:** the answer to "who can read this?" is a policy in a migration, reviewable and
  replayable; a frontend bug cannot become a data breach.
- **Cost:** every feature needs a migration and a policy, not just a query. Debugging starts
  in the database (`AGENTS.md` § Universal Invariants: database-first debugging), which is
  slower than reading component code and is correct more often.
- **Cost:** RPC signatures are part of the security surface — see
  [ADR-0007](./0007-phase-transition-map-does-not-veto-the-pipeline.md)'s sibling lesson about
  `CREATE OR REPLACE` in [`docs/ai-diary/2026-09-10.md`](../ai-diary/2026-09-10.md), where a
  migration reviewed statically was concluded safe and was not.
- **Gate:** `scripts/validate-chat-rls.sql`, `scripts/validate-upload-role-rls.sql`,
  `scripts/validate-dsgvo-security.sql`. Any change to a policy, a migration, or an RPC is
  **Sensitive** class and runs the matching script — **replayed against a real database**, not
  read.

## Evidence

- [`docs/security-boundaries.md`](../security-boundaries.md) § 1 — the trust model, browser in
  the untrusted zone `[A]`.
- [`supabase/AGENTS.md`](../../supabase/AGENTS.md) — "RLS enforced on all tables — no
  exceptions"; `organization_id` scoping `[A]`.
- `AGENTS.md` § Instruction precedence item 1 and § Universal Invariants `[A]`.
- `scripts/validate-*-rls.sql`, `scripts/validate-dsgvo-security.sql` exist and are named by
  the Sensitive change class `[A]`.

## Superseded by

*none*
