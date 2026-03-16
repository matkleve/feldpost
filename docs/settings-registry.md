# Settings Registry

Generated from all `## Settings` sections in `docs/element-specs/*.md`.
Do not edit manually; update element specs and run `node scripts/lint-specs.mjs --fix`.

| Section | Source Spec | What it configures |
|---------|-------------|--------------------|
| Account & Profile | settings-overlay.md | profile identity fields and account-level controls. |
| Custom Properties | settings-overlay.md | organization metadata key configuration defaults. |
| Data & Storage | settings-overlay.md | data retention/export/cache/storage defaults. |
| Invite Management | qr-invite-flow.md | one-time invite generation, default target role, expiration window, revoke behavior, and share channel availability. |
| Invite Management | settings-overlay.md | invite creation, acceptance, revocation defaults and controls. |
| Language / Locale | settings-overlay.md | UI language and regional formatting defaults. |
| Map Marker Motion | photo-marker.md | toggles marker fade-in and centroid glide transitions during cluster reconciliation (`Off` or `Smooth`). |
| Map Preferences | settings-overlay.md | map tile and map-behavior defaults. |
| Notifications | settings-overlay.md | preference defaults for in-app feedback and alerts. |
| Project Color Palette | project-color-picker.md | temporary one-click random brand-hue generation (`brand-hue-###`) derived from brand orange by varying hue. |
| Project Color Palette | projects-page.md | enabled semantic project color options and default fallback color. |
| Projects View Mode | projects-page.md | default layout mode (`list` or `cards`) and persistence behavior. |
| Roles & Permissions | settings-overlay.md | role-based capability visibility and access constraints. |
| Search Tuning | search-tuning-settings.md | address and place search filters, weights, penalties, and retry thresholds. |
| Search Tuning | settings-overlay.md | address/place search filters, ranking weights, penalties, and retry behavior. |
| Theme | settings-overlay.md | active theme mode and persistence behavior. |
| Workspace Sort Defaults | settings-overlay.md | default sorting and ordering preferences. |
