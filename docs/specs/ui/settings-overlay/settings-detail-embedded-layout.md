# Settings detail — embedded pane layout contract

## What It Is

Normative **layout and typography contract** for any body rendered in `SettingsOverlayComponent`’s right column (`.settings-overlay__detail`) so rail switches do not change chrome, density, or hierarchy. Applies to **embedded** views (**Account** / `app-account`, **Invite Management** / `ss-invite-management-section`) and complements inline `@case` sections that use `settings-overlay__detail-card` directly.

## What It Looks Like

- **Scroll:** `.settings-overlay__detail` is the vertical scroll owner (`overflow: auto`, `min-height: 0`); embedded content must not break the overlay `max-height` chain.
- **Width:** Default **full width** of the detail column; no extra outer `max-width` / `content-clamp` unless the same pattern exists on standalone routes and is explicitly disabled when `embeddedInSettings` (or equivalent) is true.
- **Card:** One primary bordered surface per rail selection: `rounded-lg`, `border-border`, `bg-card`, padding matching overlay detail cards (`p-6` / token equivalent), inner vertical `gap` of **`var(--spacing-2)`** (Tailwind `gap-2`) between major blocks.
- **Typography:** Same pairing as parent [`settings-overlay.md`](./settings-overlay.md) § *Detail typography*: `h3` section titles (global heading metrics only on `h1`–`h6`); first intro `p` after the title = secondary body (sm, normal, reading line-height, muted); row labels (`hlmLabel`, toggle `strong`, …) = row title (sm, medium, foreground). No “flat” intro at `md` competing with row titles.
- **Controls:** Prefer overlay primitives (`settings-overlay__field-row`, `toggle-row`, `segmented`, …) or **semantically equivalent** spacing and label/control pairing. Feature blocks (QR, MFA) may extend the card; intermediate wrappers stay unstyled per `scss-ownership.mdc` unless justified.

## Where It Lives

- **Parent UI:** [`settings-overlay.component.html`](../../../../apps/web/src/app/features/settings-overlay/settings-overlay.component.html) — detail column hosts `<app-account [embeddedInSettings]="true" />` and `<ss-invite-management-section />`.
- **Overlay shell / detail column:** [`settings-overlay.component.scss`](../../../../apps/web/src/app/features/settings-overlay/settings-overlay.component.scss)
- **Account:** [`account.component.{ts,html,scss}`](../../../../apps/web/src/app/shared/account/account.component.ts)
- **Invite Management:** [`invite-management-section.component.{html,scss}`](../../../../apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.ts)

## Actions

| # | Situation | Expected behavior |
| --- | --- | --- |
| 1 | User selects **Konto** | `app-account` receives `embeddedInSettings=true`; host `account--embedded` removes outer clamp/double padding; cards use overlay-aligned `gap`. |
| 2 | User selects **Invite Management** | Invite root matches card chrome and intro/label typo contract; no `max-w-*` band narrower than the detail column. |
| 3 | Long account or invite content | Vertical scroll appears **inside** `.settings-overlay__detail` only; overlay width/height band unchanged. |

## Component Hierarchy

```text
SettingsOverlayComponent
└── .settings-overlay__detail (scroll owner)
    ├── app-account [embeddedInSettings]
    │   └── .account-page / .account-card × N
    └── ss-invite-management-section
        └── .invite-section (card root)
            ├── header (h3 + intro p + optional status)
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
