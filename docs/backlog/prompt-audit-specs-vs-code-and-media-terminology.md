# Prompt: audit specs vs code + media terminology (img / photo / image)

Copy everything below the line into Cursor Chat, Composer, or an external model. Run from **repository root**; use the repo’s real paths.

---

**You are assisting on the Feldpost monorepo (Angular + Supabase).** Governing engineering rules: root `AGENTS.md`, spec index `docs/specs/README.md`, glossary `docs/glossary.md`. The product domain is **media** (`media_items`); user-facing and spec prose should prefer **media**, not default to photo/image, except where quoting MIME (`image/…`), raster thumbnails, camera capture, or exact API/DB/CSS identifiers.

## Objective

Produce a **prioritized list** of places where **element specs** (`docs/specs/**/*.md`) should be **refined** because:

1. **Spec ↔ code drift** — The spec describes behavior, names, or flows that **do not match** current implementation (file paths, symbol names, RPC names, component APIs, state machines).
2. **Terminology alignment (img → media)** — The spec still frames things as **photo/image/img** where it should say **media**, **media item**, **preview/thumbnail**, **Workspace Pane**, etc.; or it omits a **Symbols vs prose** note where code still uses legacy identifiers (`photoPanelOpen`, `.map-photo-marker*`, `imageReplaced$`, …).

Do **not** rewrite specs in this pass — only **inventory gaps** with enough pointers that a human can fix them later.

## Scope

| Include | Exclude |
| --- | --- |
| `docs/specs/**/*.md` | `docs/archive/**`, `docs/backlog/**`, implementation blueprints unless spec explicitly contradicts code |
| Cross-check against `apps/web/src/**/*.ts`, `apps/web/src/**/*.html`, `apps/web/src/**/*.scss` | Full verbatim dumps of large files |
| `supabase/migrations/*.sql`, `supabase/**/*.sql` when spec claims DB/RPC contracts | Rewriting production code in this task |

## Method (follow in order)

1. **Inventory terminology debt in specs** — Search under `docs/specs/` for: `photo`, `image`, `img`, `Photo`, `Image`, `IMG`, `thumbnail` (when it clearly means “media item” not “raster preview”), `picture`. For each hit, classify: **(A)** must stay (quoted symbol, MIME, column name), **(B)** should be revised to media-domain language, **(C)** needs a one-line “implementation symbol” footnote.
2. **Pick high-traffic surfaces** — At minimum reconcile specs against code for: map shell / markers (`features/map`, `core/map`), workspace pane / workspace view (`workspace-view` specs vs `core`/`features` services), media detail, upload manager / upload panel, `MediaDownloadService`, item grid / media item components.
3. **For each mismatch** — Record: spec file + section heading (or line range), what the spec claims, what code actually does (file + symbol), severity (`blocker` / `should fix` / `nice`), suggested spec edit **one sentence**.
4. **img → media** — Explicitly list specs that still say “img” or “image component” where code uses **media**-named components (`media-item`, `universal-media`, routes under `/media`, etc.) or where the glossary says **media**.

## Output format (mandatory)

Return a markdown document with:

1. **Executive summary** — ≤8 bullets: biggest drifts and terminology themes.
2. **Table** with columns: `Priority` | `Spec path` | `Section / topic` | `Gap type` (`drift` \| `terminology`) | `Evidence (code path + symbol)` | `Suggested refinement (one line)`.
3. **Terminology-only appendix** — Bullet list of spec files that need a **Terminology** or **Symbols vs product language** subsection (even if small), linked to glossary terms.
4. **Out of scope / needs human decision** — RPC rename (`cluster_images`), DB `image_id` compat, CSS BEM prefix renames — list specs that mention these so they stay consistent with `docs/backlog/media-photo-symbol-rename-roadmap.md` if applicable.

Be honest when you cannot verify without running the app — mark as **unverified** and name the test or manual check needed.

---

_End of prompt._
