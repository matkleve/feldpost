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
