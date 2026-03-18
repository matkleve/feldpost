# Agent Daily Workflow

**Step-by-step guide for implementing features in Feldpost**

---

## 🎯 Typical Workflow: Implement a UI Element

### Step 1: Find & Read the Spec
1. **Locate spec**: `docs/element-specs/[element].md`
   - Check `docs/element-specs/README.md` for complete list
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

### Step 2: Check Implementation Blueprint
1. **Look for blueprint**: `docs/implementation-blueprints/[element].md`
2. **Read service signatures** - Method names & parameters
3. **Check data flow diagrams** - How data moves through services
4. **Note any special patterns** - Unique implementation approaches

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

2. **Build verification**:
   ```bash
   cd apps/web && ng build
   ```
   - Fix any build errors
   - Must pass before commit

3. **Manual testing**:
   - Test all Actions from spec
   - Verify acceptance criteria
   - Test responsive behavior

---

## 🔧 Common Implementation Patterns

### Component Structure
```typescript
@Component({
  standalone: true,
  selector: 'app-my-element',
  imports: [SharedUiComponent, CommonModule],
  template: `
    <div class="ui-container">
      <!-- Use shared primitives -->
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
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
@Injectable({ providedIn: 'root' })
export class MyElementService {
  private readonly supabase = inject(SupabaseService);
  
  async getData(): Promise<MyData[]> {
    return this.supabase.client
      .from('my_table')
      .select('*')
      .eq('organization_id', this.supabase.currentOrgId());
  }
}
```

### Adapter Usage
```typescript
// ✅ Correct
const center = this.mapAdapter.getCenter();
const result = await this.supabase.client.from('table').select('*');

// ❌ Never do this
import { L } from 'leaflet';
import { createClient } from '@supabase/supabase-js';
```

---

## 📋 Pre-Commit Checklist

### Code Quality
- [ ] `ng build` passes without errors
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
- [Element Spec Format](agent-workflows/element-spec-format.md) - Spec structure
- [Implementation Checklist](agent-workflows/implementation-checklist.md) - Verification
- [Security Boundaries](security-boundaries.md) - RLS rules

### Design Reference
- [Design Tokens](design/tokens.md) - CSS variables
- [Layout Rules](design/layout.md) - Layout patterns
- [Design Constitution](design/constitution.md) - Non-negotiable rules

### Code Reference
- [Glossary](glossary.md) - Terminology
- [Architecture](architecture.md) - System design
- [Database Schema](database-schema.md) - Data model

---

*Remember: Specs are contracts. When in doubt, re-read the spec.*
