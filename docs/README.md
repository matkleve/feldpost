# Feldpost Documentation

**Geo-temporal image management for construction companies**  
Angular SPA + Leaflet map + Supabase (Auth, PostgreSQL + PostGIS, Storage)

---

## 🚀 Quick Start

### New to Feldpost?

- **[Agent Quick Reference](agent-workflows/agent-quick-reference.md)** - Daily work cheat sheet (<30 sec find)
- **[Glossary](glossary.md)** - Canonical terminology (use exact names)
- **[Project Structure](#project-structure)** - Where files live
- **[Contributing Guide](../CONTRIBUTING.md)** - Required local checks before PR

### Implementing Features?

1. **[Specs (`specs/`)](specs/)** - UI + service implementation contracts (**SOURCE OF TRUTH**)
2. **[Service specs (`specs/service/`)](specs/service/README.md)** - Facades, adapters, RPC boundaries (`docs/specs/service/README.md` index)
3. **[Agent Workflows](agent-workflows/)** - Checklists & guides
4. **[Security Boundaries](security-boundaries.md)** - RLS & security model

### Debugging Issues?

- **[Agent Quick Reference](agent-workflows/agent-quick-reference.md#troubleshooting)** - Common fixes
- **[Architecture](architecture.md)** - System design & patterns
- **[Database Schema](architecture/database-schema.md)** - Tables & relationships

---

## 📁 Project Structure

```
feldpost/
├── apps/web/                    # Angular frontend
│   ├── src/app/
│   │   ├── core/                # Services, adapters, utilities
│   │   ├── features/            # Feature components
│   │   ├── shared/              # Reusable UI components
│   │   └── styles.scss          # Global styles
│   └── package.json
├── supabase/                     # Database & auth
│   ├── migrations/              # SQL schema changes
│   └── seed_i18n.sql           # Translation data
├── docs/                         # Documentation (this folder)
│   ├── specs/                   # UI + service contracts (source of truth)
│   ├── audits/                  # Historical inventories (see audits/README.md)
│   ├── design/                  # Design tokens & layout
│   ├── agent-workflows/         # Agent guides
│   └── glossary.md              # Terminology
├── scripts/                      # Automation scripts
└── AGENTS.md                     # Detailed agent guidelines
```

---

## 🎯 "I want to..." Quick Navigation

### **Implement a UI Element**

1. [Find the spec](specs/README.md) → Read contract
2. [Service module index](specs/service/README.md) for facades touching the change
3. [Follow agent workflow](agent-workflows/element-spec-format.md)
4. [Verify with checklist](agent-workflows/implementation-checklist.md)

### **Debug Existing Code**

- [Quick Reference troubleshooting](agent-workflows/agent-quick-reference.md#troubleshooting)
- [Security boundaries](security-boundaries.md) for RLS issues
- [Architecture patterns](architecture.md) for adapter usage

### **Add New Settings**

1. Add `## Settings` to element spec
2. Run `node scripts/lint-specs.mjs --fix`
3. Check [settings registry](settings-registry.md)

### **Add Internationalization**

1. Update [translation workbench](i18n/translation-workbench.csv)
2. Run `node scripts/import-i18n-csv-to-sql.mjs`
3. Commit updated `supabase/seed_i18n.sql`

### **Understand the System**

- [Glossary](glossary.md) - All domain terms
- [Architecture](architecture.md) - System design
- [Database Schema](architecture/database-schema.md) - Data model
- [Security Boundaries](security-boundaries.md) - Access control

### **Set Up Development**

```bash
npm install
cd apps/web && ng serve
```

See [Agent Quick Reference](agent-workflows/agent-quick-reference.md#development-commands) for all commands.

### **Before Opening a PR**

- Run [Contributing Guide checks](../CONTRIBUTING.md)
- Ensure `npm run design-system:check` is green for design-system relevant changes

---

## 📚 Key Documentation

### Core Contracts (Must Read)

- **[Specs (`specs/`)](specs/)** - Implementation contracts (**SOURCE OF TRUTH**)
- **[Glossary](glossary.md)** - Canonical terminology
- **[Security Boundaries](security-boundaries.md)** - RLS security model
- **[Architecture](architecture.md)** - System design patterns

### Design & UX

- **[Design Overview](design/README.md)** - Design principles
- **[Design Tokens](design/tokens.md)** - CSS variables
- **[Layout Rules](design/layout.md)** - Layout patterns
- **[Design Constitution](design/constitution.md)** - Non-negotiable rules

### Implementation Guides

- **[Agent Quick Reference](agent-workflows/agent-quick-reference.md)** - Daily work cheat sheet
- **[Agent Workflows](agent-workflows/)** - Detailed guides & checklists
- **[Service specs index](specs/service/README.md)** - `core/` ↔ service contracts
- **[Setup Guide](playbooks/setup-guide.md)** - Environment setup

### Reference

- **[Database Schema](architecture/database-schema.md)** - Tables & relationships
- **[User Lifecycle](user-lifecycle.md)** - Auth flows
- **[Role Permissions](playbooks/security/role-permissions.md)** - Access control
- **[Settings Registry](settings-registry.md)** - All user settings

---

## 🔧 Development Commands

```bash
# Setup
npm install

# Development
cd apps/web && ng serve          # Start dev server
cd apps/web && ng test          # Run tests
cd apps/web && ng build         # Build (required before commits)

# Documentation
node scripts/lint-specs.mjs            # Validate element specs
node scripts/lint-specs.mjs --fix      # Fix spec registry
node scripts/import-i18n-csv-to-sql.mjs # Update translations

# Database
npx supabase db push              # Apply migrations
npx supabase db reset             # Reset local DB
```

---

## 🏗️ Architecture Patterns

### Adapter Pattern (Required)

```typescript
// ✅ Use adapters
import { MapAdapter } from "../core/map.adapter";
import { SupabaseService } from "../core/supabase.service";

// ❌ Never call directly
import { L } from "leaflet";
import { createClient } from "@supabase/supabase-js";
```

### Component Pattern

- **Standalone components** (no NgModules)
- **Angular signals** for state
- **`inject()`** for dependencies
- **SCSS** for styling
- **Shared components** from `apps/web/src/app/shared/`

### Security Model

- **RLS is security boundary** - Frontend is untrusted
- **Organization-scoped data** - All queries filter by `organization_id`
- **Adapter pattern** - Never call external services directly
- **Server validation** - Client validation is UX only

---

## 🔒 Security Rules

1. **Row-Level Security (RLS)** enforces all data access
2. **Never bypass adapters** - Use `MapAdapter`, `SupabaseService`, `GeocodingAdapter`
3. **Organization scope** - All data must be organization-scoped
4. **Server-side validation** - Client validation is UX only
5. **No hardcoded secrets** - Use environment variables

See [Security Boundaries](security-boundaries.md) for complete security model.

---

## 🎨 Design Principles

- **Field-first, map-primary** - Map is the main interface
- **Progressive disclosure** - Show details on demand
- **Warmth, calm confidence** - Use warm, calm design language
- **Mobile-first** - Touch targets ≥48px
- **Shared primitives** - Reuse UI components

See [Design Constitution](design/constitution.md) for non-negotiable rules.

---

## 📞 Getting Help

1. **Check the spec first** - Element specs are source of truth
2. **Check the glossary** - Use exact terminology
3. **Check security docs** - Understand RLS boundaries
4. **Ask for clarification** - Better than guessing

---

_Remember: Specs are contracts. Code must match specs, not the other way around._
