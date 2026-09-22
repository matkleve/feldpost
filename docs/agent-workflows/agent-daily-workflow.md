# Agent Daily Workflow

**Step-by-step guide for implementing features in Feldpost**

---

## 🗂 Step 0: Read the issue tracker — before, during, and at the end

**GitHub Issues is the task register** ([backlog README](../backlog/README.md) § Where open work
lives). A study explains *why*; a spec says *what the code must do*; the issue is *the work*. An
agent that never opens the tracker is working from a snapshot of whatever was in its prompt.

Do this on **every** task, not only when an issue number was handed to you:

| When | Do |
| --- | --- |
| **Starting** | Search open issues for the area you are about to touch, by keyword, not only by number. Read the ones that match: they carry acceptance criteria, prior decisions, and blockers. If an issue already exists for what you were asked to do, work *that* issue — do not open a parallel one. |
| **While analysing** | When you find something outside your scope — a defect in passing, a stale doc, a decision nobody has made — check whether it is already filed. If not, file it **then**, while you have the evidence. Do not save it for the final message, where it becomes a sentence nobody can action. |
| **Finishing** | Update every issue your work touched: tick the acceptance criteria you actually met, say plainly which you did **not** and why, and close only what is genuinely done. If the work changed what the issue should say, edit the issue. |

### The rules that make this worth doing

- **Do not silently narrow an issue.** If you implemented six of eight acceptance criteria, say which
  two are missing, in the issue, before anyone asks. An issue closed on partial work is worse than an
  open one, because it stops being visible.
- **Do not duplicate.** Search before filing. A near-duplicate splits the discussion and one half
  gets lost.
- **File the blocker you hit, not the blocker you assume.** "Needs live verification" is only useful
  with the commands and the pass criterion attached.
- **A finding with no issue does not exist.** It lives in a chat log the next agent will never read.
- **An issue is not a diary.** Narrative belongs in `docs/ai-diary/`, reasoning in `docs/study/`, the
  contract in `docs/specs/`. The issue holds the task and its acceptance criteria.

