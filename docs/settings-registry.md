# Settings Registry

Generated from all `## Settings` sections in `docs/element-specs/**/*.md` (excluding README and audit docs).
Do not edit manually; update element specs and run `node scripts/lint-specs.mjs --fix`.

| Section | Source Spec | What it configures |
|---------|-------------|--------------------|
| 2FA | ui/settings-overlay/account-page.md | enrollment defaults, factor visibility, and removal safeguards. |
| 2FA | ui/settings-overlay/account-settings-section.md | allowed factor types, enrollment flow defaults, assurance indicator display, and removal constraints. |
| Account & Session | ui/settings-overlay/settings-overlay.md | profile identity, email/password security, password recovery, 2FA setup/management, and session termination controls. |
| Address Auto-Assign Threshold | service/location-path-parser/location-path-parser.md | Probability threshold (default `0.95`) above which the top-ranked city is selected automatically. |
| Address Disambiguation Strategy | service/location-path-parser/location-path-parser.md | Selects ranking mode (`cluster-majority`, `distance-weighted`, `bayesian-context`) for ambiguous street+house matches. |
| Address Review Lower Bound | service/location-path-parser/location-path-parser.md | Probability lower bound (default `0.70`) below which an issue is emitted instead of soft review. |
| Custom Properties | ui/settings-overlay/settings-overlay.md | organization metadata key configuration defaults. |
| Data & Storage | ui/settings-overlay/settings-overlay.md | data retention/export/cache/storage defaults. |
| Email Change Security | ui/settings-overlay/account-page.md | verification requirements and pending-state copy. |
| Email Change Security | ui/settings-overlay/account-settings-section.md | whether dual-email confirmation is required and how pending verification is shown. |
| Export & Sharing | ui/workspace/workspace-actions-bar.md | default share-link expiration, allow token reuse vs forced regeneration, and whether native-share action is enabled on supported devices. |
| Filename Override Rule | service/location-path-parser/location-path-parser.md | Keeps filename/title as strongest textual source over any folder-derived candidate (default `true`). |
| Folder Hierarchy Traversal Order | service/location-path-parser/location-path-parser.md | Traversal direction for `directorySegments`; default `leaf-to-root` so nearest folder wins. |
| Folder Hint Confidence Gate | service/location-path-parser/location-path-parser.md | Requires high-confidence folder segment parsing before accepting a folder candidate (default `true`). |
| Folder Root Fallback | service/location-path-parser/location-path-parser.md | Allows root folder hint only when no specific segment candidate exists (default `true`). |
| Identity Profile | ui/settings-overlay/account-page.md | display name edit behavior and validation. |
| Identity Profile | ui/settings-overlay/account-settings-section.md | display name edit policy, formatting, and save behavior. |
| Interaction & Shortcuts | ui/settings-overlay/settings-overlay.md | grouped keyboard shortcut reference by category, including implementation status visibility. |
| Interaction & Shortcuts | ui/settings-overlay/shortcut-reference-settings.md | grouped keyboard shortcut reference by category, including implementation status visibility. |
| Invite Management | ui/settings-overlay/qr-invite-flow.md | invite creation, acceptance, and revocation controls. |
| Invite Management | ui/settings-overlay/settings-overlay.md | invite creation, acceptance, revocation defaults and controls. |
| Language / Locale | ui/settings-overlay/language-locale-settings.md | UI language switch between English, German, and Italian with locale-specific formatting and runtime translation fallback behavior. |
| Language / Locale | ui/settings-overlay/settings-overlay.md | UI language and regional formatting defaults; language switch labels stay native (`English`, `Deutsch`, `Italiano`) regardless of active UI language. |
| Map Basemap | component/map-zone.md | sets the default map layer (`default` or `satellite`) and whether the last user choice is persisted across sessions. |
| Map Marker Motion | ui/media-marker/media-marker.md | toggles marker fade-in and centroid glide transitions during cluster reconciliation (`Off` or `Smooth`). |
| Map Preferences | ui/settings-overlay/settings-overlay.md | map tile and map-behavior defaults. |
| Notifications | ui/settings-overlay/settings-overlay.md | preference defaults for in-app feedback and alerts. |
| Password Recovery | ui/settings-overlay/account-page.md | reset email behavior and redirect target. |
| Password Recovery | ui/settings-overlay/account-settings-section.md | reset email trigger behavior and redirect target handling. |
| Password Security | ui/settings-overlay/account-page.md | policy messaging and re-auth requirement handling. |
| Password Security | ui/settings-overlay/account-settings-section.md | change policy, re-auth requirement behavior, and minimum validation messaging. |
| Project Color Palette | component/project-color-picker.md | temporary one-click random brand-hue generation (`brand-hue-###`) derived from brand orange by varying hue. |
| Project Color Palette | page/projects-page.md | enabled semantic project color options and default fallback color. |
| Projects View Mode | page/projects-page.md | default layout mode (`list` or `cards`) and persistence behavior. |
| QR Invite Preferences | ui/settings-overlay/qr-invite-flow.md | default target role, auto-generate-on-open behavior, invite expiration window, and enabled share channels. |
| QR Invite Preferences | ui/settings-overlay/settings-overlay.md | default role, auto-generation behavior, expiration policy, and allowed share channels for QR invites. |
| Roles & Permissions | ui/settings-overlay/settings-overlay.md | role-based capability visibility and access constraints. |
| Search Tuning | ui/search-bar/search-tuning-settings.md | address and place search filters, weights, penalties, and retry thresholds. |
| Search Tuning | ui/settings-overlay/settings-overlay.md | address/place search filters, ranking weights, penalties, and retry behavior. |
| Selection Bulk Actions | ui/workspace/workspace-actions-bar.md | default delete confirmation behavior, whether address-change requires non-empty validation, and which project targets are shown first (recent vs alphabetical). |
| Session | ui/settings-overlay/account-page.md | logout confirmation and scope behavior. |
| Session | ui/settings-overlay/account-settings-section.md | explicit sign-out behavior and confirmation requirements. |
| Theme | ui/settings-overlay/settings-overlay.md | active theme mode and persistence behavior. |
| Workspace Sort Defaults | ui/settings-overlay/settings-overlay.md | default sorting and ordering preferences. |
