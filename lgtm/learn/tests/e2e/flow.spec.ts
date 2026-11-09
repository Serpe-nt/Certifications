import { expect, resetServer, test } from './helpers.ts';

test.beforeEach(async ({ request }) => resetServer(request));

test('overview, one card at a time, Back, Mark complete, Next, module end', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-next] h2')).toHaveText('A concept step with every reading component');
  await expect(page.locator('[data-module]')).toHaveCount(2);
  await page.locator('[data-continue]').click();

  // The card on screen lives in the URL.
  await expect(page).toHaveURL(/\/m\/m90\/s01\/$/);
  await expect(page.locator('[data-step]')).toHaveAttribute('data-step', 'm90-s01');
  // No list of steps beside the card: no other step title on the page.
  await expect(page.getByText('A lab step with an exact check')).toHaveCount(0);
  // Every reading component is there.
  for (const block of ['why', 'idea', 'points', 'trap', 'question']) await expect(page.locator(`[data-block="${block}"]`)).toHaveCount(1);
  await expect(page.locator('[data-query="promql"] code')).toContainText('http_requests_total{job="shop"}');

  await page.locator('[data-mark-complete]').click();
  await expect(page.locator('[data-mark-complete]')).toHaveText('Completed');
  await page.getByRole('link', { name: 'Next' }).click();
  await expect(page).toHaveURL(/\/m\/m90\/s02\/$/);
  await page.getByRole('link', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/m\/m90\/s01\/$/);
  await expect(page.locator('[data-mark-complete]')).toHaveText('Completed');

  // Undo works, and the overview follows the progress.
  await page.locator('[data-mark-complete]').click();
  await expect(page.locator('[data-mark-complete]')).toHaveText('Mark complete');
  await page.locator('[data-mark-complete]').click();
  await page.goto('/');
  await expect(page.locator('[data-next] h2')).toHaveText('A lab step with an exact check');
  await expect(page.locator('[data-continue]')).toHaveText('Continue');
  await expect(page.locator('[data-module="m90"] [data-progress]')).toHaveText('1 of 7 steps done');

  // The last step of a module leads to the module end.
  await page.goto('/m/m90/s07/');
  await page.getByRole('link', { name: 'Finish the module' }).click();
  await expect(page).toHaveURL(/\/m\/m90\/done\/$/);
  await expect(page.locator('[data-done-count]')).toContainText('1 of 7 steps complete');
  await expect(page.locator('[data-quiz-entry]')).toBeVisible();
});

test('the card question shuffles, grades and remembers', async ({ page }) => {
  await page.goto('/m/m90/s01/');
  // The question hydrates when it comes into view (client:visible); until then it is disabled.
  await page.locator('[data-question]').scrollIntoViewIfNeeded();
  await page.getByRole('radio', { name: 'A metric' }).check();
  await expect(page.locator('[data-question-result]')).toHaveText('Right.');
  await expect(page.getByText('Right: a metric is a number sampled over time.')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-question-result]')).toHaveText('Last time: right.');
});

test('lab links follow the lab domain setting', async ({ page }) => {
  await page.goto('/m/m90/s01/');
  await expect(page.getByRole('link', { name: 'Explore in Grafana' })).toHaveAttribute('href', 'http://grafana.lab.k8s.local/explore');
  await page.goto('/settings/');
  await page.getByLabel('Lab domain').fill('lab.example.test');
  await page.locator('[data-save-domain]').click();
  await page.goto('/m/m90/s01/');
  await expect(page.getByRole('link', { name: 'Explore in Grafana' })).toHaveAttribute('href', 'http://grafana.lab.example.test/explore');
});

test('the theme setting applies before paint and across pages', async ({ page }) => {
  await page.goto('/settings/');
  await page.getByLabel('Dark').check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const bg = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--lg-page').trim());
  expect(bg).toBe('#0f1218');
});

test('keyboard: the step buttons can be reached and used', async ({ page }) => {
  await page.goto('/m/m90/s07/');
  const mark = page.locator('[data-mark-complete]');
  await mark.focus();
  await page.keyboard.press('Enter');
  await expect(mark).toHaveText('Completed');
  const outline = await mark.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('unknown pages answer 404 with a way back', async ({ page, consoleErrors }) => {
  const res = await page.goto('/m/m99/s01/');
  expect(res?.status()).toBe(404);
  await expect(page.getByRole('link', { name: 'Go to the overview' })).toBeVisible();
  // The browser logs the 404 of the page itself; that one is expected.
  expect(consoleErrors).toEqual(['Failed to load resource: the server responded with a status of 404 (Not Found)']);
  consoleErrors.length = 0;
});
