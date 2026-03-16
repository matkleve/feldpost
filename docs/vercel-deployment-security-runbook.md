# Vercel Deployment Security Runbook

This runbook turns the release security spec into executable steps for Feldpost.

---

## 1. Prerequisites

- Vercel project root directory is set to `apps/web`.
- Supabase production project exists.
- Domain is known (for example `feldpost.vercel.app` or custom domain).

---

## 2. Vercel environment variables

Set these variables in Vercel project settings:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Build integration:

- `apps/web/vercel.json` uses `npm run build:vercel`.
- `apps/web/scripts/write-env.mjs` writes `src/environments/environment.ts` from Vercel env vars at build time.

Verification:

- Build logs contain `[write-env] wrote production environment.ts from process environment`.

---

## 3. Security headers

Headers are defined in `apps/web/vercel.json`.

Validation command:

```bash
curl -I https://<your-domain>
```

Expected headers include:

- `Content-Security-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Permissions-Policy`
- `Strict-Transport-Security`

---

## 4. Supabase auth redirect allow-list

In Supabase Auth settings, allow only required production URLs plus localhost for development:

- `https://<your-domain>/auth/update-password`
- `http://localhost:4200/auth/update-password` (dev only)

Also set the site URL to your production frontend domain.

---

## 5. Edge function CORS allow-list

Set this secret for the `geocode` edge function:

- `ALLOWED_ORIGINS=https://<your-domain>,http://localhost:4200`

Behavior:

- Requests from non-allowlisted browser origins get `403 Origin not allowed`.
- If `ALLOWED_ORIGINS` is empty, the function falls back to permissive mode for backward compatibility.

---

## 6. Release-day acceptance checks

- [ ] Cross-org isolation tested with two org users.
- [ ] Viewer write-block confirmed.
- [ ] Signed URL expiry validated.
- [ ] Password reset flow validated on production domain.
- [ ] Security headers validated in production response.

---

## 7. Rollback

If release fails:

1. Re-deploy previous successful Vercel deployment.
2. Verify authentication and map loading.
3. Confirm Supabase error rates return to baseline.
4. Announce rollback in team channel and log incident details.
