# Cloudflare Pages Deployment Security Runbook

This runbook prepares Feldpost for production hosting on Cloudflare Pages.

## 1. Build and output

- Project root in Cloudflare Pages: `apps/web`
- Build command: `npm run build:cloudflare`
- Build output directory: `dist/web/browser`

`build:cloudflare` writes `src/environments/environment.ts` from:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 2. SPA routing

Cloudflare Pages SPA fallback is provided via:

- `apps/web/public/_redirects`

Expected line:

```text
/* /index.html 200
```

This guarantees deep links like `/auth/register?invite=...` resolve correctly.

## 3. Security headers

Cloudflare static response headers are provided via:

- `apps/web/public/_headers`

Validate in production:

```bash
curl -I https://<your-pages-domain>
```

Expected:

- `Content-Security-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Permissions-Policy`
- `Strict-Transport-Security`

## 4. Supabase auth configuration (invite-only)

- Keep email signup enabled in Supabase (`enable_signup = true`) because registration is now gated by DB trigger validation.
- Password hardening in `supabase/config.toml`:
  - `minimum_password_length = 12`
  - `password_requirements = "lower_upper_letters_digits_symbols"`
- Ensure Auth redirect allow-list includes:
  - `https://<your-pages-domain>/auth/update-password`
  - local dev URL(s) as needed

## 5. Invite-only acceptance checks

- [ ] `/auth/register` without invite fails server-side with invite-required error.
- [ ] `/auth/register?invite=<valid token>` pre-fills code and can create account.
- [ ] Invite cannot be reused after acceptance.
- [ ] Expired/revoked invite cannot create account.
- [ ] New user lands in invite organization and target role.

## 6. Release day checklist

- [ ] Build succeeds on Cloudflare Pages with production env vars.
- [ ] SPA deep links resolve (including register invite links).
- [ ] Security headers present on main routes.
- [ ] Password reset flow works on Cloudflare domain.
- [ ] Invite-only checks pass.

## 7. Geocode edge function hardening

- `supabase/config.toml` sets `verify_jwt = true` for `functions.geocode`.
- `ALLOWED_ORIGINS` must be configured in production. If it is empty, browser-origin calls are denied (fail-closed).
- Recommended value pattern:
  - `ALLOWED_ORIGINS=https://<your-pages-domain>,http://localhost:4200`

Validation:

- Browser request from a non-allowlisted origin returns `403 Origin not allowed`.
- Browser request from allowlisted origin with valid JWT succeeds.

## 8. Storage orphan cleanup (GDPR accountability)

Migration `supabase/migrations/20260318130000_storage_orphan_cleanup_job.sql` adds:

- `public.storage_cleanup_runs` audit table
- API-mode discovery function (`public.list_orphaned_storage_paths`) is added via `20260318143000_storage_cleanup_api_mode.sql`
- Cleanup execution script: `node scripts/cleanup-storage-orphans.mjs 1000`

Validation:

- [ ] `select * from public.storage_cleanup_runs order by started_at desc limit 5;` returns recent runs.
- [ ] `node scripts/cleanup-storage-orphans.mjs 1000` succeeds.
- [ ] Orphaned objects in `storage.objects` for bucket `images` are deleted and counted in `deleted_count`.

## 9. P0 verification quick path

1. Run SQL checks from:

- `scripts/validate-dsgvo-security.sql`

2. Verify headers on production domain:

- `curl -I https://<your-pages-domain>`

3. Verify geocode access behavior:

- unallowlisted origin => `403 Origin not allowed`
- missing JWT => denied
- allowlisted origin + valid JWT => success

4. Verify cross-org isolation and viewer write-block with two users.
5. Record evidence in `docs/cloudflare-dsgvo-security-spec.md`.
