#!/usr/bin/env bash
# Phase 10 QA Part 2 — GitHub issue creation script
# Run after: gh auth login
# Repo: matkleve/feldpost

set -e
REPO="matkleve/feldpost"

echo "Creating Phase 10 QA Part 2 issues for $REPO ..."

# ── 1. Workspace pane open/close broken ─────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P1: Workspace pane drag-open stops at ~50% width; drag-to-close broken" \
  --label "bug,P1,workspace,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Findings:** W1 + W2 from \`docs/migration/phase-10-visual-qa.md\`

### W1 — Pane only opens to ~50%
When dragging the workspace pane open, it stops at approximately 50% width and cannot be opened further.

### W2 — Drag-to-close broken
Dragging the pane to close does not work at all.

### Expected
- Pane should open to full/configurable width on drag past threshold
- Drag-to-close should dismiss/collapse the pane below a minimum width threshold

### Spec gap
No spec currently exists for the drag-resize interaction contract (open percentage, min/max width, close threshold). Spec required before implementing fix.

### Area
`workspace-pane`, resize/drag gesture handling
EOF
)"

echo "✓ Issue 1 created"

# ── 2. View toggle group invisible/clipped ───────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P2: Workspace toolbar — view toggle group invisible and clipped by overflow" \
  --label "bug,P2,workspace,toolbar,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Findings:** W3 + W4 + W5 from \`docs/migration/phase-10-visual-qa.md\`

### W3 — Toggle group options invisible
The view toggle group (grid / list / etc.) renders but options are not visually visible — likely a color/contrast or opacity regression.

### W4 — Toggle group clipped by toolbar overflow
Filter, Sort, Grouping, and Projects dropdowns are visible but the view-toggle-group that follows gets cut off / hidden when the toolbar is too narrow.

### W5 — UX suggestion (enhancement)
When toolbar space is tight, consider replacing the toggle group with a single cycling button (current view → click → next view) instead of clipping the group.

### Area
`media-toolbar`, `workspace-toolbar`, toolbar overflow strategy
EOF
)"

echo "✓ Issue 2 created"

# ── 3. Upload panel in workspace needs redesign ──────────────────────────────
gh issue create --repo "$REPO" \
  --title "P3 (design): Workspace upload panel reuses map-sidebar components — needs workspace-specific redesign" \
  --label "design,P3,workspace,upload,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** W6 from \`docs/migration/phase-10-visual-qa.md\`

The upload panel inside the workspace context reuses map-sidebar components. The workspace context has significantly more horizontal space than the map sidebar and warrants a dedicated layout.

### Spec gap
No workspace-specific upload panel spec exists. A spec is required before redesign begins.

### Area
`workspace/upload-panel`, `features/upload`
EOF
)"

echo "✓ Issue 3 created"

# ── 4. Sidebar i18n stale + account name missing ─────────────────────────────
gh issue create --repo "$REPO" \
  --title "P2: Nav sidebar — stale i18n state after language switch + account name missing" \
  --label "bug,P2,i18n,nav,sidebar,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Findings:** N1 + N2 from \`docs/migration/phase-10-visual-qa.md\`

### N1 — Stale i18n after language switch
After switching from Italian to German, the sidebar shows "Karte Medium" (Italian) mixed with German "Projekte". The i18n state is not fully reset on language switch.

### N2 — Account name missing
The Account section at the bottom of the sidebar shows no user name. The user data binding appears to be broken or missing.

### Area
`nav-sidebar`, `i18n`, `AuthService` / user display
EOF
)"

echo "✓ Issue 4 created"

# ── 5. Nav hover state inconsistency ─────────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P3: Nav sidebar — active item hover state inconsistent (icon loses color treatment)" \
  --label "bug,P3,nav,sidebar,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** N3 from \`docs/migration/phase-10-visual-qa.md\`

### Current behavior
Active nav item: icon + text both orange + light-orange background.
Hover on active item: only text stays orange; icon does not match the expected treatment (loses consistent styling).

### Expected
Icon and text should always share the same color in every state (idle, hover, active, active+hover).

### Area
`nav-sidebar`, CSS state rules for `.nav-item--active:hover`
EOF
)"

echo "✓ Issue 5 created"

# ── 6. Media toolbar wrapping ─────────────────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P2: Media page toolbar — 'Kopieren' wraps to second row unexpectedly" \
  --label "bug,P2,media,toolbar,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** M1 from \`docs/migration/phase-10-visual-qa.md\`

