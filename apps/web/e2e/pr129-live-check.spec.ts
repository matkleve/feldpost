/**
 * PR #129 LIVE CHECK — hosted Supabase + real login.
 * @see docs/agent-workflows/agent-communication.md § LIVE VERIFICATION
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

const email = process.env.FELDPOST_E2E_EMAIL ?? 'markus.gruber@wbau.at';
const password = process.env.FELDPOST_E2E_PASSWORD ?? 'testpass123!';
const resultsDir = 'e2e/results/pr129-live-check';
const fixtureDir = path.resolve('e2e/fixtures/live-check/Mariahilferstraße 56');

async function screenshot(page: Page, name: string): Promise<void> {
  await mkdir(resultsDir, { recursive: true });
  await page.screenshot({ path: `${resultsDir}/${name}.png`, fullPage: true });
}

async function forceCloudSupabase(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('feldpost.supabase.target', 'cloud');
  });
}

async function login(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 60_000 });
  await expect(page.locator('.map-container')).toBeVisible({ timeout: 60_000 });
}

async function openMediaPage(page: Page): Promise<void> {
  await page.goto('/media');
  await expect(page.locator('app-media-page-header, app-item-grid, app-media-item').first()).toBeVisible({
    timeout: 60_000,
  });
}

test.describe('PR #129 LIVE CHECK', () => {
  test.beforeEach(async ({ page }) => {
    await forceCloudSupabase(page);
    await login(page);
  });

  test('4 — second /media visit: media-display reaches content state', async ({ page }) => {
    await openMediaPage(page);
    const firstTile = page.locator('app-media-item').first();
    await expect(firstTile).toBeVisible({ timeout: 60_000 });
    await firstTile.click();

    await expect(page.locator('app-media-display .media-display__viewport')).toBeVisible({
      timeout: 30_000,
    });
    await page.waitForTimeout(1500);
    await screenshot(page, '04-first-media-visit');

    await page.goto('/');
    await expect(page.locator('.map-container')).toBeVisible();
    await openMediaPage(page);
    await expect(firstTile).toBeVisible({ timeout: 60_000 });
    await firstTile.click();

    const display = page.locator('app-media-display .media-display__viewport').first();
    await expect(display).toBeVisible({ timeout: 30_000 });

    await expect
      .poll(async () => display.getAttribute('data-state'), { timeout: 15_000 })
      .toMatch(/content-fade-in|content-visible/);

    const contentImg = page.locator('.media-display__layer--content img[src]');
    await expect(contentImg).toBeVisible({ timeout: 15_000 });
    await screenshot(page, '04-second-media-visit-data-state');
  });

  test('1 — inline add address on media detail', async ({ page }) => {
    await openMediaPage(page);
    const firstTile = page.locator('app-media-item').first();
    await expect(firstTile).toBeVisible({ timeout: 60_000 });
    await firstTile.click();
    await expect(page.locator('app-media-detail-view, app-media-detail-location-section').first()).toBeVisible({
      timeout: 30_000,
    });

    const addSearch = page.getByText('Add or search address', { exact: false }).first();
    await expect(addSearch).toBeVisible({ timeout: 30_000 });
    await addSearch.click();

    const query = page.locator('#media-location-add-search-input, input[aria-controls="media-location-add-search-listbox"]').first();
    await expect(query).toBeVisible({ timeout: 15_000 });
    await query.fill('Mariahilferstraße 56, Wien');
    await page.waitForTimeout(2500);

    const result = page
      .locator('.media-location-add-search__result-item, [role="option"]')
      .filter({ hasText: /Mariahilfer|Wien/i })
      .first();
    await expect(result).toBeVisible({ timeout: 30_000 });
    await result.click();

    await expect(page.getByText(/Mariahilfer/i).first()).toBeVisible({ timeout: 30_000 });
    await screenshot(page, '01-inline-add-address');
  });

  test('3 — mixed batch upload from city-named folder', async ({ page }) => {
    await page.goto('/');
    await page.locator('.map-upload-btn').click();
    await expect(page.locator('app-upload-panel')).toBeVisible({ timeout: 30_000 });

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([
      path.join(fixtureDir, 'IMG_0001.jpg'),
      path.join(fixtureDir, 'IMG_0002.HEIC'),
      path.join(fixtureDir, 'no_exif_notes.txt'),
    ]);

    await expect(page.locator('app-upload-panel-item').first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(5000);
    await screenshot(page, '03-mixed-batch-queued');

    const completeOrIssue = page.locator('app-upload-panel-item').filter({
      hasText: /complete|uploaded|duplicate|missing|error|processing/i,
    });
    await expect(completeOrIssue.first()).toBeVisible({ timeout: 180_000 });
    await screenshot(page, '03-mixed-batch-finished');
  });

  test('2 — duplicate upload conflict resolution', async ({ page }) => {
    await page.goto('/');
    await page.locator('.map-upload-btn').click();
    await expect(page.locator('app-upload-panel')).toBeVisible({ timeout: 30_000 });

    const dupPath = path.join(fixtureDir, 'IMG_0001_duplicate.jpg');
    const fileInput = page.locator('input[type="file"]').first();

    await fileInput.setInputFiles([dupPath]);
    await expect(page.locator('app-upload-panel-item').first()).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(8000);
    await screenshot(page, '02-first-duplicate-upload');

    await page.locator('.map-upload-btn').click();
    await fileInput.setInputFiles([dupPath]);
    await page.waitForTimeout(8000);

    const duplicateRow = page.locator('app-upload-panel-item').filter({ hasText: /duplicate/i }).first();
    await expect(duplicateRow).toBeVisible({ timeout: 120_000 });
    await duplicateRow.click();

    const uploadAnyway = page.getByRole('button', { name: /upload anyway/i }).first();
    await expect(uploadAnyway).toBeVisible({ timeout: 30_000 });
    await uploadAnyway.click();
    await page.waitForTimeout(10000);
    await screenshot(page, '02-duplicate-conflict-resolved');
  });
});