Convention for work that belongs to a study's phase plan: the issue title **names the phase** — e.g.
*"Unit suite: 14 spec files pass in isolation and fail in a full run (STUDY-006 Phase 0.4b)"* (#203).
The study keeps the reasoning; the issue keeps the task. Do not let a study grow a checklist.

Batch-filing: use `node scripts/create-github-issues.mjs path/to/issues.json` rather than a loop of
single creates ([gates-and-commands](./gates-and-commands.md)).

---

## 🎯 Typical Workflow: Implement a UI Element

### Step 1: Find & Read the Spec

1. **Locate spec** under `docs/specs/` (`component/`, `ui/`, `service/`, `page/`, `system/` — see `docs/specs/README.md`)
   - Use the exact name from the glossary

2. **Read spec completely**:
   - "What It Is" - Understand the purpose
   - "What It Looks Like" - Visual design
   - "Where It Lives" - Parent component & routing
   - "Actions" table - Every user interaction
   - "Component Hierarchy" - Structure & nesting
   - "Data" - Sources & queries
   - "State" - All state variables
   - "File Map" - Files to create
   - "Wiring" - How to connect
   - "Acceptance Criteria" - Test checklist

3. **Check for child specs**:
   - Large specs are split into parent + child specs
   - Read all child specs linked in "Child Specs" section

### Step 2: Read related service contracts (when applicable)

1. **Open the service index**: `docs/specs/service/README.md`
2. **Read the facade spec** for each `apps/web/src/app/core/<module>/` you change (Actions, Data, Wiring, Acceptance Criteria).
3. **Cross-link** UI specs already point here for search, geocoding, media download, upload, etc.

### Step 3: Understand the Context

1. **Glossary**: `docs/glossary.md` - Use exact terminology
2. **Design tokens**: `docs/design/tokens.md` - CSS variables
3. **Layout rules**: `docs/design/layout.md` - Layout patterns
4. **Security boundaries**: `docs/security-boundaries.md` - RLS rules

### Step 4: Plan Implementation

1. **Create files** according to File Map
2. **Follow component hierarchy** from spec
3. **Use shared primitives** - Check `apps/web/src/app/shared/`
4. **Plan service integration** - Use adapters, not direct calls

### Step 5: Implement

1. **Create component files**:
   - Use standalone component pattern
   - Follow naming: `kebab-case.component.ts`
   - Import required shared components

2. **Implement component logic**:
   - Use `inject()` for dependencies
   - Use signals for state (not RxJS when possible)
   - Follow adapter pattern - no direct Leaflet/Supabase calls

3. **Implement template**:
   - Use design tokens (`--color-clay`, `--color-bg-surface`)
   - Use shared primitives (`.ui-container`, `.ui-item`)
   - Follow hierarchy from spec

4. **Wire services**:
   - Inject required services
   - Implement data access through adapters
   - Handle loading/error/empty states

### Step 6: Verify & Test

1. **Run implementation checklist**:
   - `docs/agent-workflows/implementation-checklist.md`
   - Check every section
   - Fix any violations

2. **Run design system contract gates** (required for design-system docs, panel SCSS, geometry logic):

   ```bash
   npm run design-system:check
   ```

   - Includes registry validation and panel breakpoint audit

3. **Build verification**:

   ```bash
   cd apps/web && ng build
   ```

   - Fix any build errors
   - Must pass before commit

4. **Manual testing**:
   - Test all Actions from spec
   - Verify acceptance criteria
   - Test responsive behavior

---

## 🔧 Common Implementation Patterns

### Component Structure

```typescript
@Component({
  standalone: true,
  selector: "app-my-element",
  imports: [SharedUiComponent, CommonModule],
  template: `
    <div class="ui-container">
      <!-- Use shared primitives -->
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class MyElementComponent {
  private readonly mapAdapter = inject(MapAdapter);
  private readonly supabase = inject(SupabaseService);

  // Use signals for state
  readonly data = signal<MyData | null>(null);
  readonly isLoading = signal(false);

  // Implement actions from spec
  onUserAction(): void {
    // Implementation
  }
}
```

### Service Integration

```typescript
@Injectable({ providedIn: "root" })
export class MyElementService {
  private readonly supabase = inject(SupabaseService);

  async getData(): Promise<MyData[]> {
    return this.supabase.client
      .from("my_table")
      .select("*")
      .eq("organization_id", this.supabase.currentOrgId());
  }
}
```

### Adapter Usage

```typescript
// ✅ Correct
const center = this.mapAdapter.getCenter();
const result = await this.supabase.client.from("table").select("*");

// ❌ Never do this
import { L } from "leaflet";
import { createClient } from "@supabase/supabase-js";
```

---

## 📋 Pre-Commit Checklist

### Code Quality

- [ ] `ng build` passes without errors
- [ ] `npm run design-system:check` passes when design-system docs, panel SCSS, or geometry behavior changed
- [ ] No console errors at runtime
- [ ] All files from File Map exist
- [ ] Component hierarchy matches spec
- [ ] Standalone components (no NgModules)

### Architecture

- [ ] Adapter pattern used (no direct Leaflet/Supabase)
- [ ] Signals used where appropriate
- [ ] Shared components reused
- [ ] Design tokens used

### Security

- [ ] RLS policies enforced through queries
- [ ] Organization-scoped data access
- [ ] No hardcoded secrets
- [ ] Server-side validation

### UI/UX

- [ ] Design tokens used correctly
- [ ] Shared primitives used
- [ ] Mobile-friendly (touch targets ≥48px)
- [ ] Loading/error/empty states

### Issue tracker

- [ ] Every issue this work touched has been updated, not just the one you started from
- [ ] Acceptance criteria ticked only where actually met; unmet ones named explicitly with the reason
- [ ] Anything found in passing is filed, with its evidence, rather than mentioned in a message
- [ ] Nothing closed that is not genuinely done

### Documentation

- [ ] Implementation checklist complete
- [ ] Acceptance criteria tested
- [ ] No TODO comments left
- [ ] Code comments where complex

---

## 🚨 Common Pitfalls & Solutions

### Build Errors

**Problem**: Missing imports in standalone component
**Solution**: Add all required imports to `imports` array

**Problem**: Signal not initialized
**Solution**: Initialize all signals with default values

### RLS Issues

**Problem**: Data not showing
**Solution**: Check `organization_id` filter in query

**Problem**: Permission denied
**Solution**: Verify RLS policy in `docs/security-boundaries.md`

### Spec Violations

**Problem**: Missing section in implementation
**Solution**: Read spec more carefully, check all sections

**Problem**: Wrong component hierarchy
**Solution**: Match spec hierarchy exactly

### Performance Issues

**Problem**: Slow loading
**Solution**: Check for N+1 queries, use proper indexing

**Problem**: Memory leaks
**Solution**: Destroy subscriptions in `destroyRef`

---

## 🔄 Debugging Workflow

### 1. Identify the Issue

- **Build error**: Check `ng build` output
- **Runtime error**: Check browser console
- **UI issue**: Compare with spec screenshots
- **Data issue**: Check network requests

### 2. Check Common Causes

- **Missing imports**: Add to component imports
- **Wrong service injection**: Check `inject()` usage
- **RLS policy**: Check query filters
- **Signal state**: Check signal initialization

### 3. Verify Against Spec

- **Actions**: All implemented?
- **State**: All variables present?
- **Data**: Correct sources used?
- **Wiring**: Correct connections?

### 4. Test & Validate

- **Unit tests**: `ng test`
- **Build verification**: `ng build`
- **Manual testing**: User interactions
- **Acceptance criteria**: All checked?

---

## 📚 Reference Links

### Essential Reading

- [Agent Quick Reference](agent-quick-reference.md) - Daily cheat sheet
- [Element Spec Format](element-spec-format.md) - Spec structure
- [Implementation Checklist](implementation-checklist.md) - Verification
- [Security Boundaries](../security-boundaries.md) - RLS rules

### Design Reference

- [Design Tokens](../design/tokens.md) - CSS variables
- [Layout Rules](../design/layout.md) - Layout patterns
- [Design Constitution](../design/constitution.md) - Non-negotiable rules

### Code Reference

- [Glossary](../glossary.md) - Terminology
- [Architecture](../architecture.md) - System design
- [Database Schema](../architecture/database-schema.md) - Data model

---

_Remember: Specs are contracts. When in doubt, re-read the spec._
