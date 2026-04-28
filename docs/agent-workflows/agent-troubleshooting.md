# Agent Troubleshooting Guide

**Common issues and solutions for Feldpost development**

---

## 🚨 Quick Fixes

### Build Errors
**Problem**: `ng build` fails with missing imports
```bash
ERROR: The pipe 'asyncPipe' could not be found
```
**Solution**: Add `CommonModule` to component imports
```typescript
imports: [CommonModule, YourOtherImports]
```

**Problem**: Standalone component missing imports
```bash
ERROR: Component 'YourComponent' is not a standalone component
```
**Solution**: Add `standalone: true` to component decorator

**Problem**: Signal not initialized
```bash
ERROR: Signal has no value
```
**Solution**: Initialize all signals with default values
```typescript
readonly data = signal<MyData | null>(null); // ✅
readonly data: Signal<MyData | null>; // ❌
```

### Runtime Errors
**Problem**: Supabase RLS permission denied
```bash
ERROR: permission denied for table images
```
**Solution**: Check `organization_id` filter in query
```typescript
// ✅ Include organization filter
this.supabase.client
  .from('images')
  .select('*')
  .eq('organization_id', this.supabase.currentOrgId());

// ❌ Missing organization filter
this.supabase.client
  .from('images')
  .select('*');
```

**Problem**: Map not rendering
```bash
ERROR: MapAdapter not initialized
```
**Solution**: Inject MapAdapter, don't import Leaflet directly
```typescript
// ✅ Use adapter
private readonly mapAdapter = inject(MapAdapter);

// ❌ Don't import directly
import { L } from 'leaflet';
```

---

## 🔍 Debugging Workflow

### Step 1: Check the Basics
1. **Build verification**: `cd apps/web && ng build`
2. **Console errors**: Check browser dev tools
3. **Network requests**: Check failed API calls
4. **Component rendering**: Check if component appears in DOM

### Step 2: Verify Against Spec
1. **Actions table**: All user interactions implemented?
2. **State table**: All state variables present?
3. **Data section**: Correct sources used?
4. **Wiring section**: Correct service connections?

### Step 3: Check Common Patterns
1. **Adapter pattern**: No direct Leaflet/Supabase calls?
2. **Signals usage**: Signals initialized and used correctly?
3. **Shared components**: Using components from `shared/`?
4. **Design tokens**: Using CSS variables correctly?

### Step 4: Test Edge Cases
1. **Empty state**: No data available?
2. **Error state**: API failure?
3. **Loading state**: During data fetch?
4. **Mobile view**: Responsive behavior?

---

## 📋 Category-Specific Issues

### Upload System
**Problem**: Upload stuck in "processing" phase
- Check EXIF parsing: `apps/web/src/app/core/upload.service.ts`
- Check hash computation: `apps/web/src/app/core/content-hash.util.ts`
- Check dedup logic: `apps/web/src/app/core/upload-manager.service.ts`

**Problem**: Large files fail to upload
- Check file size limits in Supabase
- Check timeout settings
- Consider chunked upload implementation

**Problem**: Duplicate detection not working
- Check `dedup_hashes` table exists
- Check hash computation consistency
- Verify RLS policies on dedup table

### Map System
**Problem**: Markers not showing
- Check MapAdapter initialization
- Verify data has coordinates
- Check marker cluster settings

**Problem**: Map not centering correctly
- Check coordinate format (lat, lng order)
- Verify projection (WGS84)
- Check map bounds calculations

**Problem**: User location not working
- Check GPS permissions
- Verify browser geolocation API
- Check user location marker service

### Search System
**Problem**: Search results empty
- Check search service initialization
- Verify database queries
- Check search index on relevant tables

**Problem**: Geocoding not working
- Check GeocodingAdapter
- Verify API keys/limits
- Check network requests to geocoding service

### Authentication
**Problem**: Login not working
- Check Supabase auth configuration
- Verify redirect URLs
- Check RLS policies on user tables

**Problem**: User session lost
- Check token refresh logic
- Verify session timeout settings
- Check browser storage for auth tokens

---

## 🛠️ Development Environment Issues

### Node Modules
**Problem**: Dependency conflicts
```bash
npm ERR! peer dep conflicts
```
**Solution**: Clean install
```bash
rm -rf node_modules package-lock.json
npm install
```

**Problem**: Angular CLI not found
```bash
ng: command not found
```
**Solution**: Use npx or install locally
```bash
npx ng serve
# or
npm install -g @angular/cli
```

### Supabase Local Development
**Problem**: Local Supabase not starting
```bash
Error: Supabase CLI not found
```
**Solution**: Install and configure
```bash
npm install -g supabase
supabase init
supabase start
```

**Problem**: Migrations not applying
```bash
Error: Migration already applied
```
**Solution**: Check migration status
```bash
supabase migration list
supabase db reset
```

### TypeScript Issues
**Problem**: Type errors with Supabase client
```bash
ERROR: Property 'client' does not exist on type 'SupabaseService'
```
**Solution**: Check service injection and types
```typescript
// ✅ Correct injection
private readonly supabase = inject(SupabaseService);

// ✅ Correct usage
this.supabase.client.from('table').select('*');
```

---