Filter + Sort + Projects render on one row, but "Kopieren" (Copy) wraps to a second row despite sufficient horizontal space being available.

### Area
`media-toolbar`, flex/overflow layout
EOF
)"

echo "✓ Issue 6 created"

# ── 7. Media items not rendering + rows view incomplete ───────────────────────
gh issue create --repo "$REPO" \
  --title "P1/P2: Media page — items don't render correctly; 'Zeilen' (rows) view not implemented" \
  --label "bug,P1,media,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Findings:** M2 + M3 from \`docs/migration/phase-10-visual-qa.md\`

### M2 — Media items broken (P1)
Media items do not render correctly in the main media view. Primary content area is broken.

### M3 — "Zeilen" (rows/list) view not implemented (P2)
Selecting the rows/list view shows only a single large image. The view is not fully implemented.

### Area
`media-list`, `media-grid`, `media-item`, view rendering
EOF
)"

echo "✓ Issue 7 created"

# ── 8. Image click doesn't open workspace pane ───────────────────────────────
gh issue create --repo "$REPO" \
  --title "P1: Media page — clicking an image does not open workspace pane" \
  --label "bug,P1,media,workspace,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** M4 from \`docs/migration/phase-10-visual-qa.md\`

Clicking a media item (image) on the media page does not open the workspace pane for detail view. This is the core click-to-detail interaction and is completely broken.

### Area
`media-item`, `workspace-pane`, click/selection wiring
EOF
)"

echo "✓ Issue 8 created"

# ── 9. Upload button not persistent ──────────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P2: Media page — upload FAB should be persistent in top-right of content area" \
  --label "bug,P2,media,upload,ux,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** M5 from \`docs/migration/phase-10-visual-qa.md\`

The upload button/FAB is not persistently visible. It should always be shown in the top-right corner of the content area (not inside the workspace pane), following the same persistent-control pattern as the side menu.

### Spec gap
FAB placement spec for the media page context is absent or incomplete — needs clarification on whether the FAB is a global shell element or per-page.

### Area
`media-page`, `upload-fab`, shell layout
EOF
)"

echo "✓ Issue 9 created"

# ── 10. Projects page layout + toggle group ───────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P3: Projects page — missing layout structure; 'Alle/Archiviert' toggle group poorly styled" \
  --label "bug,P3,projects,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Findings:** P1 + P2 from \`docs/migration/phase-10-visual-qa.md\`

### P1 — Missing page layout
The Projects page is missing its expected structural layout/breakdown.

### P2 — Toggle group styling
The "Alle / Archiviert" toggle group in the top-left of the Projects page is poorly styled.

### Area
`projects-page`, `toggle-group`
EOF
)"

echo "✓ Issue 10 created"

# ── 11. "Neues Projekt" button formatting ─────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P3: Projects page — 'Neues Projekt' button incorrectly formatted" \
  --label "bug,P3,projects,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** P3 from \`docs/migration/phase-10-visual-qa.md\`

The "Neues Projekt" (New Project) button on the Projects page has incorrect formatting/styling.

### Area
`projects-page`, button styling
EOF
)"

echo "✓ Issue 11 created"

# ── 12. Project cards complete redesign ───────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P2 (design): Project cards — full rebuild required; do not patch current implementation" \
  --label "design,P2,projects,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** P4 from \`docs/migration/phase-10-visual-qa.md\`

**⚠️ User has explicitly requested a complete rebuild of project cards from scratch. Agents must NOT attempt to fix or patch the current card implementation.**

The current project cards need to be deleted and rebuilt with a new design.

### Required before work starts
1. Archive/deprecate current project card spec if one exists
2. Write a new project card spec following the element-spec-format
3. Get user sign-off on the new spec before any implementation

### Area
`project-card`, `projects-page`
EOF
)"

echo "✓ Issue 12 created"

# ── 13. Filter dropdown right padding (projects) ──────────────────────────────
gh issue create --repo "$REPO" \
  --title "P3: Projects page filter dropdown — excess right padding (scrollbar placeholder duplication)" \
  --label "bug,P3,projects,filter,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** P5 from \`docs/migration/phase-10-visual-qa.md\`

The filter dropdown on the Projects page has excess right padding, likely from a scrollbar placeholder being duplicated. This is the same pattern as finding #5 in Part 1 (search results dropdown).

