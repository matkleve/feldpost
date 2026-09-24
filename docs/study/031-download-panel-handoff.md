---
id: STUDY-031
type: analysis
status: proposed
supersedes: none
corrected-by: none
---

# What the download panel is for

Measured 2026-09-24 on `cursor/selection-deselect-quiet-d4cd` at `2f05d1f3`, by reading the action matrix, the thumbnail menu, the shell control label, and the share-set specs. No app was run.

This study does not replace [STUDY-019](./019-selected-items-action-surface.md). That decision still stands: the surface mirrors the canvas, and the bottom bar of select-all / ZIP / share / copy does not come back as a selection toolbar `[D]`. This file answers a later question the owner asked: whether this window exists to **pass media on**, and whether the name `download` / **Selected items** is the wrong promise.

## The name is already three names

The same surface is called three different things `[A]`:

| Layer | Text | Where |
| --- | --- | --- |
| Internal id | `download` | `shell-control.types.ts` `id` and `panelId` |
| Rail icon | `download` | same file |
| Rail label and panel title | **Selected items** | `labelFallback` and `shell.panel.download.title` |
| Glossary | Selected items panel | `docs/glossary.md` |

`download` says files leave the app. **Selected items** says the window shows a set. Neither sentence says “hand this set to someone” `[C]`.

## Use cases that already have a product path

These are the handoff and set jobs the code and specs already name. They are not new feature ideas.

| # | Situation | What has to leave or change | Product path that exists | Where it is mounted now |
| --- | --- | --- | --- | --- |
| 1 | Send the current set to a client, the office, or named people | A link, with audience `public`, `organization`, or `named` | `share_link` plus the audience dialog | Thumbnail menu only. The footer that used to host it is gone `[A]` |
| 2 | Same set, on a desktop without a share sheet | The same link, on the clipboard | `copy_link` | Thumbnail menu `[A]` |
| 3 | Phone or tablet share sheet | The OS share target | `native_share`, only when the device supports it | Thumbnail menu `[A]` |
| 4 | Files for a report or an email attachment | A ZIP of the set | `download`, labeled **Export ZIP** | Thumbnail menu `[A]` |
| 5 | Check one photo before sending | Stay in the app, open detail | Detail inside this panel | Download panel body `[A]` |
| 6 | A wrong photo is in the set | The set shrinks | **Deselect all**, or deselect on the canvas | Toolbar when the grid is showing `[A]` |
| 7 | One address or GPS into a chat | Text, not the files | `copy_address`, `copy_gps` | Thumbnail menu, one item, location known `[A]` |
| 8 | Open that place outside Feldpost | A maps link | `open_google_maps` | Thumbnail menu, one item `[A]` |
| 9 | File the set under a project | Membership inside the org | `assign_to_project` | Thumbnail menu `[A]` |
| 10 | Take the set off a project, or delete it | Destructive edit | `remove_from_project`, `delete_media` | Thumbnail menu `[A]` |

There is no matrix action for a PDF site report, a printout, or an export into another construction tool `[A]`. Those are not ranked, because they are not functions this product has.

## Every function, and whether it is handoff

Source of the list: `docs/specs/system/action-context-matrix.md` action ids, plus **Deselect all** from STUDY-019. “Handoff” here means the current set is given to a person or leaves as files. Organizing, navigating, and editing are not handoff `[D]`.

| Function | Handoff of the set? | Already on the thumbnail? | Rank for this panel |
| --- | --- | --- | --- |
| `share_link` | Yes — a person receives the set | Yes | 1 |
| `copy_link` | Yes — same link, clipboard | Yes | 2 |
| `native_share` | Yes — OS sheet, device-gated | Yes | 3 |
| `download` / Export ZIP | Files leave; no recipient | Yes | 4 |
| `download_zip` | Same job as Export ZIP, second id | Matrix only; the menu uses `download` | Do not add a second button |
| Deselect all | No — shrinks the set before a handoff | Toolbar | Keep, already decided |
| Open detail | No — inspect one item | The panel body | Keep, already built |
| `copy_address`, `copy_gps`, `open_google_maps` | One place, not the files | Yes, one item | Stay on the item |
| `assign_to_project`, `remove_from_project` | Stays inside the org | Yes | Stay on the item |
| `open_in_media`, `zoom_house`, `zoom_street` | Navigation | Yes | Stay on the item or the map |
| `change_location_map`, `change_location_address`, `resolve_location` | Edit | Yes | Stay on the item |
| `delete_media`, `delete_locations` | Destruction | Delete is on the thumbnail | Not this window’s chrome |
| `select_all`, `select_none` | Selection | Footer retired | Do not bring back |
| Upload prompts, `create_marker_here` | Not this set | Elsewhere | Not this window |

The rank is a proposal `[D]`. It follows one rule: if the owner’s sentence is “this window passes media on”, the four set-handoffs outrank everything else, and share outranks ZIP because a download has no recipient `[C]`. No user session was watched. A different sentence (“this window only shows the set”) makes rank 1–4 stay on the thumbnail and the panel chrome stays as it is `[D]`.

## What the name should follow

The visible name should match the job. Three options, none accepted `[D]`:

| If the job is | Visible name | Internal id `download` |
| --- | --- | --- |
| Show the mirrored set, handoff stays on the thumbnail | **Selected items** (today) | Leave it. The icon `download` still over-promises `[C]` |
| Pass the set on (link first, ZIP second) | **Share** or **Pass on** | Rename only if the id leaking into conversation is itself the bug. A visible rename does not require an id rename `[D]` |
| Both show and pass on | **Selected items**, with one handoff group inside (share, copy, ZIP) | Leave the id |

STUDY-019 forbids putting those handoffs back as a bottom selection bar `[D]`. A handoff group, if the owner wants one, is a different control from Select all / Select none. This study does not draw that control.

## What this study could not prove

- That site leads actually send a link more often than they download a ZIP. That is `[C]` until someone watches a session.
- Which German product word the owner wants (`Teilen`, `Weitergeben`, or the current **Selected items**).
- Whether Deselect all should stay visible while detail is open. STUDY-019 already left that open.

What settles it: the owner’s answers to the five questions in the chat that filed this study.

## Update 2026-09-24 — media, not photographs

Rows 5 and 6 above say “photo”. That word is wrong `[D]`. The set is media: every file the product stores. A photograph is one kind of file. The same window, the same handoff, and the same per-item actions apply to any medium. “On the single image” was the wrong phrase. The owner’s phrase is **on the single medium** `[D]`.

Owner answers the same day `[D]`:

1. The job of this window is to pass the current set on.
2. The visible name is **Share** (de: **Teilen**). “Selected items” described the mirror. It did not describe the job.
3. Share link, copy link, the device share sheet, and ZIP all belong. Copy link sits inside share link, not as a second peer button. The device share sheet was not understood as a separate control; it is the phone or tablet system sheet (WhatsApp, Mail, and the rest) and is not a Feldpost screen.
4. Address, project, delete, and zoom stay on the single medium.
5. The internal panel id `download` does not stay. It is refactored to `share`. The ZIP action id `download` is a different word and stays on the medium menu.
