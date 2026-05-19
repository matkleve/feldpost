/**
 * Phase 10 high-risk mixed-surface matrix (automated structural + screenshot pass).
 * @see docs/migration/phase-10-manual-matrix.md
 *
 * Auth (pick one):
 * 1. `FELDPOST_E2E_EMAIL` + `FELDPOST_E2E_PASSWORD` — logs in once per run
 * 2. Reuse `e2e/.auth/user.json` from a prior successful run (`npx playwright test e2e/auth.setup.ts` with env set)
 */
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { test as base, expect } from '@playwright/test';

const AUTH_FILE = 'e2e/.auth/user.json';
const email = process.env.FELDPOST_E2E_EMAIL;
const password = process.env.FELDPOST_E2E_PASSWORD;
const hasCredentials = Boolean(email && password);
const hasStoredAuth = existsSync(AUTH_FILE);

const test = base.extend({
  storageState: async ({}, use) => {
    if (hasStoredAuth) {
      await use(AUTH_FILE);
    } else {
      await use(undefined);
    }
  },
});

test.beforeAll(async ({ browser }) => {
  test.skip(
    !hasCredentials && !hasStoredAuth,
    'Set FELDPOST_E2E_EMAIL + FELDPOST_E2E_PASSWORD, or create e2e/.auth/user.json via auth.setup.ts',
  );

  if (hasStoredAuth || !hasCredentials) {
    return;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/auth/login');
  await page.locator('#login-email').fill(email!);
  await page.locator('#login-password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
  await expect(page.locator('.map-container')).toBeVisible({ timeout: 30_000 });
  await mkdir('e2e/.auth', { recursive: true });
  await context.storageState({ path: AUTH_FILE });
  await context.close();
});

const THEMES = [
  { id: 'light', dataTheme: null as string | null },
  { id: 'dark', dataTheme: 'dark' },
  { id: 'sandstone', dataTheme: 'sandstone' },
] as const;

async function applyTheme(
  page: import('@playwright/test').Page,
  dataTheme: string | null,
): Promise<void> {
  await page.evaluate((attr) => {
    if (!attr) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', attr);
    }
  }, dataTheme);
}

async function screenshot(
  page: import('@playwright/test').Page,
  name: string,
): Promise<void> {
  await mkdir('e2e/results', { recursive: true });
  await page.screenshot({ path: `e2e/results/${name}.png`, fullPage: false });
}

test.describe('Phase 10 — map shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.map-container')).toBeVisible();
  });

  for (const theme of THEMES) {
    test(`map-shell — ${theme.id}`, async ({ page }, testInfo) => {
      await applyTheme(page, theme.dataTheme);
      const tag = `${theme.id}-${testInfo.project.name}`;

      await expect(page.locator('.map-style-switch [hlmToggleGroup]')).toBeVisible();
      await expect(page.locator('.map-upload-btn')).toBeVisible();

      await screenshot(page, `map-shell-${tag}`);
    });
  }
});

test.describe('Phase 10 — upload panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.map-container')).toBeVisible();
  });

  for (const theme of THEMES) {
    test(`upload-panel — ${theme.id}`, async ({ page }, testInfo) => {
      await applyTheme(page, theme.dataTheme);
      const tag = `${theme.id}-${testInfo.project.name}`;

      await page.locator('.map-upload-btn').click();
      await expect(page.locator('app-upload-panel')).toBeVisible();
      await expect(page.locator('[hlmToggleGroup]').first()).toBeVisible();

      await screenshot(page, `upload-panel-${tag}`);
    });
  }
});

test.describe('Phase 10 — settings overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.map-container')).toBeVisible();
  });

  for (const theme of THEMES) {
    test(`settings-overlay — ${theme.id}`, async ({ page }, testInfo) => {
      await applyTheme(page, theme.dataTheme);
      const tag = `${theme.id}-${testInfo.project.name}`;

      await page.getByRole('button', { name: /open settings overlay/i }).click();
      await expect(page.locator('ss-settings-overlay .settings-overlay')).toBeVisible();
      await expect(page.locator('ss-settings-overlay [hlmToggleGroup]').first()).toBeVisible();
      await expect(page.locator('ss-settings-overlay [hlmSwitch]').first()).toBeVisible();

      await screenshot(page, `settings-overlay-${tag}`);
    });
  }
});
