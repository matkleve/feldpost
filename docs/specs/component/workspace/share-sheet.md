# Share sheet

> **Opens from:** the Share panel, after the current media set is non-empty.  
> **Replaces as creation UI:** [share-link-audience-dialog.md](share-link-audience-dialog.md). That dialog stays mounted until this sheet ships.  
> **Access rules:** [share-set-access-model.md](../../service/share-set/share-set-access-model.md). This sheet does not add an audience.

## What It Is

The desktop handoff for the current media set. Two bands, in the same order as the iPhone sheet: people first, then methods. It is not a flat action list. The phone does not show this sheet. The phone opens the system sheet, which already has that order.

The set is any media file.

## What It Looks Like

One panel, same chrome as the media right-click menu (`option-menu-surface`). Two bands:

1. **People.** A short horizontal row of round faces (at most six organization members, not the current user). A search field opens a dropdown list of matching members. Tapping a face creates a `named` share set for that user id.
2. **Methods.** A horizontal row of ways the link leaves the company: Copy link, Email, WhatsApp, and System share when `navigator.share` exists.

There is no external address book. An outside person is not a face in the people band. They receive a `public` link through a method. A stored external contact is out of scope.

## Where It Lives

- **Spec:** this file.
- **Code:** `apps/web/src/app/shared/share-sheet/`.
- **Host:** Share panel (`panelId="share"`).

## Actions

| # | User action | System response |
| --- | --- | --- |
| 1 | Opens Share on desktop with a set | Sheet opens. A short face row loads. Search filters the member list in a dropdown. |
| 2 | Taps an internal person | `createOrReuseShareSet` with `audience: named` and that user id. |
| 3 | Taps Copy link | `audience: public`, then the URL is copied. |
| 4 | Taps Email | `audience: public`, then the mail app opens with the URL in the body. |
| 5 | Taps WhatsApp | `audience: public`, then WhatsApp opens with the URL. |
| 6 | Taps System share | `audience: public`, then `navigator.share` with the URL. Hidden when the browser has no share sheet. |
| 7 | Opens Share on a phone | This sheet does not open. The system sheet opens after a `public` link is created. |
| 8 | Dismisses the sheet | No link is created. |

ZIP is not a method. It downloads files and does not hand the set to a person.

## Component Hierarchy

```text
app-share-sheet
├── people band
│   ├── round faces (at most six)
│   └── search dropdown
└── methods band (copy, email, WhatsApp, system share)
```

## Data

| Source | Contract | Operation |
| --- | --- | --- |
| Organization members | user id + display name | Read, people band |
| `ShareSetService.createOrReuseShareSet` | `public` or `named` | Write on a tap |
| `navigator.share` | URL | Call, system-share row only |

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Sheet | `app-share-sheet` | sheet host | both bands | `.share-sheet` | content `0` | two bands, people above methods |
| Person | one face button | people band | that face | `.share-sheet__person` | content `0` | organization member, named link |
| Method | one method button | methods band | that button | `.share-sheet__method` | content `0` | public link, except system share hides when unavailable |

## Acceptance Criteria

- [x] Desktop Share opens this sheet, not a single column of text rows.
- [x] People band shows at most six round faces, and search opens a dropdown list. A tap creates a `named` set.
- [x] No external face is shown. External handoff is a method with a `public` link.
- [x] Methods are Copy link, Email, WhatsApp, and System share when the browser has it.
- [x] Phone Share does not mount this sheet.
- [x] Empty selection does not open the sheet.
