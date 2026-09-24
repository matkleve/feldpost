# Upload Panel — Folder-shape tips

> **Parent:** [upload-panel.md](upload-panel.md) action 4h
> **Why this file exists:** there is no tips component and no tips spec. The only hover copy on intake today is `upload.folder.unsupported.hint` (folder button, only while folder import is disabled) and `upload.archive.import.hint` (archive button). The recommendation list belongs on the folder button.

## What it is

A hover list on the enabled **Upload folder** control. It recommends a folder shape. It does not reject, rewrite, or gate any other shape. Flat dumps, street-only folders, and archives still submit.

## Where it shows

| State | What the user sees |
| --- | --- |
| Folder import supported, pointer over **Upload folder** | The recommendation list below |
| Folder import not supported | The existing `upload.folder.unsupported.hint` only. The list is not shown. |
| **Import archive** | Unchanged. It keeps `upload.archive.import.hint`. |

The list is more than one line, so it does not go in the native `title` attribute. The list is a `role="tooltip"` on the folder button. `app-popover` stays unused here: its `brnPopoverContent` host requires a popover trigger and breaks sibling row bindings when mounted inside the intake block. Do not add a tips component.

## The list

English is the source text. Register the keys in `docs/i18n/translation-workbench.csv` when the hover is built, not before. Intro plus five lines, in this order:

| Key | English |
| --- | --- |
| `upload.folder.shape.tip.intro` | Any folder is fine. This shape is read most reliably: |
| `upload.folder.shape.tip.building` | One folder per building: City / postcode / Street number / files. |
| `upload.folder.shape.tip.city` | The city is one folder, spelled as one place name. A name with more than one word stays one folder (`Wiener Neustadt`, `St. Pölten`, `Krems an der Donau`). |
| `upload.folder.shape.tip.street` | Street and house number share that building folder (`Hauptstraße 5`). |
| `upload.folder.shape.tip.copies` | A Windows copy suffix such as `(1)` on a folder name is ignored. |
| `upload.folder.shape.tip.spelling` | Use one spelling for a city. `Klagenfurt` and `Klagenfurt am Wörthersee` are the same place. |

The intro says "most reliably". It must not say every line already resolves with no question. [STUDY-016](../../../study/016-upload-flow-scale-and-folder-shapes.md) measured that `Wiener Neustadt`, `St. Pölten`, and `Krems an der Donau` are split by the tokenizer, and that `Klagenfurt` plus postcode `9020` opens one city question. Those two lines are the shape to aim for. They become true after [STUDY-017](../../../study/017-upload-scale-action-plan.md) steps 1 and 2. Until then the hover may still show them, as a recommendation.

`stripWindowsCopySuffix` already removes a trailing `(N)` (`path-token-classifier.ts`). The copies line matches current behaviour.

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Recommendation list | `.upload-panel__folder-shape-tip` | intake area (`position: relative`) | **Upload folder** button | `.upload-panel__intake-btn--folder` | z-index 300, no new token | Hover while folder import works shows the six strings. Disabled folder button shows `upload.folder.unsupported.hint` and not the list. A flat folder still submits. |

Geometry of the list stays on the popover. The button does not grow to fit the list.

## Acceptance

- [ ] Hover on the enabled folder button shows the intro and the five lines, in the order above.
- [ ] A disabled folder button still shows only `upload.folder.unsupported.hint`.
- [ ] Submitting a folder that does not match the list still creates jobs.
- [ ] The six keys are in the translation workbench with `en` / `de` / `it` when the hover ships.
