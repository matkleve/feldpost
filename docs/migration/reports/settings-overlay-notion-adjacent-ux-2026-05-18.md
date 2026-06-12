# Settings overlay — Notion- / Linear-adjacent UX patterns (desk research)

**Date:** 2026-05-18  
**Scope:** How products in a similar “calm productivity / craft” family treat **preferences & account** UI, and what that implies for Feldpost’s **Settings overlay** + embedded **Account** view.  
**Sources:** Public help centers, Linear “Now” article, Slack design articles, Feldpost code/specs as of this date (not a pixel audit of live Notion).

---

## 1. How to describe this design philosophy (short)

These products share a **settings-as-product-surface** mindset, not “a dumping ground for failed defaults”:

| Theme | What it usually means in UI |
| --- | --- |
| **Calm density** | Plenty of whitespace or predictable row rhythm; few competing boxes. |
| **Split navigation** | Left: stable section list. Right: one scrolling **detail** for the selected section (Slack’s two-step sidebar; Notion’s settings entry from workspace menu; Linear’s Account / Workspace areas). |
| **Flat hierarchy** | Prefer **one primary surface** in the detail pane with **rows** (label + control), not stacks of nested cards. |
| **Separation without frames** | **Hairlines / inset dividers** between groups instead of a bordered rectangle around every block. |
| **Comfort & education** | Linear explicitly reframes settings as a place users **enjoy** tuning and **learn** the product (tooltips, “settings homepage”, tutorials in-context) — “settings are not a design failure.” |
| **Alignment discipline** | Controls (toggles, segments) **align on one vertical axis** on the right; titles and descriptions read as a column on the left — reduces “wobbly” layouts. |

**Notion (from public help, not UI teardown):** Settings are reached from the workspace area; account covers profile, email, password, security in a **structured preferences** model — typically presented as **scannable sections** rather than “dashboards of cards.”

**Slack (redesign narrative):** Emphasizes **focused modes** and **two-column navigation** so users aren’t overwhelmed — relevant to our **rail + detail** overlay, not to card chrome per row.

**Linear (Linear Now, 2022):** Strong product stance: settings should feel **cozy**, support **deeper customization** over time, and double as **onboarding / education** — implies **copy, hierarchy, and empty states** matter as much as chrome.

---

## 2. What Feldpost does today (post–account flattening)

| Area | Current pattern |
| --- | --- |
| **Overlay shell** | Fixed pane, rail + detail, glassy popover background, shadow boosted for map readability. |
| **Inline sections** (General, Map, …) | **Title + intro above** a **bordered `settings-overlay__detail-card`** wrapping controls. |
| **Account (embedded)** | **One identity card**; further subsections = **top rule + lead + flat body** (no inner card). |
| **Invite** | Header above **one bordered surface** for role/QR/share. |

So: **Account** already moved toward the “hairline + flat body” philosophy; **inline settings** still lean **card-per-section** in the detail column.

---

## 3. Gap analysis vs. that philosophy

| Pattern | Notion-/Linear-adjacent expectation | Feldpost today | Gap |
| --- | --- | --- | --- |
| **Frames in detail** | One continuous “form surface” or very subtle panel; dividers between **groups** | Bordered **card** per inline section | Reads as heavier / more “boxed” than reference apps. |
| **Account vs. rest** | Same **row grammar** across the product | Account body is flat; other sections are card-wrapped | **Inconsistent mental model** inside one overlay. |
| **Section chrome** | Often **typographic section label** + rows (sometimes `uppercase` / `tracking` small labels) | We use **h3 + paragraph** + card | Fine structurally; **card** is the main mismatch. |
| **Destructive / danger** | Usually a **row** or end-of-list block with red text/button, not a second tinted container | We removed tinted delete card ✅; still **session** is just a button under copy — OK | Low gap if row height matches other sections. |
| **Education** | Tips, links to docs in settings | Mostly absent | Optional; aligns with Linear’s “settings as onboarding” if desired later. |

---

## 4. Recommended changes (prioritized)

### P0 — Visual consistency in the detail column

1. **Pick one “detail grammar”** for all rail-selected bodies:
   - **Option A (closest to iOS Settings / many SaaS):** Single **full-width detail surface** (match `--card` or a hairline-bounded panel), **no inner `detail-card` border**; use **`border-block` dividers** between **control groups** (e.g. language + density as one group vs. two rows with one divider).
   - **Option B (keep card):** Re-introduce a **light** inner card for **Account bodies** so every section feels “boxed” again — **not** recommended if the goal is Notion-like calm.

2. **Align inline sections with Account:** If Option A, **remove or soften** `.settings-overlay__detail-card` (border + radius) and move to **row stack + dividers** reusing the same primitives as account (`hr` / `border` tokens), so **Map / General / …** and **Account** share one pattern.

### P1 — Hierarchy & rhythm

3. **Section labels:** Consider a **single typographic system** for “section title” in detail: either keep **h3** but tighten spacing to **reference row rhythm**, or add an optional **small-caps / `text-xs` uppercase** “GROUP LABEL” row above the first control (common in craft tools — verify with design before shipping).

4. **Row height & alignment:** Define one **`min-height` / vertical padding token** for settings rows (toggle + field) so the right column **lines up** across sections (Linear-style discipline).

### P2 — Product / content

5. **Microcopy & learnability:** Short “why this matters” lines under risky toggles; optional **“Learn more”** links for map/search (Linear-style education) — needs i18n pipeline.

6. **Sticky context (optional):** On long account or invite scrolls, sticky subsection title is rare in web settings but appears in some native apps — only if user research asks for it.

---

## 5. Concrete code/spec touchpoints (if implementing P0)

| Artifact | Likely change |
| --- | --- |
| `settings-overlay.component.html` | Replace per-section **`detail-card`** wrapper with a **shared detail shell** + **group** wrappers or dividers between groups. |
| `settings-overlay.component.scss` | Move chrome from **`.settings-overlay__detail-card`** to **`.settings-overlay__detail`** (or a new `.settings-overlay__detail-surface`) + add **`.settings-overlay__detail-divider`**. |
| `account.component.*` | Already flattened; may need **token alignment** with new global row/divider classes. |
| `docs/specs/ui/settings-overlay/settings-detail-embedded-layout.md` | Update “Card” bullet to describe **unified surface + dividers** once chosen. |

---

## 6. Summary

The “Notion / Linear family” feeling comes less from **literal copying** of Notion’s pixels and more from: **split nav**, **flat grouped lists**, **hairline separation**, **aligned controls**, and treating settings as a **comfortable, legible** surface. Feldpost’s overlay **structure** already matches the split-nav pattern; the main mismatch is **card-heavy inline detail** vs **flatter account**. **Unifying** the detail column on **one surface + dividers** (P0) is the highest-leverage change toward that philosophy.

---

## References (web)

- Linear — *Settings are not a design failure* (product philosophy): https://linear.app/now/settings-are-not-a-design-failure  
- Linear — Changelog / preferences docs (workspace vs account structure): https://linear.app/changelog/2024-12-18-personalized-sidebar , https://linear.app/docs/account-preferences  
- Notion — Account settings & preferences (feature scope): https://www.notion.com/help/account-settings  
- Slack — Focused productivity / sidebar patterns: https://slack.design/articles/a-more-focused-productive-slack/  
