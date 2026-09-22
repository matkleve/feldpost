# Control-area grid — slot inventory

> **Parent:** [control-area-grid-layout.md](./control-area-grid-layout.md)

## Left control area — baseline slots

| Container | Alignment | Control options (baseline) |
| --- | --- | --- |
| Top | start (top) | Logo · Map · Other pages |
| Bottom | end (bottom) | Settings · Profile (**two separate options** — OQ-07) |

**Left rail width (OQ-02):** fixed icon-only track; labels on **~1 s hover** via horizontal option expansion.

## Right control area — baseline slots

| Container | Alignment | Control options (baseline) |
| --- | --- | --- |
| Top 1 | start (top) | Notifications · Upload · Download · **Shared media** |
| *(gap)* | — | Explicit vertical gap — **not** continuous stack ([OQ-17](./control-area-grid-layout.open-questions.supplement.md)) |
| Top 2 | start (below gap) | Undo · Change history · Redo |
| Bottom | end (bottom) | Tips · Help |

## Route canvas floats (map zone — not control areas)

| Control | Placement | Decision |
| --- | --- | --- |
| Search bar + filter | Map zone, **top-left** | OQ-18 |
| Theme cycle | Map zone (exact corner TBD) | OQ-15 |
| GPS, basemap, scale, zoom | Map zone | Existing map-shell floats |

## Current → baseline mapping

| Baseline slot | Exists today | Current home | Migration notes |
| --- | --- | --- | --- |
| Logo | Yes | Nav header | OQ-04 |
| Map | Yes | Nav link `/` | Straightforward |
| Other pages | Yes | Nav links | OQ-05 |
| Settings | Yes | Account row → settings overlay | **Split** — own bottom option (OQ-07) |
| Profile | Partial | Same account row | **Split** — own bottom option (OQ-07) |
| Notifications | **No** | — | OQ-08 |
| Upload | Yes | `app-upload-shell` + workspace Upload tab | OQ-09 |
| Download | Partial | Workspace footer / bulk export | OQ-10 |
| Shared media | Partial | Share / restore flows in workspace | OQ-11 — STUDY-010 for RLS scope |
| Undo | Partial | Delete toast undo only | OQ-13 |
| Change history | **No** | — | OQ-13 |
| Redo | **No** | — | OQ-13 |
| Tips | **Unclear** | Not in shipped nav | OQ-14 |
| Help | Partial | Mock / future | OQ-14 |
| Theme cycle | Yes | Nav utility row | **Move to map zone** (OQ-15) |
| Search bar | Yes | Map top-center | **Move to top-left** (OQ-18) |
