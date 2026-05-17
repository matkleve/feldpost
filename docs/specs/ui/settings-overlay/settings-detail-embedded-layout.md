# Settings detail — embedded pane layout contract

## What It Is

Normative **layout and typography contract** for any body rendered in `SettingsOverlayComponent`’s right column (`.settings-overlay__detail`) so rail switches do not change chrome, density, or hierarchy. Applies to **embedded** views (**Account** / `app-account`, **Invite Management** / `ss-invite-management-section`) and complements inline `@case` sections that use `.settings-overlay__detail-section` (lead + `settings-overlay__detail-card`).

## What It Looks Like

- **Scroll:** `.settings-overlay__detail` is the vertical scroll owner (`overflow: auto`, `min-height: 0`); embedded content must not break the overlay `max-height` chain.
- **Width:** Default **full width** of the detail column; no extra outer `max-width` / `content-clamp` unless the same pattern exists on standalone routes and is explicitly disabled when `embeddedInSettings` (or equivalent) is true.
- **Card:** For **inline** settings `@case` sections and **Invite**, section title + intro sit **above** the bordered surface (`.settings-overlay__detail-lead` / invite header). **Account** subsections (Profil, Anmeldung, …) use the same lead pattern but **no** outer bordered card: `.account-detail-block` carries a **top rule** only; `.account-detail-block__body` is a flat flex stack. Bordered chrome for inline sections = `settings-overlay__detail-card` (tokens for radius, border, `bg-card`, padding).
- **Typography:** Same pairing as parent [`settings-overlay.md`](./settings-overlay.md) § *Detail typography*: `h3` / `h2` section titles (global heading metrics only on `h1`–`h6`); intro `p` in the lead block uses **`var(--font-size-xs)`** and muted color so it matches the rail row subtitle (`text-xs`); row labels (`hlmLabel`, toggle `strong`, …) = row title (sm, medium, foreground). No “flat” intro at `md` competing with row titles.
- **Controls:** Prefer overlay primitives (`settings-overlay__field-row`, `toggle-row`, `segmented`, …) or **semantically equivalent** spacing and label/control pairing. Feature blocks (QR, MFA) may extend the card; intermediate wrappers stay unstyled per `scss-ownership.mdc` unless justified.

## Where It Lives

- **Parent UI:** [`settings-overlay.component.html`](../../../../apps/web/src/app/features/settings-overlay/settings-overlay.component.html) — detail column hosts `<app-account [embeddedInSettings]="true" />` and `<ss-invite-management-section />`.
- **Overlay shell / detail column:** [`settings-overlay.component.scss`](../../../../apps/web/src/app/features/settings-overlay/settings-overlay.component.scss)
- **Account:** [`account.component.{ts,html,scss}`](../../../../apps/web/src/app/shared/account/account.component.ts)
- **Invite Management:** [`invite-management-section.component.{html,scss}`](../../../../apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.ts)

## Actions

| # | Situation | Expected behavior |
| --- | --- | --- |
| 1 | User selects **Konto** | `app-account` receives `embeddedInSettings=true`; host `account--embedded` removes outer clamp/double padding; identity uses `.account-card--identity`; each further subsection is `.account-detail-block` (rule + lead + flat `.account-detail-block__body`). |
| 2 | User selects **Invite Management** | Invite header (title + subtitle + status) sits above `.invite-section__surface` card chrome; intro/label typo contract unchanged; no `max-w-*` band narrower than the detail column. |
| 3 | Long account or invite content | Vertical scroll appears **inside** `.settings-overlay__detail` only; overlay width/height band unchanged. |

## Component Hierarchy

```text
SettingsOverlayComponent
└── .settings-overlay__detail (scroll owner)
    ├── Inline @case sections
    │   └── .settings-overlay__detail-section
    │       ├── .settings-overlay__detail-lead (h3 + intro p)
    │       └── .settings-overlay__detail-card (bordered controls)
    ├── app-account [embeddedInSettings]
    │   └── .account-page
    │       ├── .account-card--identity (hero)
    │       └── .account-detail-block × N (border-block-start rule)
    │           ├── .account-detail-block__lead (h2 + intro p)
    │           └── .account-detail-block__body (flat controls)
    └── ss-invite-management-section
        └── .invite-section
            ├── header (h3 + intro p + optional status)
            └── .invite-section__surface (bordered: stack + inline errors)
                └── .invite-section__stack (role / QR / share)
```

## File Map

| Area | Code |
| --- | --- |
| Overlay shell + detail column | `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss` |
| Inline sections | `apps/web/src/app/features/settings-overlay/settings-overlay.component.html` |
| Account embed | `apps/web/src/app/shared/account/account.component.{ts,html,scss}` |
| Invite embed | `apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.{html,scss}` |

## Acceptance Criteria

- [ ] Switching between **General** and **Account** / **Invite Management** does not change outer overlay width or height band; long bodies scroll inside `.settings-overlay__detail`.
- [ ] Section title → intro → controls read in the same order and weight as a reference inline section (e.g. **Map Preferences**).
- [ ] No `font-size` / `font-weight` / `line-height` overrides on `h1`–`h6` in embedded feature SCSS (color / margin allowed per `apps/web/AGENTS.md`).
- [ ] `embeddedInSettings` (or documented equivalent) exists on `app-account` and is wired from the overlay.
