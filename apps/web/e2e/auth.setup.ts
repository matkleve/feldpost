import { mkdir } from 'node:fs/promises';
import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';
const email = process.env.FELDPOST_E2E_EMAIL;
const password = process.env.FELDPOST_E2E_PASSWORD;

setup('authenticate', async ({ page }) => {
  setup.skip(
    !email || !password,
    'Set FELDPOST_E2E_EMAIL and FELDPOST_E2E_PASSWORD to run Phase 10 browser matrix.',
  );

  await page.goto('/auth/login');
  await page.locator('#login-email').fill(email!);
  await page.locator('#login-password').fill(password!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 30_000 });
  await expect(page.locator('.map-container')).toBeVisible({ timeout: 30_000 });

  await mkdir('e2e/.auth', { recursive: true });
  await page.context().storageState({ path: authFile });
});
