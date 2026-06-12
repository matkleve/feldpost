# E2E (Playwright)

## Phase 10 manual matrix (automated)

```bash
cd apps/web
npx playwright install chromium   # once

export FELDPOST_E2E_EMAIL='you@example.com'
export FELDPOST_E2E_PASSWORD='your-password'

npm run e2e:phase10
```

Screenshots: `e2e/results/`. HTML report: `npx playwright show-report`.

Reuses `e2e/.auth/user.json` on later runs if present (gitignored).

## One-off auth file only

```bash
export FELDPOST_E2E_EMAIL=... FELDPOST_E2E_PASSWORD=...
npx playwright test e2e/auth.setup.ts
```

Requires a minimal `setup` project in config or run login via `e2e:phase10` once with env set.
