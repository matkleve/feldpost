# Implementation blueprints (`docs/implementation-blueprints/`)

> **Closed to new documents (2026-09-10).** This folder holds exactly one blueprint and gains no more. Normative behaviour belongs in a spec under [`docs/specs/`](../specs/README.md); the *reasoning* behind a design — why this shape and not the alternative — belongs in [`docs/study/`](../study/README.md) as a study with `type: proposal` and an evidence grade on every claim.

A blueprint is a hybrid: part contract, part proposal, with nothing marking which sentence is which. That is precisely the ambiguity the study format exists to remove — a `[D]` (a decision someone could change) read as an `[A]` (verified fact) is how an unaccepted plan gets built as though it were signed off ([`STUDY-FORMAT.md`](../study/STUDY-FORMAT.md) § Evidence grades).

## Contents

| File | Status | Notes |
| --- | --- | --- |
| [universal-search-provider-system.md](universal-search-provider-system.md) | Planned, not accepted | Formal `SearchProvider` interface, `#`/`+`/`-` keyword operators, reusable filter toolbar. Links the three governing specs at the top. Its "Existing Infrastructure (verified)" table was accurate when written and is not gated by anything — re-check paths before relying on it. |

## If you are editing this file

That is the moment it gets reclassified, per [`docs/study/README.md`](../study/README.md) § Migrating an existing document: split the normative half into the governing spec, move the reasoning to `docs/study/NNN-slug.md` as `type: proposal`, grade the claims, add the index row, and fix the inbound links in the same commit. Do not do it as a drive-by while the plan is dormant — this folder is deliberately not a migration backlog.

## History

[`docs/audits/README.md`](../audits/README.md) previously stated that this folder had been removed and "is not coming back". It had not been removed; that line was one of the broken-reference cases that motivated the doc-link gate (`scripts/check-doc-links.mjs`, audit item B4). Corrected 2026-09-10.