**Note:** Check if existing issue #49 covers this — if so, link this finding there rather than tracking separately.

### Area
`projects-page`, `filter-dropdown`, scrollbar padding
EOF
)"

echo "✓ Issue 13 created"

# ── 14. Project color picker broken ───────────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P2: Projects page — project color picker button does not work" \
  --label "bug,P2,projects,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** P6 from \`docs/migration/phase-10-visual-qa.md\`

The project color picker button on the Projects page is non-functional (click has no effect or the picker does not open).

### Area
`project-color-picker`, `projects-page`
EOF
)"

echo "✓ Issue 14 created"

# ── 15. Project card → workspace panel missing ────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P2: Projects — clicking project card should open workspace panel (project detail view missing)" \
  --label "bug,P2,projects,workspace,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** P7 from \`docs/migration/phase-10-visual-qa.md\`

Clicking a project card should open the workspace panel with a project detail view. Currently nothing happens (or wrong behavior). The workspace panel project detail view is not implemented.

### Spec gap
The workspace pane spec does not cover the project detail view slice. A new spec slice is required before implementation.

### Area
`project-card`, `workspace-pane`, project detail wiring
EOF
)"

echo "✓ Issue 15 created"

# ── 16. Settings highlight corners + bg bleed ─────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P3: Settings overlay — section highlight has square corners and bleeds over section background" \
  --label "bug,P3,settings,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Findings:** S1 + S2 from \`docs/migration/phase-10-visual-qa.md\`

### S1 — Square corners
The color highlight on selected settings items (Language, Density, etc.) has square corners. Should use the design-system border-radius token (rounded corners).

### S2 — Highlight bleeds over section background
The orange highlight overlays the white section background, making the boundary between highlight and background visually wrong. Paint-order or z-index issue.

### Area
`settings-overlay`, section highlight styling
EOF
)"

echo "✓ Issue 16 created"

# ── 17. Language icons missing ────────────────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P3: Settings overlay — language option flag icons missing (EN/DE/IT)" \
  --label "design,P3,settings,i18n,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** S3 from \`docs/migration/phase-10-visual-qa.md\`

The language selection options (English, Deutsch, Italiano) in the Settings overlay are missing their flag icons. Small flag icons are expected next to each language option.

### Area
`settings-overlay`, language section, icon assets
EOF
)"

echo "✓ Issue 17 created"

# ── 18. "Media" translation wrong ─────────────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P2 (i18n): Nav sidebar — 'Media' label incorrectly translated to 'Medium'; should be 'Inhalte' in German" \
  --label "bug,P2,i18n,nav,sidebar,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** L1 from \`docs/migration/phase-10-visual-qa.md\`

The "Media" nav item is being translated to "Medium" (Italian-influenced form) in German locale. The correct German label is "Inhalte" — it should never be localized to "Medium".

Check i18n key in \`translation-workbench.csv\` and fix the German translation entry.

### Area
`nav-sidebar`, i18n key `nav.media` (or equivalent), \`translation-workbench.csv\`
EOF
)"

echo "✓ Issue 18 created"

# ── 19. Media nav icon wrong ──────────────────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P3: Nav sidebar — Media nav item should use elements/content icon, not camera icon" \
  --label "design,P3,nav,sidebar,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** L2 from \`docs/migration/phase-10-visual-qa.md\`

The Media ("Inhalte") nav item currently uses a camera icon. The correct icon should represent elements/content, not photography specifically.

### Area
`nav-sidebar`, icon selection for media/content nav item
EOF
)"

echo "✓ Issue 19 created"

# ── 20. Settings route independence ──────────────────────────────────────────
gh issue create --repo "$REPO" \
  --title "P2: Settings opens at /map/settings instead of /settings — should be route-independent" \
  --label "bug,P2,settings,routing,phase-10-qa" \
  --body "$(cat <<'EOF'
## QA Finding (Phase 10 Part 2 — 2026-05-19)

**Finding:** L3 from \`docs/migration/phase-10-visual-qa.md\`

Clicking Account/Settings in the sidebar while on the map page opens the settings overlay with the map route context (e.g. \`/map/settings\` or \`/map/settings/general\`). Settings should be route-independent — always navigate to \`/settings\` regardless of the triggering route.

### Area
`settings-overlay`, routing, `RouterService` or settings navigation wiring
EOF
)"

echo "✓ Issue 20 created"

echo ""
echo "All 20 issues created successfully."
