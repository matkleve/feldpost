# Setup Guide

**Who this is for:** engineers setting up Feldpost locally for development.  
**What you'll get:** a practical checklist to run the app with Supabase-backed services.

---

## 1. Prerequisites

- Node.js LTS (≥18)
- npm (≥9)
- Angular CLI (`npm install -g @angular/cli`)
- Supabase project (local via `supabase start` or hosted dashboard)
- Git

---

## 2. Repository Structure

The project is an npm monorepo:

```
feldpost/
  package.json          ← root workspace
  apps/
    web/                ← Angular SPA (standalone components)
      angular.json
      package.json
      src/
  supabase/
    config.toml         ← local Supabase config
  docs/                 ← architecture and design docs
```

Install all dependencies from the **root**:

```bash
git clone <repo-url>
cd feldpost
npm install
```

---

## 3. Environment Variables

Create `.env` (or your framework-specific env file) with:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never expose to browser bundles)

If geocoding is proxied through your backend, configure:

- `GEOCODING_PROVIDER`
- `GEOCODING_API_KEY` (if your provider requires one)

---

## 4. Database Setup

Apply schema, extensions, and RLS policies before starting the app. Run these in the Supabase SQL Editor (or via migration files).

### 4.1 Enable PostGIS

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
-- Verify:
SELECT PostGIS_Version();
```

This must run before creating any table that uses `geography` columns.

### 4.2 Create Core Tables

In order (respecting FK dependencies):

1. `organizations`
2. `profiles` (FK → organizations, auth.users)
3. `roles`
4. `user_roles` (FK → profiles, roles)
5. `projects` (FK → organizations, profiles)
6. `media_items` (FK → profiles, organizations) — includes `geog geography(Point, 4326)` column + trigger
7. `media_projects` (FK → media_items, projects)
8. `project_sections` (FK → projects, organizations, profiles)
9. `project_section_items` (FK → project_sections, media_items)
10. `metadata_keys` (FK → organizations, profiles)
11. `media_metadata` (FK → media_items, metadata_keys)
12. `share_sets` (FK → organizations, auth.users)
13. `share_set_items` (FK → share_sets, media_items)
14. `coordinate_corrections` (FK → media_items, profiles)

See `../architecture/database-schema.md` for full DDL.

### 4.3 Create Registration Trigger

The trigger on `auth.users` must:

- Require `raw_user_meta_data.invite_token_hash` and validate it against an active `qr_invites` row.
- Create a `profiles` row with `organization_id` from the invite.
- Assign role from `qr_invites.target_role` (`clerk`/`worker`, fallback `user`).
- Mark invite row as `accepted` with `accepted_user_id` and `accepted_at`.

See `user-lifecycle.md` §1.

### 4.4 Enable RLS

```sql
-- Enable RLS on every table with user/org-scoped data:
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_section_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_set_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinate_corrections ENABLE ROW LEVEL SECURITY;
```

Then apply policies from `../security-boundaries.md` §3.

### 4.5 Seed Baseline Data

```sql
-- Roles
INSERT INTO roles (name) VALUES ('admin'), ('user'), ('viewer'), ('clerk'), ('worker');

-- Default organization (required before any user can register)
INSERT INTO organizations (name) VALUES ('Default Organization');
```

### 4.6 Create Storage Bucket

In the Supabase dashboard (Storage → New Bucket):

- **Name:** `media` (legacy deployments may still include `images` during transition)
- **Public:** No (private bucket)
- **File size limit:** 25 MB
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `image/webp`, `video/mp4`, `application/pdf`

Then apply storage policies from `../security-boundaries.md` §4.

---

## 5. Run the App

From the repository root:

```bash
# Start the Angular dev server
npm run start
# or, from the web app directory:
cd apps/web
ng serve
```

Open `http://localhost:4200`.

For local Supabase (optional):

```bash
supabase start   # starts local Supabase stack (Postgres, Auth, Storage, etc.)
supabase status  # shows local URLs and keys
npm run supabase:ensure-edge   # after config.toml edge secret changes
```

Forward geocoding uses shared remote Photon when `GEOCODER_FORWARD_URL` is set in `supabase/config.toml`. See [remote-photon.md](remote-photon.md). Do not run `docker-compose.photon.yml` on your laptop unless you need offline fallback.

---

## 6. Tailwind CSS & Design Tokens

Feldpost uses Tailwind CSS v3 as the styling foundation.
The setup is already complete in the repository; this section explains how it
works and what to do if you reinstall or encounter issues.

### 6.1 How it is Wired

| File                          | Role                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| `apps/web/tailwind.config.js` | Token definitions + content paths + dark mode strategy      |
| `apps/web/postcss.config.js`  | PostCSS plugin registration (`tailwindcss`, `autoprefixer`) |
| `apps/web/src/styles.scss`    | `@tailwind base/components/utilities` directives at top     |

Angular's `@angular/build:application` (esbuild) picks up `postcss.config.js`
automatically — no changes to `angular.json` are needed.

### 6.2 Installing from Scratch

If you need to reinstall Tailwind (e.g., after deleting `node_modules`):

```bash
# From the Angular app directory
cd apps/web
npm install -D tailwindcss@3 postcss autoprefixer
```

> **Important:** Pin to `tailwindcss@3`. Tailwind v4 moved the PostCSS plugin to a
> separate `@tailwindcss/postcss` package and replaced `tailwind.config.js` with a
> CSS-based config. The project is intentionally on v3 for the JS-config approach.

The config files (`tailwind.config.js`, `postcss.config.js`) and the
`@tailwind` directives in `styles.scss` are already committed and require no
regeneration.

### 6.3 Dark Mode

