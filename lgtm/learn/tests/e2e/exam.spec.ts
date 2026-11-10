// The mock exams: the draw by domain, a reload and a second device in the middle, the quiet
// screen, the result per domain, and the clock that submits when time is up.
import { expect, pullNow, resetServer, test } from './helpers.ts';
import { at, loadBank, pick, saved } from './study.ts';

test.beforeEach(async ({ request }) => resetServer(request));

const SPLIT = { P1: 11, P2: 12, P3: 17, P4: 9, P5: 11 };

test('a PCA mock exam draws 60 by domain, survives a reload and another device, and ends with a result per domain', async ({ browser, page }) => {
  await page.goto('/exam/pca/');
  for (const [d, n] of Object.entries(SPLIT)) await expect(page.locator(`[data-exam-split] [data-domain="${d}"] [data-count]`)).toHaveText(String(n));
  const bank = await loadBank(page);
  await page.locator('[data-start-exam]').click();
  await expect(page.locator('.q-square')).toHaveCount(60);

  // The draw: exactly the official count per domain.
  const exam = (await saved(page)).exam as { ids: string[]; end: number; t0: number };
  const domains: Record<string, number> = {};
  for (const id of exam.ids) {
    const d = bank.questions.find((q) => q.id === id)!.domain;
    domains[d] = (domains[d] ?? 0) + 1;
  }
  expect(domains).toEqual(SPLIT);
  expect(exam.end - exam.t0).toBe(90 * 60_000);
  await expect(page.locator('[data-clock]')).toHaveText(/^1:(30:00|29:\d\d)$/);

  // Answer ten right and flag one. The screen stays quiet: no explanations, no effects, no sounds.
  for (let k = 0; k < 10; k++) {
    await pick(page, bank, true);
    if (k === 3) await page.locator('[data-flag]').click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.locator('[data-why]')).toHaveCount(0);
  await expect(page.locator('[data-celebration]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.dataset.fxAnswer ?? '')).toBe('');
  await expect(page.getByText('Question 11 of 60. 10 answered, 1 flagged.')).toBeVisible();
  const put = page.waitForResponse((r) => r.url().endsWith('/api/state') && r.request().method() === 'PUT' && r.status() === 200);
  await put;

  // A reload continues the same exam at the same question.
  await page.reload();
  await expect(page.getByText('Question 11 of 60. 10 answered, 1 flagged.')).toBeVisible();
  await expect(page.locator('.q-square[data-flagged="true"]')).toHaveCount(1);

  // Another device continues it too and answers one more.
  const phone = await (await browser.newContext()).newPage();
  await phone.goto('/exam/pca/');
  await expect(phone.getByText('10 answered, 1 flagged.')).toBeVisible();
  await expect(phone.locator('[data-exam-running]')).toHaveAttribute('data-exam-t0', String(exam.t0));
  await pick(phone, bank, true);
  await phone.waitForResponse((r) => r.url().endsWith('/api/state') && r.request().method() === 'PUT' && r.status() === 200);
  await phone.context().close();
  await pullNow(page);
  await expect(page.getByText('11 answered, 1 flagged.')).toBeVisible();

  // Submit: a result per domain, then every question explained.
  await page.locator('[data-submit-exam]').click();
  await expect(page.locator('[data-confirm-submit]')).toContainText('49 of 60 questions are not answered and 1 is flagged');
  await page.locator('[data-confirm-yes]').click();
  await expect(page.locator('[data-exam-results]')).toHaveAttribute('data-exam-results', 'fail');
  await expect(page.locator('[data-exam-score]')).toHaveText('11 of 60 right (18%): not passed');
  let rows = 0;
  for (const [d, n] of Object.entries(SPLIT)) {
    await expect(page.locator(`[data-exam-domains] [data-domain="${d}"] [data-domain-score]`)).toHaveText(new RegExp(`^\\d+ of ${n}$`));
    rows += Number((await page.locator(`[data-exam-domains] [data-domain="${d}"] [data-domain-score]`).textContent())!.split(' ')[0]);
  }
  expect(rows).toBe(11);
  await expect(page.locator('[data-exam-review] [data-why]').first()).toBeVisible();
  // Results survive a reload until they are closed.
  await page.reload();
  await expect(page.locator('[data-exam-results]')).toBeVisible();
  await page.locator('[data-close-exam]').click();
  await expect(page.locator('[data-exam-history]')).toContainText('18%');
});

test('when time is up the clock submits, after asking the server for news', async ({ page }) => {
  await page.clock.setFixedTime(at('2026-11-09', '10:00'));
  await page.goto('/exam/otca/');
  // The sample OTCA pool is short: the exam uses what there is, by domain.
  await expect(page.locator('[data-exam-short]')).toBeVisible();
  const bank = await loadBank(page);
  await page.locator('[data-start-exam]').click();
  await pick(page, bank, true);
  await page.waitForResponse((r) => r.url().endsWith('/api/state') && r.request().method() === 'PUT' && r.status() === 200);

  // 91 minutes later: on load the clock waits for the first sync, pulls again, then submits.
  await page.clock.setFixedTime(at('2026-11-09', '11:31'));
  const pulls: string[] = [];
  page.on('request', (r) => r.url().endsWith('/api/state') && pulls.push(r.method()));
  await page.reload();
  await expect(page.locator('[data-exam-results]')).toBeVisible();
  await expect(page.locator('[data-exam-results]')).toContainText('Time ran out');
  expect(pulls.filter((m) => m === 'GET').length).toBeGreaterThanOrEqual(2);
  const s = await saved(page);
  const mocks = s.mocks as { mins: number; score: number; cert: string }[];
  expect(mocks).toHaveLength(1);
  expect(mocks[0]).toMatchObject({ cert: 'otca', score: 1, mins: 90 });
});