## 🧪 Testing Issues

### Unit Tests
**Problem**: Test fails with "Cannot find module"
```bash
ERROR: Cannot find module 'ngx-testing'
```
**Solution**: Install testing dependencies
```bash
npm install --save-dev @testing-library/angular
```

**Problem**: Async test timing out
```bash
ERROR: Test timeout exceeded
```
**Solution**: Use fakeAsync or waitForAsync
```typescript
it('should load data', fakeAsync(() => {
  component.loadData();
  tick(1000);
  expect(component.data()).not.toBeNull();
}));
```

### E2E Tests
**Problem**: Element not found
```bash
ERROR: Element with selector not found
```
**Solution**: Check component selectors and DOM structure
```typescript
// ✅ Use correct component selector
const element = fixture.debugElement.query(By.css('app-my-component'));

// ✅ Use data-testid for reliable selection
const element = fixture.debugElement.query(By.css('[data-testid="my-element"]'));
```

---

## 📊 Performance Issues

### Slow Loading
**Problem**: Initial page load slow
- Check bundle size: `ng build --stats-json`
- Analyze with: `webpack-bundle-analyzer`
- Implement lazy loading for routes

**Problem**: Map rendering slow
- Check marker count
- Implement clustering
- Use virtualization for large datasets

**Problem**: Search queries slow
- Add database indexes
- Implement query caching
- Use pagination for results

### Memory Leaks
**Problem**: Memory usage increases over time
- Check for unsubscribed observables
- Use `destroyRef` for cleanup
- Monitor with Chrome DevTools

**Solution**: Proper cleanup pattern
```typescript
private readonly destroyRef = inject(DestroyRef);

ngOnInit(): void {
  this.subscription = this.service.data$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(data => this.data.set(data));
}
```

---

## 🔧 Configuration Issues

### Environment Variables
**Problem**: Environment variables not loading
```bash
ERROR: undefined environment
```
**Solution**: Check environment files
```typescript
// ✅ Use environment interface
import { environment } from '../environments/environment';

// ✅ Access variables
const apiUrl = environment.supabaseUrl;
```

### CORS Issues
**Problem**: Cross-origin requests blocked
```bash
ERROR: CORS policy violation
```
**Solution**: Configure CORS in Supabase
```sql
-- Add to supabase/migrations
ALTER TABLE auth.users
ADD CONSTRAINT check_cors 
CHECK (email IS NOT NULL);
```

### Build Configuration
**Problem**: Production build fails
```bash
ERROR: Build optimization failed
```
**Solution**: Check build configuration
```bash
# Try development build first
ng build --configuration development

# Check for circular dependencies
ng build --stats-json
```

---

## 📱 Mobile-Specific Issues

### Touch Interactions
**Problem**: Touch events not working
- Check touch target size (≥48px)
- Verify touch event listeners
- Test on actual devices

**Problem**: Mobile layout broken
- Check responsive breakpoints
- Verify viewport meta tag
- Test mobile-specific CSS

### Performance
**Problem**: Slow on mobile
- Optimize images
- Reduce bundle size
- Implement lazy loading

---

## 🚀 Deployment Issues

### Build Failures
**Problem**: Production build fails
```bash
ERROR: Build failed with errors
```
**Solution**: Check environment differences
```bash
# Clean build
rm -rf dist
ng build --configuration production

# Check environment differences
ng build --c production --verbose
```

### Environment Variables
**Problem**: Missing production variables
- Check `.env.production` file
- Verify deployment configuration
- Check CI/CD environment setup

### Database Migrations
**Problem**: Migrations fail in production
```bash
ERROR: Migration constraint violation
```
**Solution**: Safe migration pattern
```sql
-- Use IF EXISTS for safe migrations
DROP TABLE IF EXISTS old_table;
```

---

## 📞 Getting Help

### Before Asking for Help
1. **Check the spec**: `docs/specs/...` (index at [`docs/specs/README.md`](specs/README.md))
2. **Check the glossary**: `docs/glossary.md`
3. **Check this guide**: Look for similar issues
4. **Search the codebase**: Use grep for similar patterns

### What to Include in Help Requests
1. **Error messages**: Full error stack traces
2. **Steps to reproduce**: What you did, what you expected
3. **Code snippets**: Relevant code sections
4. **Environment**: Node version, Angular version, browser

### Useful Commands for Debugging
```bash
# Check build
ng build --verbose

# Run tests with coverage
ng test --watch=false --code-coverage

# Check dependencies
npm ls

# Clean install
rm -rf node_modules package-lock.json && npm install

# Check TypeScript compilation
npx tsc --noEmit
```

---

## 🔄 Recovery Procedures

### Git Issues
**Problem**: Broken commit history
```bash
# Reset to last working commit
git reset --hard HEAD~1

# Stash changes and reset
git stash
git reset --hard origin/main
git stash pop
```

### Database Issues
**Problem**: Corrupted local database
```bash
# Reset local Supabase
supabase db reset
supabase start
```

### Environment Issues
**Problem**: Broken development environment
```bash
# Complete reset
rm -rf node_modules dist .angular
npm install
ng build
```

---

*Remember: Most issues are solved by checking the spec first and following the adapter pattern.*
