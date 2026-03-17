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
