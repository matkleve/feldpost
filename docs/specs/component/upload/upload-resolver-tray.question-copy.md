# Upload resolver tray — question copy contract

> **Parent:** [upload-resolver-tray.md](./upload-resolver-tray.md)

## Principle

The tray is a **questionnaire**, not a settings panel. Every active card has:

1. **Section chrome** — `Address resolver` (what system is asking).
2. **One `h2` question** — natural language, typed by resolution scenario.
3. **Optional folder path** — icon + path only; meaning via **`title` / `aria-label`** (e.g. “Upload folder: …”) — **no** visible “Folder” caption.
4. **Numbered answers** — options that complete the question (keyboard `1`–`9`).
5. **Affected-media chip** — `{count} media` (not “photos” / “files”); click opens dropdown; native tooltip on chip.
6. **Footer** — Skip (defer) + Continue (apply).

Product vocabulary: **media** (upload jobs), not “photos”, unless the file type is literally a photo in copy elsewhere.

Generic headlines (“Resolver tray active headline”, “Which address is correct?” without context) are **forbidden**.

## Question matrix (normative)

| Trigger | Question key | English template | Option labels |
| --- | --- | --- | --- |
| `collapseStage: city` / Step **1A** | `upload.resolver.question.city` or `upload.resolver.question.cityStep` | Which city is **{street}** in? | **2–5 numbered city names** (`candidate.city` or `citySuggestions`); free-text input only when no options (`answerKind: text`, rare) |
| `collapseStage: partial` (default geocode) | `upload.resolver.question.address` | Which **{address}** do you mean? | Full `addressLabel` |
| `collapseStage: per_file` | `upload.resolver.question.door` | What's the door number for **{street}**? | Door/unit labels — see [Answer UI variants](#answer-ui-variants) |
| `disambiguationKind: source` | `upload.resolver.question.source` | Photo GPS is far from the folder name ({distance}). Which location should we use? | Folder / photo location / both / none (no score bars) |
| `disambiguationKind: context_distance` | `upload.resolver.question.contextDistance` | Is this photo in the right project area? | Prompt B (search + confirm) — not numbered list MVP |

`{street}` = first comma-separated segment of `titleAddress` (e.g. `Musterstrasse 12` from `Musterstrasse 12, 8001 Zürich`).

`{address}` = full `titleAddress` for the group.

Implementation: `resolverQuestionKeyForGroup()` + `upload-resolver-translation.catalog.ts` (catalog wins over DB for EN/DE).

## Answer UI variants

| Scenario | MVP tray | Planned |
| --- | --- | --- |
| City / full address / source | Numbered list (Cursor-style) | — |
| Door / unit (`per_file`) | Numbered list of candidate labels | **Grid of door numbers** or **compact numeric input** when candidates are not a flat list |

Door-number UX is specified here so product copy (`question.door`) and engineering stay aligned; grid/input is **not** MVP in `upload-resolver-tray.md` acceptance criteria.

## Affected-media chip

- Chip text: `upload.resolver.mediaCount` → `{count} media`.
- Chip `title` / `aria-label`: `upload.resolver.media.chip.title` (native hover tooltip + screen readers).
- Dropdown: scrollable list of job file names; each row has **Ask later**.
- **Ask later** calls `isolateJobFromGroup` — removes the job from the current group, registers a dedicated card for later, and **keeps the tray on the current question** (no carousel jump).

## Accessibility

- Region: `aria-labelledby` → section label id + question `h2` id.
- Folder row: `title` + `aria-label` only (no visible prefix).
- Media chip: `aria-expanded`, `aria-haspopup="menu"`, menu `aria-label`.
- Each option: `aria-label` = `Option {n}: {label}[, {score} match]`.

## Acceptance criteria

- [x] Mock group 1 (`city`) shows question “Which city is Musterstrasse 12 in?” and city options (`mockResolverTray` dev flag).
- [x] Resolver UI copy uses `upload-resolver-translation.catalog.ts` for catalog keys (not stale DB context strings).
- [x] Spec matrix above matches `upload-resolver-tray.helpers.ts` + catalog.
