import { expect, pullNow, resetServer, test } from './helpers.ts';

test.beforeEach(async ({ request }) => resetServer(request));

test('two browser contexts converge within one sync cycle', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await a.goto('/m/m90/s01/');
  await b.goto('/m/m90/s07/');

  // A completes a step and pushes it (800 ms after the change).
  const pushed = a.waitForResponse((r) => r.url().endsWith('/api/state') && r.request().method() === 'PUT' && r.status() === 200);
  await a.locator('[data-mark-complete]').click();
  await pushed;

  // One pull on B brings it in.
  await b.goto('/');
  await expect(b.locator('[data-module="m90"] [data-progress]')).toHaveText('1 of 7 steps done');

  // Both change something before either has seen the other: the merge keeps both.
  await a.goto('/m/m90/s07/');
  await b.goto('/m/m91/s01/');
  const aPut = a.waitForResponse((r) => r.url().endsWith('/api/state') && r.request().method() === 'PUT' && r.status() === 200);
  await a.locator('[data-mark-complete]').click();
  await aPut;
  // B has not pulled since A pushed, so its push meets a 409, merges and pushes again.
  const bConflict = b.waitForResponse((r) => r.url().endsWith('/api/state') && r.request().method() === 'PUT' && r.status() === 409);
  const bPut = b.waitForResponse((r) => r.url().endsWith('/api/state') && r.request().method() === 'PUT' && r.status() === 200);
  await b.locator('[data-mark-complete]').click();
  await bConflict;
  await bPut;

  // One more sync cycle on A: both copies hold all three steps.
  await pullNow(a);
  await a.goto('/');
  await b.goto('/');
  for (const p of [a, b]) {
    await expect(p.locator('[data-module="m90"] [data-progress]')).toHaveText('2 of 7 steps done');
    await expect(p.locator('[data-module="m91"] [data-progress]')).toHaveText('1 of 1 steps done');
  }
  await a.context().close();
  await b.context().close();
});

test('a context that missed nothing costs a 304', async ({ page }) => {
  const first = page.waitForResponse((r) => r.url().endsWith('/api/state'));
  await page.goto('/');
  await first;
  const next = page.waitForResponse((r) => r.url().endsWith('/api/state'));
  await pullNow(page);
  expect((await next).status()).toBe(304);
});
