import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, resetServer, test } from './helpers.ts';

test.beforeEach(async ({ request }) => resetServer(request));

const XSS = '<img src=x onerror="window.__pwned=1">';
const hostile = {
  v: 1,
  savedAt: 'soon',
  done: { 'm90-s01': 1, [XSS]: 2, __proto__: 3, constructor: 4, 'm90-s02': 'x' },
  checks: [XSS],
  answers: { 'q-m90-s01': { right: XSS } },
  settings: { labDomain: `"><script>window.__pwned=1</script>`, labSeed: XSS, theme: `dark" onload="x`, effects: XSS },
  extra: { nested: XSS },
};

test('a hostile imported state is bounded and never reaches the page as markup', async ({ page }) => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lgtm-hostile-')), 'progress.json');
  fs.writeFileSync(file, JSON.stringify(hostile));
  await page.goto('/settings/');
  await page.locator('[data-import]').setInputFiles(file);
  await expect(page.locator('[data-settings-message]')).toHaveText('Progress imported: 1 completed steps.');
  await expect(page.getByLabel('Lab domain')).toHaveValue('lab.k8s.local');

  await page.goto('/');
  await expect(page.locator('[data-module="m90"] [data-progress]')).toHaveText('1 of 7 steps done');
  await page.goto('/m/m90/s01/');
  await expect(page.getByRole('link', { name: 'Explore in Grafana' })).toHaveAttribute('href', 'http://grafana.lab.k8s.local/explore');
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  expect(await page.evaluate(() => ({}) as Record<string, unknown>)).toEqual({});
});

test('a hostile server copy is bounded the same way', async ({ page, request }) => {
  const cur = await (await request.get('/api/state')).json();
  await request.put('/api/state', { headers: { 'Content-Type': 'application/json', 'If-Match': `"${cur.rev}"` }, data: hostile });
  await page.goto('/');
  await expect(page.locator('[data-module="m90"] [data-progress]')).toHaveText('1 of 7 steps done');
  await page.goto('/settings/');
  await expect(page.getByLabel('Lab seed')).toHaveValue('');
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});

test('the server refuses a cross-site write', async ({ request }) => {
  const res = await request.put('/api/state', {
    headers: { 'Content-Type': 'application/json', 'If-Match': '"1"', Origin: 'http://evil.example', 'Sec-Fetch-Site': 'cross-site' },
    data: { v: 1 },
  });
  expect(res.status()).toBe(403);
});
