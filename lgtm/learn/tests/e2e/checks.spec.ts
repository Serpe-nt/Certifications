import crypto from 'node:crypto';
import { expect, resetServer, test } from './helpers.ts';

test.beforeEach(async ({ request }) => resetServer(request));

const SEED = '0123456789abcdef';
const token = (slot: string) => crypto.createHmac('sha256', SEED).update(slot).digest('hex').slice(0, 8);

async function answer(page: import('@playwright/test').Page, text: string) {
  await page.locator('[data-block="check"] input.field').fill(text);
  await page.getByRole('button', { name: 'Check' }).click();
}

test('exact: wrong, then right; Mark complete waits for the check', async ({ page }) => {
  await page.goto('/m/m90/s02/');
  await expect(page.locator('[data-mark-complete]')).toBeDisabled();
  await answer(page, 'nope');
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'wrong');
  await answer(page, '  READY ');
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'pass');
  await expect(page.locator('[data-mark-complete]')).toBeEnabled();
});

test('regex', async ({ page }) => {
  await page.goto('/m/m90/s03/');
  await answer(page, 'abc');
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'wrong');
  await answer(page, '4bf92f3577b34da6a3ce929d0e0e4736');
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'pass');
});

test('range', async ({ page }) => {
  await page.goto('/m/m90/s04/');
  await answer(page, 'fast');
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'not-a-number');
  await answer(page, '0.9');
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'wrong');
  await answer(page, '0.25');
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'pass');
});

test('choice', async ({ page }) => {
  await page.goto('/m/m90/s05/');
  await page.getByLabel('Latency').check();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'wrong');
  await page.getByLabel('Error ratio').check();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'pass');
});

test('token: needs the seed, then accepts the token computed from it', async ({ page }) => {
  await page.goto('/m/m90/s06/');
  await answer(page, token('log-m90-1'));
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'no-seed');
  await page.getByRole('link', { name: 'Open the settings' }).click();
  await page.getByLabel('Lab seed').fill('not a seed');
  await page.locator('[data-save-seed]').click();
  await expect(page.locator('[data-settings-message]')).toContainText('16 characters');
  await page.getByLabel('Lab seed').fill(SEED.toUpperCase());
  await page.locator('[data-save-seed]').click();
  await expect(page.locator('[data-settings-message]')).toHaveText('Lab seed saved.');
  await page.goto('/m/m90/s06/');
  await answer(page, 'deadbeef');
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'wrong');
  await answer(page, token('log-m90-1'));
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'pass');
  // A passed check is remembered.
  await page.reload();
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'pass');
});
