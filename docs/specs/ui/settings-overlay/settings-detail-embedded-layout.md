# Settings detail — embedded pane layout contract

## What It Is

Normative **layout and typography contract** for any body rendered in `SettingsOverlayComponent`’s right column (`.settings-overlay__detail`) so rail switches do not change chrome, density, or hierarchy. Applies to **embedded** views (**Account** / `app-account`, **Invite Management** / `ss-invite-management-section`) and **inline** `@case` sections that use `.settings-overlay__detail-section` (lead + flat body + optional TOC).

## What It Looks Like

- **Scroll:** `.settings-overlay__detail` is the vertical scroll owner (`overflow: auto`, `min-height: 0`); embedded content must not break the overlay `max-height` chain.
- **Width:** Default **full width** of the detail column; no extra outer `max-width` / `content-clamp` unless the same pattern exists on standalone routes and is explicitly disabled when `embeddedInSettings` (or equivalent) is true.
- **Unified surface:** The **detail column** (`.settings-overlay__detail`, `background: var(--card)`) is the single chrome surface for inline preference sections. Controls sit in a **flat stack** (`.settings-overlay__detail-body` → `.settings-overlay__detail-group`); **groups** are separated by **`border-block-start`** + vertical rhythm (same idea as `.account-detail-block` top rules), **not** a nested bordered `detail-card` box per section.
- **TOC (second nav):** When a section defines anchors in `SETTINGS_SECTION_ANCHORS` (separate from the rail `SettingsSection` list), the overlay renders **`.settings-overlay__detail-toc`** immediately under `.settings-overlay__detail-lead` (or above embedded roots for **Account** / **Invite**). Entries are `type="button"` controls; they scroll matching targets into view and reuse the same transient highlight treatment as URL-driven subsection requests. Anchor DOM ids are stable: `settings-{sectionId}-{subsectionSlug}` (see `settings-section-anchors.const.ts`).
- **Invite TOC vs error:** For **Invite Management**, the overlay must **not** render the detail TOC while `ss-invite-management-section` is in **`panelMode === 'error'`** (error UI replaces the stack that carries `settings-invite-management-*` anchor ids).
- **Deep-link / TOC scroll timing:** Subsection scroll from `SettingsPaneService.subsectionRequest` runs after layout via **`afterNextRender`**. The overlay effect **must read** `AccountComponent.loading()` and `InviteManagementSectionComponent.panelMode()` as signal dependencies (not only as one-off guards) so a retry runs when account finishes loading or invite leaves error after retry. A successful scroll for a given **`requestToken`** is recorded only after **`findSubsectionElement`** returns a node (optional **rAF** retry up to two frames for paint races; rAF does not replace signal-driven retries). **Sticky TOC** in the detail scroll column remains a documented follow-up, not required for this contract.
- **Typography:** Same pairing as parent [`settings-overlay.md`](./settings-overlay.md) § *Detail typography*: `h3` / `h2` section titles (global heading metrics only on `h1`–`h6`); intro `p` in the lead block uses **`var(--font-size-xs)`** and muted color so it matches the rail row subtitle (`text-xs`); row labels (`hlmLabel`, toggle `strong`, …) = row title (sm, medium, foreground). No “flat” intro at `md` competing with row titles.
- **Controls:** Prefer overlay primitives (`settings-overlay__field-row`, `toggle-row`, `segmented`, …) or **semantically equivalent** spacing and label/control pairing. Feature blocks (QR, MFA) may extend the body; intermediate wrappers stay unstyled per `scss-ownership.mdc` unless justified.

## Where It Lives

- **Parent UI:** [`settings-overlay.component.html`](../../../../apps/web/src/app/features/settings-overlay/settings-overlay.component.html) — detail column hosts inline `@case` bodies, `<app-account [embeddedInSettings]="true" />`, and `<ss-invite-management-section />`.
- **Anchor map:** [`settings-section-anchors.const.ts`](../../../../apps/web/src/app/features/settings-overlay/settings-section-anchors.const.ts) — **`SETTINGS_SECTION_ANCHORS`** only; rail list stays in [`settings-sections.const.ts`](../../../../apps/web/src/app/features/settings-overlay/settings-sections.const.ts).
- **Overlay shell / detail column:** [`settings-overlay.component.scss`](../../../../apps/web/src/app/features/settings-overlay/settings-overlay.component.scss)
- **Account:** [`account.component.{ts,html,scss}`](../../../../apps/web/src/app/shared/account/account.component.ts) — subsection targets: `id="settings-account-…"` + `data-settings-subsection` (legacy + id).
- **Invite Management:** [`invite-management-section.component.{html,scss}`](../../../../apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.ts) — subsection targets: `id="settings-invite-management-…"` on role / QR / share blocks.

