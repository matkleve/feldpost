# Settings Registry

Generated from all `## Settings` sections in `docs/element-specs/*.md`.
Do not edit manually; update element specs and run `node scripts/lint-specs.mjs --fix`.

| Section | Source Spec | What it configures |
|---------|-------------|--------------------|
| 2FA | account-page.md | enrollment defaults, factor visibility, and removal safeguards. |
| 2FA | account-settings-section.md | allowed factor types, enrollment flow defaults, assurance indicator display, and removal constraints. |
| Account & Session | settings-overlay.md | profile identity, email/password security, password recovery, 2FA setup/management, and session termination controls. |
| Custom Properties | settings-overlay.md | organization metadata key configuration defaults. |
| Data & Storage | settings-overlay.md | data retention/export/cache/storage defaults. |
| Email Change Security | account-page.md | verification requirements and pending-state copy. |
| Email Change Security | account-settings-section.md | whether dual-email confirmation is required and how pending verification is shown. |
| Export & Sharing | workspace-export-bar.md | default share-link expiration, allow token reuse vs forced regeneration, and whether native-share action is enabled on supported devices. |
| File Type Visibility | project-mixed-media-pre-spec.md | default selected media families in map/workspace/project views. |
| Fullscreen Project Mode | project-mixed-media-pre-spec.md | default entry behavior for project detail (inline pane vs fullscreen). |
| Identity Profile | account-page.md | display name edit behavior and validation. |
| Identity Profile | account-settings-section.md | display name edit policy, formatting, and save behavior. |
| Interaction & Shortcuts | settings-overlay.md | grouped keyboard shortcut reference by category, including implementation status visibility. |
| Interaction & Shortcuts | shortcut-reference-settings.md | grouped keyboard shortcut reference by category, including implementation status visibility. |
| Invite Management | qr-invite-flow.md | invite creation, acceptance, and revocation controls. |
| Invite Management | settings-overlay.md | invite creation, acceptance, revocation defaults and controls. |
| Language / Locale | language-locale-settings.md | UI language switch between English, German, and Italian with locale-specific formatting and runtime translation fallback behavior. |
| Language / Locale | settings-overlay.md | UI language and regional formatting defaults; language switch labels stay native (`English`, `Deutsch`, `Italiano`) regardless of active UI language. |
| Map Basemap | map-zone.md | sets the default map layer (`default` or `satellite`) and whether the last user choice is persisted across sessions. |
| Map Marker Motion | photo-marker.md | toggles marker fade-in and centroid glide transitions during cluster reconciliation (`Off` or `Smooth`). |
| Map Preferences | settings-overlay.md | map tile and map-behavior defaults. |
| Notifications | settings-overlay.md | preference defaults for in-app feedback and alerts. |
| Password Recovery | account-page.md | reset email behavior and redirect target. |
| Password Recovery | account-settings-section.md | reset email trigger behavior and redirect target handling. |
| Password Security | account-page.md | policy messaging and re-auth requirement handling. |
| Password Security | account-settings-section.md | change policy, re-auth requirement behavior, and minimum validation messaging. |
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
| Session | account-page.md | logout confirmation and scope behavior. |
| Session | account-settings-section.md | explicit sign-out behavior and confirmation requirements. |
| Theme | settings-overlay.md | active theme mode and persistence behavior. |
| Workspace Sort Defaults | settings-overlay.md | default sorting and ordering preferences. |