Dark mode is controlled by a `[data-theme="dark"]` attribute on `<html>`:

```ts
// Angular ThemeService (to be implemented — M-IMPL4c)
document.documentElement.setAttribute("data-theme", "dark"); // enable
document.documentElement.removeAttribute("data-theme"); // disable
```

The OS fallback (`@media (prefers-color-scheme: dark)`) is also handled in
`styles.scss` and activates automatically when no explicit preference is set.

### 6.4 Design Token Source of Truth

All tokens are defined in `tailwind.config.js` and map to CSS custom properties
from `styles.scss`. **Never use raw values; always use tokens.**

**Border radius:**

| Tailwind class  | Token                | Value                                  |
| --------------- | -------------------- | -------------------------------------- |
| `rounded-pill`  | `var(--radius-full)` | 9999px — pills, chips, sidebar handles |
| `rounded-card`  | `var(--radius-lg)`   | 16px — floating panels, cards          |
| `rounded-input` | `var(--radius-md)`   | 8px — form inputs, dropdowns           |

**Minimum interactive hit area (`docs/design/constitution.md` — Sizes & Touch):**

Touch targets scale with root font size. Floors: **at least `3rem × 3rem` (48×48px)** for mobile / touch-first UI, and **at least `2.75rem × 2.75rem` (44×44px)** for desktop-aligned controls. Compact visuals are fine when the **actual** hit area still meets the floor (padding, negative margin compensation, or transparent hit zones).

`apps/web/tailwind.config.js` maps these to utilities (see `theme.extend.minHeight` / `minWidth`):

| Utility | Floor | Typical use |
| --- | --- | --- |
| `min-h-tap` / `min-w-tap` | `2.75rem` (44px) | Desktop-aligned control rows |
| `min-h-tap-lg` / `min-w-tap-lg` | `3rem` (48px) | Mobile / touch-first rows |

When a control is touch-first on small viewports but tightens on larger breakpoints, pair the large floor with the desktop floor — e.g. `min-h-tap-lg md:min-h-tap` (and the same pattern for `min-w-*`), matching the guidance in `tailwind.config.js`.

```html
<!-- ✅ control at desktop floor (44×44) -->
<button class="min-h-tap min-w-tap flex items-center justify-center ...">
  <span class="material-icons">close</span>
</button>

<!-- ✅ touch-first on small screens, desktop floor from md up -->
<button
  class="min-h-tap-lg min-w-tap-lg md:min-h-tap md:min-w-tap flex items-center justify-center ..."
>
  <span class="material-icons">close</span>
</button>

<!-- ✅ visually small element — hit area expanded with padding -->
<button class="p-spacing-2 -m-spacing-2 ...">
  <span class="material-icons text-sm">more_vert</span>
</button>
```

### 6.5 Adding a New Component (Dark Mode Checklist)

Every new component must include `dark:` Tailwind variants:

```html
<!-- ✅ correct — both light and dark covered -->
<div
  class="bg-bg-surface text-text-primary dark:bg-bg-elevated dark:text-text-primary"
>
  <!-- ❌ wrong — dark mode not specified; will look broken in dark theme -->
  <div class="bg-white text-gray-900"></div>
</div>
```

Failing to ship dark mode for a component is treated as a defect (see D9).

---

## 7. Verification Checklist

Run repository quality gates from root before opening a PR (especially for design-system docs, panel SCSS, or geometry logic):

```bash
npm run design-system:check
```

- [ ] `SELECT PostGIS_Version();` returns a version string.
- [ ] `npm run design-system:check` passes when design-system, panel SCSS, or geometry behavior changed.
- [ ] `organizations` table contains at least one row.
- [ ] Registration without invite is rejected.
- [ ] Registration with valid invite creates both `auth.users` and `profiles` (with invite `organization_id`).
- [ ] New invited users get role from invite target role.
- [ ] Upload stores files in `media/{org_id}/{user_id}/{uuid}.ext`.
- [ ] Thumbnails are generated and stored at `.../{uuid}_thumb.jpg`.
- [ ] Media records persist EXIF and corrected coordinate fields separately.
- [ ] `media_items.geog` is auto-populated by the trigger from lat/lng.
- [ ] Map requests are viewport-limited (not full-dataset fetches).
- [ ] Non-admin users cannot see rows from other organizations.
- [ ] Viewer-role users cannot INSERT/UPDATE/DELETE media rows.
- [ ] Signed URLs work for image retrieval (no public bucket access).

---

## 8. Common Failure Points

| Symptom                             | Likely Cause                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Supabase client fails to initialize | Missing `SUPABASE_URL` or `SUPABASE_ANON_KEY` in env.                                                                                            |
| Queries return empty results        | RLS enabled but policies not created yet.                                                                                                        |
| Uploads fail with 403               | Storage policy mismatch — check bucket name and path convention.                                                                                 |
| Registration fails                  | `organizations` table empty — seed a default org first.                                                                                          |
| Spatial queries don't work          | PostGIS extension not enabled, or `geog` column/trigger missing.                                                                                 |
| Geocoding not working locally       | `GEOCODING_PROVIDER` / `GEOCODING_API_KEY` not set.                                                                                              |
| CORS errors on Storage              | CORS config in Supabase dashboard missing `localhost:4200`.                                                                                      |
| Tailwind classes not generated      | `postcss.config.js` missing or `tailwindcss` not installed. Run `npm install -D tailwindcss postcss autoprefixer` in `apps/web/`.                |
| Dark mode not applying              | `[data-theme="dark"]` attribute not set on `<html>`. Check `ThemeService`. OS fallback in `styles.scss` should still apply for system dark mode. |
