import { expect, resetServer, test } from './helpers.ts';

const ORIGIN = 'http://localhost:8096';

test.beforeEach(async ({ request }) => resetServer(request, ORIGIN, '/h2'));

test('the site works under BASE_PATH=/h2', async ({ page }) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/state')) api.push(new URL(r.url()).pathname);
  });
  await page.goto(`${ORIGIN}/h2/`);
  await expect(page.locator('[data-continue]')).toHaveAttribute('href', '/h2/m/m90/s01/');
  await page.locator('[data-continue]').click();
  await expect(page).toHaveURL(`${ORIGIN}/h2/m/m90/s01/`);
  const put = page.waitForResponse((r) => r.request().method() === 'PUT' && r.status() === 200);
  await page.locator('[data-mark-complete]').click();
  await put;
  await page.getByRole('link', { name: 'Next' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/h2/m/m90/s02/`);
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(`${ORIGIN}/h2/settings/`);
  expect(api.length).toBeGreaterThan(0);
  expect(api.every((p) => p === '/h2/api/state')).toBe(true);
  // Styles and scripts load from under the prefix.
  const assets = await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet], script[src]')].map((e) => e.getAttribute('href') ?? e.getAttribute('src')));
  expect(assets.every((a) => a?.startsWith('/h2/'))).toBe(true);
  // Nothing is served outside the prefix.
  expect((await page.request.get(`${ORIGIN}/`)).status()).toBe(404);
});
