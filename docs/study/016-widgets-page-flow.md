---
id: STUDY-016
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Widgets page — the flow, and what is not decided

**Written:** 2026-09-22. **On:** `cursor/grid-shell-preview-c5a8`. **How:** read STUDY-015 § 14.2 and `shell-control.types.ts`; the owner asked for a ChatGPT-apps-shaped flow and then asked for a spec instead of a build.

This study is not permission to implement. The contract shape is [widgets-page.md](../specs/page/widgets-page.md). The questions below have to be answered, in studies, before a route or a table exists.

## What is already decided

- The left-rail `+` is `kind: 'inert'` in `apps/web/src/app/layout/shell/shell-control.types.ts` `[A]`.
- STUDY-015 § 14.2: the `+` opens a widget page, and Mitarbeiter and Organisation are widgets that are absent from the rail when not installed `[D]`.
- The owner, 2026-09-22: the flow is a directory, then one explanation page per widget `[D]`. That is the shape written into the page spec. It is not a copy of another product's data model.

## What this study does not decide

Each row is a study that has to land, and be accepted, before code.

| Id | Question the study must answer | Why it blocks |
| --- | --- | --- |
| W1 | Who installs a widget: the organization, or one user? | The table and the RLS policy are different. |
| W2 | Which widgets exist, besides the two named in STUDY-015? | A directory with an invented catalog is a second product. |
| W3 | Can map, projects, and media be removed, or are they fixed? | The rail render is either a fixed prefix plus widgets, or a pure list. |
| W4 | Do widgets only add left-rail options, or also right-rail panels? | The right rail is a different contract (panel column). |
| W5 | Who writes the explanation: one product spec per widget, or a row in a table? | The explanation page has no body until this is chosen. |

W1 is the first of these. W2 through W5 can be written against its answer. None of them are answered here `[D]`.

## What would settle W1

An owner decision: organization-wide install, or per-user install. Until that sentence exists, no migration and no route.

## Update 2026-09-22

The owner rejected the install-scope question as the rights model `[D]`. A role on the organization is the grant, and that role is customized for allowed widgets and allowed data. The directory-then-explanation flow in this study is unchanged. The rights reading, the existing `org_roles` catalog, and a proposed GPS-and-media suite are [STUDY-017](017-role-widget-grants.md). The W1 row above stays as it was written.

## Update 2026-09-22 — W3, W4, W5

The owner leaned yes on W3 and asked for a study rather than a decision `[D]`. W4 is both a canvas page and a right-rail panel in general, and Workers and Organisation join the bottom-left container `[D]`. Those two questions are [STUDY-018](018-rail-placement.md). The W3 and W4 rows above stay as they were written.

W5, as asked, was who writes the explanation. The owner answered with the card `[D]`: a rectangle with the name, a short explanation, More, and Add, greyed out when the organization does not allow the widget. That shape is in [widgets-page.md](../specs/page/widgets-page.md). Who stores the sentences is still open. The W5 row above stays as it was written.
