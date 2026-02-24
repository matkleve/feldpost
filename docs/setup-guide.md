# Setup Guide

**Who this is for:** engineers setting up GeoSite locally for development.  
**What you'll get:** a practical checklist to run the app with Supabase-backed services.

---

## 1. Prerequisites

- Node.js LTS
- npm
- Supabase project (local or hosted)
- Git

---

## 2. Clone and Install

```bash
git clone <repo-url>
cd sitesnap
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

## 4. Database and Policies

Apply schema and RLS policies before starting the app:

1. Create core tables (`profiles`, `roles`, `user_roles`, `projects`, `images`, `metadata_keys`, `image_metadata`).
2. Create registration trigger for default profile + role assignment.
3. Enable and verify RLS on all user- or project-scoped tables.
4. Seed baseline roles (`admin`, `user`, `viewer`).

See `database-schema.md` and `security-boundaries.md`.

---

## 5. Run the App

```bash
npm run start
```

Open the local URL reported by the dev server.

---

## 6. Verification Checklist

- Registration creates both `auth.users` and `profiles`.
- New users get default role `user`.
- Upload stores files in user-scoped storage paths.
- Image records persist EXIF and corrected coordinate fields separately.
- Map requests are viewport-limited (not full-dataset fetches).
- Non-admin users cannot see unauthorized rows.

---

## 7. Common Failure Points

- Missing env vars for Supabase client initialization.
- RLS enabled but policies missing (results appear empty or blocked).
- Storage policy mismatch (uploads fail despite valid auth).
- Geocoding adapter not configured for local environment.