## Actions

| # | Situation | Expected behavior |
| --- | --- | --- |
| 1 | User selects **Konto** | `app-account` receives `embeddedInSettings=true`; host `account--embedded` removes outer clamp/double padding; identity uses `.account-card--identity`; each further subsection is `.account-detail-block` (rule + lead + flat `.account-detail-block__body`). Optional **TOC** above `app-account` lists account anchors; jumps scroll/highlight the matching block (`settings-account-*` ids). |
| 2 | User selects **Invite Management** | Invite header (title + subtitle + status) sits above `.invite-section__surface` card chrome; **TOC** above `ss-invite-management-section` only when anchors exist **and** the invite section is **not** in `panelMode === 'error'`; QR/share blocks expose `settings-invite-management-*` ids for jumps. |
| 3 | User opens `/settings/:section/:subsection` | `SettingsPaneService.openFromRoute` bumps `subsectionRequest`; overlay scrolls the matching anchor into view when the overlay is open and the section matches. |
| 4 | Long account or invite content | Vertical scroll appears **inside** `.settings-overlay__detail` only; overlay width/height band unchanged. |

## Component Hierarchy

```text
SettingsOverlayComponent
└── .settings-overlay__detail (scroll owner)
    ├── Inline @case sections
    │   └── .settings-overlay__detail-section
    │       ├── .settings-overlay__detail-lead (h3 + intro p)
    │       ├── .settings-overlay__detail-toc (optional; from SETTINGS_SECTION_ANCHORS)
    │       └── .settings-overlay__detail-body
    │           └── .settings-overlay__detail-group × N (border-block-start between groups)
    │               └── rows / toggles with .settings-overlay__anchor-target + stable id
    ├── .settings-overlay__detail-section--embedded (account)
    │   ├── .settings-overlay__detail-toc (optional)
    │   └── app-account [embeddedInSettings]
    │       └── .account-page … (.account-detail-block per subsection)
    └── .settings-overlay__detail-section--embedded (invites)
        ├── .settings-overlay__detail-toc (optional)
        └── ss-invite-management-section
            └── .invite-section …
```

## File Map

| Area | Code |
| --- | --- |
| Overlay shell + detail column | `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss` |
| Inline sections + TOC | `apps/web/src/app/features/settings-overlay/settings-overlay.component.html` |
| Section anchor map | `apps/web/src/app/features/settings-overlay/settings-section-anchors.const.ts` |
| Account embed | `apps/web/src/app/shared/account/account.component.{ts,html,scss}` |
| Invite embed | `apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.{html,scss}` |

## Acceptance Criteria

- [ ] Switching between **General** and **Account** / **Invite Management** does not change outer overlay width or height band; long bodies scroll inside `.settings-overlay__detail`.
- [ ] Section title → intro → (optional TOC) → controls read in the same order and weight as the reference **Map** / **General** patterns.
- [ ] No `font-size` / `font-weight` / `line-height` overrides on `h1`–`h6` in embedded feature SCSS (color / margin allowed per `apps/web/AGENTS.md`).
- [ ] `embeddedInSettings` (or documented equivalent) exists on `app-account` and is wired from the overlay.
- [ ] Inline sections do **not** ship a nested bordered **`detail-card`** duplicate of the detail column surface; grouping uses **`.settings-overlay__detail-group`** dividers only.
- [ ] **Invite Management** detail TOC is **hidden** when the invite child is in **error** panel mode (no orphan TOC against missing anchor DOM).
- [ ] **Deep-link subsection scroll** re-runs when **account** finishes loading or **invite** leaves error, and only treats a **`subsectionRequest`** token as satisfied after a DOM anchor is actually found (see timing bullets under *What It Looks Like*).
