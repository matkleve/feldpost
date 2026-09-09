# Feldpost – Design Constitution

Load this file for every visual or product implementation task. These rules are non-negotiable.

## The User

- Design for the field technician first: sunlight, dirty gloves, one-handed use, and repeated daily workflows.
- If a UI pattern fails for outdoor mobile use, it fails the product.

## The Interface

- The map is the primary canvas. Panels, sheets, and detail views serve the map rather than replacing it.
- Progressive disclosure is mandatory: show essentials first, reveal complexity on demand.
- Quiet actions are the default: secondary controls stay hidden until hover, focus, selection, or explicit mode change.

## Sizes & Touch

Touch targets scale with browser font size. The minimum depends on **where the
control lives**, because the two surfaces are used by different hands.

- **Field surfaces — anything used on site.** Map controls and markers, upload
  and capture, primary dialog actions, the nav: mobile at least
  `3rem × 3rem (48×48px)`, desktop at least `2.75rem × 2.75rem (44×44px)`. This
  is the rule the product exists for and it is not negotiable there. A visually
  smaller control is fine only when padding or a transparent hit zone brings the
  real hit area up to that size — `size="icon"` is 40px, so it does **not** reach
  it on its own.
- **Dense desktop chrome.** Rail rows and their actions, toolbar triggers,
  workspace-pane controls: at least `1.5rem × 1.5rem (24×24px)`, **and** no other
  target inside a 24px-diameter circle centred on it. Below that size, or
  crowded, fails.
- **Why two numbers.** 44/48px is WCAG **AAA** (SC 2.5.5) and platform guidance
  (Apple 44pt, Material 48dp). The **AA** requirement is 24×24px with that
  spacing condition (SC 2.5.8, WCAG 2.2). Everything the product ships clears
  AA; the field surfaces additionally hold themselves to AAA, because a gloved
  hand in sunlight is not an accessibility edge case here, it is the primary
  user.
- Layout dimensions, control heights, and spacing follow the rem-first sizing
  rules in the design token files.

> **Amended 2026-09-08.** This section previously required 44/48px everywhere,
> with no surface distinction. That was never true of the product — `size="icon"`
> (40px) is used 78 times, `icon-sm` (32px) and `icon-xs` (24px) in the rails —
> while the surfaces that genuinely need it (upload shell, map-shell upload, nav,
> dialogs, workspace-pane footer, panel trigger) already declare a 44/48px
> minimum in their SCSS. The old text made a non-negotiable out of a rule nothing
> followed, which invites a future reader to "fix" deliberate dense chrome.
> Owner decision, 2026-09-08: dense desktop chrome may sit at the AA floor.
> Background: [`docs/audits/2026-09-08-design-system-adoption.md`](../audits/2026-09-08-design-system-adoption.md) § A6.

## Color

- Use warm neutrals, not sterile grays or cold blue-blacks.
- The product's own data layer must always be more visually prominent than the base map.
- `--color-clay` is the reserved warm accent for meaningful emphasis, not decoration.

## Buttons

- Filled buttons are reserved for primary actions.
- Secondary actions use ghost buttons.
- Tertiary actions use text-only treatments.
- Correct placement and labeling matter more than decorative emphasis.

## Honesty

- Show corrected locations, active filters, partial loads, and upload failures explicitly.
- Do not present provisional or filtered data as complete.

## Calm

- The interface should feel restrained, not loud.
- Prefer skeletons over spinners, short transitions over flashy animation, and plain language over system jargon.

## Dark Mode

- Dark mode is first-class and uses warm near-black surfaces.
- All components must work in both light and dark themes using tokens, not hardcoded colors.

## Accessibility

- Keyboard navigation, visible focus states, semantic labels, and WCAG AA contrast are baseline requirements.
- Color is never the sole state indicator.

## What Stays In Px

- Borders, outlines, shadows, and other precision strokes stay in px because scaling them with browser font size adds blur rather than accessibility.
- Image display sizes and image-resolution thresholds stay in px because they are media/rendering constraints, not interactive UI dimensions.

## Reference Files Index

- `docs/design/README.md` — always-load index file with principles, dark mode, accessibility, responsive summary, and design debt.
- `docs/design/tokens.md` — colors, typography, sizing, radius, shadows, iconography.
- `docs/design/token-layers.md` — canonical Layer A/B/C token architecture and override policy.
- `docs/design/map-system.md` — map hierarchy, marker prominence, clustering, and proximity rules.
- `docs/design/layout.md` — breakpoint behavior, panel dimensions, and responsive layout.
- `docs/design/motion.md` — animation timing and transition rules.
- `docs/design/state-visuals.md` — canonical shared visuals for disabled, focus, and other cross-cutting control states.
- `docs/design/components/*.md` — task-specific component contracts.
- Historical reference products can be reviewed manually as last-resort context; do not load archived docs in agentic coding sessions.
