> **Audits:** Reference / investigation (**not normative**). Verify against current `docs/specs/` and `docs/design/` before acting. [How to read `docs/audits/`](README.md).

# UI Container Audit & Implementation Plan

**Date:** 2026-03-25  
**Phase:** 3 (Container System + Layout Refactoring)

---

## 📊 Container Elements Audit

Research into modern design systems (Radix UI, shadcn/ui, web.dev) reveals these standard patterns:

### ✅ Already Implemented (Implicit)

| Element               | Current Location                      | Usage                                                       |
| --------------------- | ------------------------------------- | ----------------------------------------------------------- |
| **Sidebar Layout**    | `workspace-pane.component.*` (inline) | Map route right panel + embedded upload/selected-items tabs |
| **Flex Layout**       | Global Tailwind + SCSS                | Grid, Stack-like behavior via flexbox                       |
| **Responsive Sizing** | Various inline `max-width` rules      | Dashboard, workspace-pane                                   |

### ❌ Missing Container Components

| Element                    | Purpose                                                                           | Design Pattern                                         | Priority        |
| -------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------- |
| **`<MaxWidthContainer>`**  | Wraps content with `max-width: clamp(280px, 35vw, 640px)` + `margin-inline: auto` | Standard modern pattern (Bootstrap, Tailwind, Next.js) | 🔴 **CRITICAL** |
| **`<CenteredLayout>`**     | Flexbox-based centering wrapper                                                   | Common for hero sections, empty states                 | 🟡 HIGH         |
| **`<Stack>` / `<VStack>`** | Flexible spacing + alignment utility                                              | Chakra UI, Radix UI standard                           | 🟠 MEDIUM       |
| **`<PageContainer>`**      | Full-page layout with standard padding/width                                      | Content pages, dashboards                              | 🟡 HIGH         |
| **`<SidebarLayout>`**      | Explicit reusable 2-column layout abstraction                                     | Currently only workspace-pane                          | 🟠 MEDIUM       |

---

## 🎯 Clamp Constraint Issue

**Current State:**

- Workspace-pane has hardcoded `max-width: clamp(280px, 35vw, 640px)` in `workspace-pane.component.scss`
- Projects-page uses `margin-inline: auto` (different approach)
- Inconsistent pattern across codebase

**Problem:**

- Not DRY (Duplication: clamp value would need to be maintained in multiple places)
- No semantic component (styling is spread across SCSS files)
- Makes design system evolution (e.g., changing clamp values) difficult

**Solution:**
Extract into reusable `<MaxWidthContainer>` component that:

1. Encapsulates clamp logic + centering
2. Can be reused in workspace-pane, projects-page, footer, modals
3. Makes design system updates centralized

---

## 📋 Implementation Plan

### Phase 3a: Container Foundation (✅ COMPLETED)

**✅ DONE:**

1. ✅ Created `apps/web/src/app/shared/containers/max-width-container.component.ts`
   - Template: `<div class="max-width-container"><ng-content></ng-content></div>`
   - Styles: `max-width: clamp(280px, 35vw, 640px); margin-inline: auto; width: 100%;`
   - Exported in `shared/containers/index.ts`

2. ✅ Created `apps/web/src/app/shared/containers/centered-layout.component.ts`
   - Template: Flex container with justify/align center
   - Useful for empty states, error screens
   - Exported in `shared/containers/index.ts`

3. ✅ Refactored workspace-pane to use Container:
   - `workspace-pane.component.ts` → Added MaxWidthContainerComponent import + to imports array
   - `workspace-pane.component.html` → Wrapped root div in `<app-max-width-container>`
   - `workspace-pane.component.scss` → Removed inline `max-width: clamp() + width: 100%` rules
   - ✅ Dev build validated (16.146 seconds, zero errors)

### Phase 3b: Extended Containers (Next)

   <div class="workspace-pane">...</div>
   
   <!-- After -->
   <app-max-width-container class="workspace-pane">...</app-max-width-container>
   ```

### Phase 3b: Extended Containers (✅ COMPLETED)

**✅ DONE:**

- ✅ Created `VStackComponent` → configurable vertical spacing with gap
- ✅ Created `HStackComponent` → configurable horizontal spacing + alignment
- ✅ Created `PageContainerComponent` → full-page wrapper with standard padding + optional centering
- ✅ Updated `shared/containers/index.ts` to export all 5 container types
- ✅ Dev build validated (14.012s, zero errors)

### Phase 3c: Media Page Refactoring (✅ COMPLETED)

**✅ DONE:**

- ✅ Created `MediaPageHeaderComponent` → breadcrumb + media count display
- ✅ Refactored `PhotosComponent` to use Projects-Page layout pattern:
  - Template: `PageContainer > VStack > Header + Content Sections`
  - Styling: Centralized in component (<media-content>, <media-grid>)
  - Layout: Mirrors projects-page (Header, Toolbar-ready, Loading/Error/Empty states, Grid)
- ✅ Updated imports: Added PageContainerComponent, VStackComponent, MediaPageHeaderComponent
- ✅ Build validated (14.012s, zero errors)

### Phase 4: Apply Containers Across Codebase (📅 Next)

Opportunistic use of new containers:

- Footer pages: Wrap in `<PageContainer>`
- Modal dialogs: Use `<CenteredLayout>` for error/confirmation dialogs
- Form layouts: Use `<VStack>` for filter sections, metadata inputs
- Dynamic grids: Evaluate `<HStack>` for toolbar button groups

### Phase 5: Architecture Diagrams (🎨 Optional)

Create visual documentation (optional):

- Page Layout Diagrams: Component hierarchy for /projects, /media, /map
- Container System Diagram: How containers stack and compose
- Data Flow: Context binding lifecycle between routes and workspace-pane

---

### Phase 4: Apply Across Codebase

- Media Page: Wrap grid in `<PageContainer>`
- Footer: Use `<MaxWidthContainer>`
- Modals: Use `<CenteredLayout>`
- Form sections: Use `<Stack>` for spacing

---

## 🔗 Related Issues

**Links to tracking:**

- Workspace-Pane Clamp (workspace-pane.component.scss:1-10) — Extract to component
- Projects-Page Layout (projects-page.component.scss) — Align with clamp pattern
- Media Page Grid (photos.component.ts) — Apply container pattern

---

## Design System Implications

These container components should become **permanent fixtures** in `apps/web/src/app/shared/containers/`:

- Part of design token system
- Documented in `docs/design-system/`
- Versioned with Angular major version bumps
- Exported from shared index for easy discovery

---

## Status: This Document

- **Created:** 2026-03-25
- **Phase 3a-3c Completion:** 2026-03-25 (16:00 UTC)
- **Next Action:** Phase 4 (Apply containers across codebase opportunistically)
- **Estimated Remaining Effort:** 20 minutes (footer, modals, form sections)
- **Diagram Status:** Optional / Phase 5+ (pending if time availability)
