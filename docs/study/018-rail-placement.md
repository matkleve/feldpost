---
id: STUDY-018
type: proposal
status: proposed
supersedes: none
corrected-by: none
---

# Where pages and widgets sit on the rails

**Written:** 2026-09-22. **On:** `cursor/grid-shell-preview-c5a8`. **How:** read `LEFT_GROUPS` in `apps/web/src/app/layout/shell/shell-control.types.ts` and [shell-control-area.md](../specs/ui/shell/shell-control-area.md). The owner answered W3, W4, and the directory card the same day.

This study is not permission to implement. The static rail list does not change because of it. [STUDY-016](016-widgets-page-flow.md) still owns the directory flow.

## What the rail is today

The left rail has two containers `[A]` (`shell-control.types.ts`, `LEFT_GROUPS`):

- **Top** (`id: 'top'`): Map (`/`), Projects (`/projects`), Media (`/media`), and `+` (inert).
- **Bottom** (`id: 'bottom'`): Account and Settings.

The right rail is a different contract: it opens the panel column `[A]` ([shell-control-area.md](../specs/ui/shell/shell-control-area.md)).

## W3 — can Map, Projects, and Media leave the rail?

The owner does not know, leaned yes, and asked for this study instead of a locked decision `[D]`. "Yes" here means the rail option can be absent. It does not mean the route or the feature is deleted `[D]`.

Logo, `+`, Account, and Settings were not named. This study does not say they can leave `[D]`.

If the lean holds, three consequences have to be answered before a spec can allow it:

| Id | Consequence | Why it blocks |
| --- | --- | --- |
| P1 | What does the canvas show when Map is absent? | `/` is the map route today `[A]`. An organization with no Map still needs a first page. |
| P2 | Does a hidden rail option still answer its route? | A bookmarked `/media` with no Media icon is either a page or a dead end. |
| P3 | Is the top container then only installed pages plus `+`? | The rail stops being a fixed prefix. |

Until P1 is answered, Map, Projects, and Media stay in the static list `[D]`.

## W4 — every place a widget can land

A widget is not one slot. These are the placements that exist in the shell, and the ones the owner left open `[D]`.

| Placement | Opens | Named by the owner |
| --- | --- | --- |
| Top-left container | A canvas page, with Map, Projects, and Media | The pages. Not Workers. Not Organisation. |
| Bottom-left container | A canvas page, with Account and Settings | Workers and Organisation. |
| Right-rail panel | The panel column | Generally yes, a widget may also do this. |
| Canvas page and a panel | Both of the above, for one widget | The general case the owner asked to keep open. |
| Right rail only | A panel, no left option | Possible. No widget was named for it. |

Workers are Mitarbeiter. Organisation is the widget named in STUDY-015. Both join the bottom container when they exist `[D]`. They are not in `LEFT_GROUPS` today `[A]`.

The GPS-and-media suite in STUDY-017 was not given a container. Treating those as top-container pages is a guess, not a decision `[D]`.

## Directory card

The owner described the directory rectangle `[D]`: the widget name, a short explanation, More, and Add. The rectangle is greyed out when the organization does not allow that widget. More opens the explanation page. Add on a greyed rectangle does not install. That shape is the contract in [widgets-page.md](../specs/page/widgets-page.md). Who writes the sentences, a spec or a table, is still open `[D]`.

## What would settle this

One sentence for P1: the page the canvas shows when Map is not on the rail. The bottom-container placement for Workers and Organisation does not need that sentence, and it still waits for STUDY-016 to be accepted before any rail list changes.

## Update 2026-09-22 — owner sign-off

The owner accepted the readings in this study `[D]`. Signed off:

- Map, Projects, and Media may leave the rail. The icon goes. The route still renders the page.
- Logo, `+`, Account, and Settings stay.
- A widget may be a canvas page, a right-rail panel, or both.
- Workers and Organisation join the bottom-left container. They do not join the top container.
- The GPS-and-media suite has no container yet. It is not assumed to be the top container.
- The directory rectangle in the page spec is the card.

`LEFT_GROUPS` stays as measured above `[A]`. P1 is still open, so this sign-off does not remove an icon and does not add Workers or Organisation to the rail `[D]`.

## Update 2026-09-22 — empty canvas

The owner does not know what the canvas shows when it would otherwise be empty `[D]`. The candidate they named is an overview of "this and states." That is not a page, and it is not the projects dashboard at `/projects` `[A]` (`docs/specs/page/projects-dashboard.md`).

Read as a candidate only `[D]`: the overview lists the widgets the organization has, and a state for each one — not allowed, allowed but not added, added. Which states, and whether this overview replaces `/` when the Map icon is absent, are not decided. Map stays on the rail until they are.

## Update 2026-09-22 — logo and grants

The owner chose the overview as the empty-canvas widget, and the logo as the control that opens it `[D]`. The page contract is [widget-overview.md](../specs/page/widget-overview.md). `/` stays the map while the Map icon is on the rail `[D]`.

The grant shape, chosen for modularity `[D]`: a code catalog, one organization install table, and new keys on the existing `org_permissions` catalog. Data scope is the organization. The contract is [widget-grants.md](../specs/system/widget-grants.md). The earlier "candidate only" paragraph stays.
