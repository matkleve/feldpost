# Agent Quick Reference - Feldpost

**Daily work cheat sheet** - find what you need in <30 seconds.

---

## 🚀 Quick Start: "I want to..."

### Implement a new UI element
1. **Find spec**: `docs/element-specs/[element].md` (check `docs/element-specs/README.md` for list)
2. **Check blueprint**: `docs/implementation-blueprints/[element].md` (if exists)
3. **Read glossary**: `docs/glossary.md` for exact terminology
4. **Follow spec contract**: Use `docs/agent-workflows/element-spec-format.md`
5. **Verify**: Run `docs/agent-workflows/implementation-checklist.md`

### Debug existing code
1. **Check adapters**: Never call Leaflet/Supabase directly - use `MapAdapter`, `SupabaseService`, `GeocodingAdapter`
2. **Check RLS**: All data access goes through Row-Level Security - see `docs/security-boundaries.md`
3. **Check signals**: Use Angular signals, not RxJS where possible
4. **Check shared components**: Look in `apps/web/src/app/shared/` first

### Add new settings
1. **Add to spec**: Add `## Settings` section to element spec
2. **Update registry**: Run `node scripts/lint-specs.mjs --fix`
3. **Check sync**: Verify `docs/settings-registry.md` matches

### Add i18n text
1. **Add to workbench**: `docs/i18n/translation-workbench.csv`
2. **Generate SQL**: `node scripts/import-i18n-csv-to-sql.mjs`
3. **Commit**: Include `supabase/seed_i18n.sql` changes

---

## 📁 Key File Locations

### Frontend Structure
```
apps/web/src/app/
├── core/           # Services, adapters, utilities
├── features/       # Feature components
├── shared/         # Reusable UI components
└── styles.scss     # Global styles
```

### Documentation Structure
```
docs/
├── element-specs/          # UI implementation contracts (SOURCE OF TRUTH)
├── implementation-blueprints/ # Service signatures & data flow
├── agent-workflows/         # Agent guides & checklists
├── design/                  # Design tokens & layout rules
├── glossary.md              # Canonical terminology
└── security-boundaries.md   # RLS & security model
```

### Database
```
supabase/
├── migrations/              # SQL schema changes
└── seed_i18n.sql           # Translation data
```

---

## 🏗️ Architecture Patterns

### Adapter Pattern (MANDATORY)
```typescript
// ❌ NEVER do this
import { L } from 'leaflet'; 
import { createClient } from '@supabase/supabase-js';

// ✅ ALWAYS do this
import { MapAdapter } from '../core/map.adapter';
import { SupabaseService } from '../core/supabase.service';
```

### Component Pattern
```typescript
@Component({
  standalone: true,
  selector: 'app-my-component',
  imports: [SharedUiComponent],
  template: `
    <div class="ui-container">
      <!-- Use shared primitives -->
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class MyComponent {
  private readonly mapAdapter = inject(MapAdapter);
  private readonly supabase = inject(SupabaseService);
  
  // Use signals, not RxJS when possible
  readonly data = signal<MyData | null>(null);
}
```

### Service Pattern
```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  // Use inject() in constructor
  private readonly supabase = inject(SupabaseService);
  
  // Never call Supabase directly from components
  async getData(): Promise<MyData[]> {
    return this.supabase.client
      .from('my_table')
      .select('*');
  }
}
```

---

## 🎯 Common Tasks

### Create new component
1. Follow file naming: `kebab-case.component.ts`
2. Use standalone component (no NgModule)
3. Import shared components from `shared/`
4. Use design tokens: `--color-clay`, `--color-bg-surface`
5. Use shared primitives: `.ui-container`, `.ui-item`

### Add new database table
1. Create migration in `supabase/migrations/`
2. Add RLS policies (security boundary!)
3. Update TypeScript types if needed
4. Update `docs/database-schema.md`

### Fix spec violations
1. Run `node scripts/lint-specs.mjs`
2. Fix missing sections in element specs
3. Update `docs/settings-registry.md` if needed
4. Check acceptance criteria checkboxes

---

## ⚡ Development Commands

```bash
# Install dependencies
npm install

# Start dev server
cd apps/web && ng serve

# Build (required before commits)
cd apps/web && ng build

# Run tests
cd apps/web && ng test

# Lint specs
node scripts/lint-specs.mjs

# Fix spec registry
node scripts/lint-specs.mjs --fix

# Update i18n
node scripts/import-i18n-csv-to-sql.mjs
```

---

## 🔒 Security Rules (NON-NEGOTIABLE)

1. **RLS is the security boundary** - Frontend is untrusted
2. **Never bypass adapters** - Always use `MapAdapter`, `SupabaseService`, `GeocodingAdapter`
3. **Check organization scope** - All data queries must include `organization_id`
4. **Validate on server** - Client validation is UX only
5. **No hardcoded secrets** - Use environment variables

---

## 🎨 Design Rules

1. **Field-first, map-primary** - Map is the main interface
2. **Progressive disclosure** - Show details on demand
3. **Warmth, calm confidence** - Use `--color-clay`, warm grays
4. **Shared primitives first** - Check `shared/` before creating new UI
5. **Mobile-first** - Touch targets ≥48px

---

## 📋 Troubleshooting

### Build fails
- Check for missing imports in standalone components
- Verify all signals are properly initialized
- Run `ng build` to see exact errors

### RLS issues
- Check `docs/security-boundaries.md`
- Verify `organization_id` is included in queries
- Test with different user roles

### i18n issues
- Check `docs/i18n/translation-workbench.csv`
- Run `node scripts/import-i18n-csv-to-sql.mjs`
- Verify `supabase/seed_i18n.sql` is updated

### Spec violations
- Run `node scripts/lint-specs.mjs`
- Check missing sections in element specs
- Update acceptance criteria checkboxes

---

## 📞 Need Help?

1. **Check the spec first** - `docs/element-specs/[element].md`
2. **Check the glossary** - `docs/glossary.md`
3. **Check security docs** - `docs/security-boundaries.md`
4. **Check implementation blueprint** - `docs/implementation-blueprints/[element].md`
5. **Ask for clarification** - Better than guessing

---

*Remember: Element specs are the source of truth. Code must match specs, not the other way around.*
