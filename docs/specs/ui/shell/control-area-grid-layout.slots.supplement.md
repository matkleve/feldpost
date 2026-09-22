# Control-area grid — slot inventory

> **Parent:** [control-area-grid-layout.md](./control-area-grid-layout.md)

## Left control area — baseline slots

| Container | Alignment | Control options (baseline) |
| --- | --- | --- |
| Top | start (top) | Logo · Map · Other pages |
| Bottom | end (bottom) | Settings · Profile |

## Right control area — baseline slots

| Container | Alignment | Control options (baseline) |
| --- | --- | --- |
| Top 1 | start (top) | Notifications · Upload · Download · Shared items |
| *(gap)* | — | Explicit vertical gap — **not** continuous stack ([OQ-17](./control-area-grid-layout.open-questions.supplement.md)) |
| Top 2 | start (below gap) | Undo · Change history · Redo |
| Bottom | end (bottom) | Tips · Help |

## Current → baseline mapping

| Baseline slot | Exists today | Current home | Migration notes |
| --- | --- | --- | --- |
| Logo | Yes | Nav header | OQ-04 |
| Map | Yes | Nav link `/` | Straightforward |
| Other pages | Yes | Nav links | OQ-05 |
| Settings | Yes | Account row → settings overlay | Split from profile — OQ-07 |
| Profile | Partial | Same account row | OQ-07 |
| Notifications | **No** | — | OQ-08 |
| Upload | Yes | `app-upload-shell` + workspace Upload tab | OQ-09 |
| Download | Partial | Workspace footer / bulk export | OQ-10 |
| Shared items | **Unclear** | Share links in workspace footer | OQ-11 |
| Undo | Partial | Delete toast undo only | OQ-13 |
| Change history | **No** | — | OQ-13 |
| Redo | **No** | — | OQ-13 |
| Tips | **Unclear** | Not in shipped nav | OQ-14 |
| Help | Partial | Mock / future | OQ-14 |
| Theme cycle | Yes | Nav utility row | OQ-15 — not in baseline list |
