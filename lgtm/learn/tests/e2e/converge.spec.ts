// Three devices change different things while offline, come back, and end with the same copy.
import type { Page } from '@playwright/test';
import { expect, pullNow, resetServer, test } from './helpers.ts';
import { answer, loadBank, saved } from './study.ts';

test.beforeEach(async ({ request }) => resetServer(request));

const isPut = (r: { url(): string; request(): { method(): string }; status(): number }) => r.url().endsWith('/api/state') && r.request().method() === 'PUT' && r.status() === 200;

/** The saved copy without its save time, which differs per device by design. */
async function comparable(p: Page): Promise<string> {
  const s = await saved(p);
  delete s.savedAt;
  return JSON.stringify(s);
}

test('three browser contexts changed offline in different ways converge', async ({ browser }) => {
  const open = async (url: string) => {
    const p = await (await browser.newContext()).newPage();
    const first = p.waitForResponse((r) => r.url().endsWith('/api/state') && r.request().method() === 'GET');
    await p.goto(url);
    await first;
    return p;
  };
  const a = await open('/m/m90/s01/');
  const b = await open('/m/m90/quiz/');
  const c = await open('/m/m91/s01/');
  const bank = await loadBank(b);
  // The card question hydrates when it comes into view; load its script before the network goes.
  await a.locator('[data-question]').scrollIntoViewIfNeeded();
  await expect(a.getByRole('radio', { name: 'A metric' })).toBeEnabled();
  for (const p of [a, b, c]) await p.context().setOffline(true);

  // A completes a step and answers its card question.
  await a.locator('[data-mark-complete]').click();
  await a.getByRole('radio', { name: 'A metric' }).check();
  await a.getByRole('button', { name: 'Check answer' }).click();
  // B starts the module quiz and answers three questions.
  await b.locator('[data-start-quiz]').click();
  for (let k = 0; k < 3; k++) {
    await answer(b, bank, k !== 1);
    await b.locator('[data-next-open]').click();
  }
  // C completes another module's step.
  await c.locator('[data-mark-complete]').click();
  // The quiet notice says the change stays on the device for now.
  await expect(a.locator('#sync-status')).toHaveText('Offline: saved on this device', { timeout: 10_000 });

  // Back online one after the other: each pull merges with what is on the server and pushes.
  for (const p of [a, b, c]) {
    await p.context().setOffline(false);
    const put = p.waitForResponse(isPut);
    await pullNow(p);
    await put;
  }
  // One more pull each, and all three hold the same copy.
  for (const p of [a, b, c]) {
    const got = p.waitForResponse((r) => r.url().endsWith('/api/state') && r.request().method() === 'GET');
    await pullNow(p);
    await got;
  }
  const docs = await Promise.all([a, b, c].map(comparable));
  expect(new Set(docs).size).toBe(1);

  // The documented result: the union of completed steps, the card answer, the quiz run with its
  // three answers and their history, and the miss waiting for review.
  const s = await saved(a);
  expect(Object.keys(s.done as object).sort()).toEqual(['m90-s01', 'm91-s01']);
  expect((s.answers as Record<string, { right: boolean }>)['q-m90-s01'].right).toBe(true);
  expect(Object.keys((s.run as { ans: object }).ans)).toHaveLength(3);
  expect(Object.keys(s.qs as object)).toHaveLength(3);
  expect(Object.keys(s.srs as object)).toHaveLength(1);
  await a.goto('/');
  await expect(a.locator('[data-module="m90"] [data-progress]')).toHaveText('1 of 7 steps done');
  await expect(a.locator('[data-module="m91"] [data-progress]')).toHaveText('1 of 1 steps done');
  for (const p of [a, b, c]) await p.context().close();
});
