# Settings Registry

Generated from all `## Settings` sections in `docs/element-specs/*.md`.
Do not edit manually; update element specs and run `node scripts/lint-specs.mjs --fix`.

| Section | Source Spec | What it configures |
|---------|-------------|--------------------|
| Account & Profile | settings-overlay.md | profile identity fields and account-level controls. |
| Custom Properties | settings-overlay.md | organization metadata key configuration defaults. |
| Data & Storage | settings-overlay.md | data retention/export/cache/storage defaults. |
| Export & Sharing | workspace-export-bar.md | default share-link expiration, allow token reuse vs forced regeneration, and whether native-share action is enabled on supported devices. |
| File Type Visibility | project-mixed-media-pre-spec.md | default selected media families in map/workspace/project views. |
| Fullscreen Project Mode | project-mixed-media-pre-spec.md | default entry behavior for project detail (inline pane vs fullscreen). |
| Invite Management | qr-invite-flow.md | invite creation, acceptance, and revocation controls. |
| Invite Management | settings-overlay.md | invite creation, acceptance, revocation defaults and controls. |
| Language / Locale | language-locale-settings.md | UI language switch between English and German plus regional formatting defaults. |
| Language / Locale | settings-overlay.md | UI language and regional formatting defaults. |
| Map Basemap | map-zone.md | sets the default map layer (`default` or `satellite`) and whether the last user choice is persisted across sessions. |
| Map Marker Motion | photo-marker.md | toggles marker fade-in and centroid glide transitions during cluster reconciliation (`Off` or `Smooth`). |
| Map Preferences | settings-overlay.md | map tile and map-behavior defaults. |
| Notifications | settings-overlay.md | preference defaults for in-app feedback and alerts. |
| Project Color Palette | project-color-picker.md | temporary one-click random brand-hue generation (`brand-hue-###`) derived from brand orange by varying hue. |
| Project Color Palette | projects-page.md | enabled semantic project color options and default fallback color. |
| Projects View Mode | projects-page.md | default layout mode (`list` or `cards`) and persistence behavior. |
| QR Invite Preferences | qr-invite-flow.md | default target role, auto-generate-on-open behavior, invite expiration window, and enabled share channels. |
| QR Invite Preferences | settings-overlay.md | default role, auto-generation behavior, expiration policy, and allowed share channels for QR invites. |
| Roles & Permissions | settings-overlay.md | role-based capability visibility and access constraints. |
| Search Tuning | search-tuning-settings.md | address and place search filters, weights, penalties, and retry thresholds. |
| Search Tuning | settings-overlay.md | address/place search filters, ranking weights, penalties, and retry behavior. |
| Section Rules | project-mixed-media-pre-spec.md | max sections per project, empty-section auto-collapse, and deletion confirmation mode. |
| Selection Bulk Actions | workspace-export-bar.md | default delete confirmation behavior, whether address-change requires non-empty validation, and which project targets are shown first (recent vs alphabetical). |
| Theme | settings-overlay.md | active theme mode and persistence behavior. |
| Workspace Sort Defaults | settings-overlay.md | default sorting and ordering preferences. |
