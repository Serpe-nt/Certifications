// The module quiz, review on the right days (clock fixed per day), readiness and step practice.
import { expect, resetServer, test } from './helpers.ts';
import { answer, at, loadBank, playRun, saved } from './study.ts';

test.beforeEach(async ({ request }) => resetServer(request));

test('a module quiz is failed, then passed; missed questions come due after 1, 2 and 4 days', async ({ page }) => {
  // The longest test in the suite: 42 questions over five rounds (a failed quiz, a passed one, three
  // review days). On a slow CI runner it came close to the default 30 s limit, so it gets twice that.
  test.setTimeout(60_000);
  await page.clock.setFixedTime(at('2026-11-09'));
  await page.goto('/');
  // Readiness before any answer.
  await expect(page.locator('[data-readiness-exam="pca"] [data-domain="P1"] [data-seen]')).toHaveText(/^0 of \d+$/);
  await page.goto('/m/m90/done/');
  await page.locator('[data-quiz-link]').click();
  await expect(page).toHaveURL(/\/m\/m90\/quiz\/$/);
  const bank = await loadBank(page);
  await page.locator('[data-start-quiz]').click();
  await expect(page.locator('.q-square')).toHaveCount(15);

  // Moving around does not answer: Next and Previous, and the squares.
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Question 2 of 15, 0 answered.')).toBeVisible();
  await page.getByRole('button', { name: 'Previous' }).click();

  // 11 of 15: one short of the pass mark. The first four answers are the misses.
  await playRun(page, bank, [false, false, false, false, ...Array(11).fill(true)]);
  await expect(page.locator('[data-results]')).toHaveAttribute('data-results', 'fail');
  await expect(page.locator('[data-results-verdict]')).toContainText('12 of 15 are needed');
  // Results link back to the steps that teach the missed topics.
  await expect(page.locator('[data-missed] a').first()).toHaveAttribute('href', /\/m\/m90\/s\d\d\/$/);
  const missed = Object.keys((await saved(page)).srs as object);
  expect(missed).toHaveLength(4);

  // A reload keeps the results; Retake starts a new draw and passes.
  await page.reload();
  await expect(page.locator('[data-results]')).toHaveAttribute('data-results', 'fail');
  await page.locator('[data-retake]').click();
  await playRun(page, bank, Array(15).fill(true));
  await expect(page.locator('[data-results]')).toHaveAttribute('data-results', 'pass');
  await expect(page.locator('[data-celebration="quiz"]')).toBeVisible();
  await page.locator('[data-close-run]').click();
  await expect(page.locator('[data-quiz-record]')).toContainText('Best so far: 100%. Passed.');

  // Readiness moved with the answers: every P1 question of the pool has been met.
  await page.goto('/');
  await expect(page.locator('[data-readiness-exam="pca"] [data-domain="P1"] [data-seen]')).not.toHaveText(/^0 of/);
  await expect(page.locator('[data-module="m90"] [data-module-status]')).toHaveText('Quiz passed');
  await expect(page.locator('[data-practice-panel] [data-due]')).toContainText('Nothing is due');

  // Day 2: the four misses are due. Answer them right: next due in 2 days.
  const reviewDay = async (day: string, due: number) => {
    await page.clock.setFixedTime(at(day));
    await page.goto('/practice/');
    if (!due) {
      await expect(page.locator('[data-due-count]')).toHaveAttribute('data-due-count', '0');
      return;
    }
    await expect(page.locator('[data-due-count]')).toContainText(`${due} questions are due`);
    await page.locator('[data-start-review]').click();
    await playRun(page, bank, Array(due).fill(true));
    await page.locator('[data-close-run]').click();
  };
  await reviewDay('2026-11-10', 4);
  expect(Object.values((await saved(page)).srs as Record<string, { due: string }>).map((e) => e.due)).toEqual(Array(4).fill('2026-11-12'));
  await reviewDay('2026-11-11', 0);
  await reviewDay('2026-11-12', 4);
  await reviewDay('2026-11-15', 0);
  await reviewDay('2026-11-16', 4);
  // Three right answers on time retire them.
  expect(Object.keys((await saved(page)).srs as object)).toEqual([]);
  await reviewDay('2026-11-30', 0);
});

test('step practice draws three questions on the step and counts them', async ({ page }) => {
  await page.goto('/m/m90/s01/');
  // Step practice opens as a dialog over the step, for this step.
  await page.locator('[data-step-practice-link]').click();
  await expect(page).toHaveURL(/\/m\/m90\/s01\/#practice=m90-s01$/);
  await expect(page.getByRole('dialog', { name: 'Practice' })).toBeVisible();
  const bank = await loadBank(page);
  await page.locator('[data-start-step]').click();
  await expect(page.locator('.q-square')).toHaveCount(3);
  await answer(page, bank, true);
  await expect(page.locator('[data-why]')).toHaveCount(4);
  // A reload reopens the dialog and continues the same round.
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Practice' })).toBeVisible();
  await expect(page.getByText('3, 1 answered.', { exact: false })).toBeVisible();
  const s = await saved(page);
  expect(Object.keys(s.qs as object)).toHaveLength(1);
  expect((s.run as { kind: string }).kind).toBe('step');
  // Close returns to the step underneath.
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog', { name: 'Practice' })).toBeHidden();
  await expect(page).toHaveURL(/\/m\/m90\/s01\/$/);
});
