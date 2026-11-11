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
  // No list of steps beside the card: no other step title on screen (the module outline is a closed dialog).
  await expect(page.getByText('A lab step with an exact check').filter({ visible: true })).toHaveCount(0);
  // Every part of the article form is there, and a concept step has no tabs.
  for (const block of ['problem', 'idea', 'inlab', 'trap', 'remember', 'question']) await expect(page.locator(`[data-block="${block}"]`)).toHaveCount(1);
  for (const info of ['flow', 'compare', 'figures', 'layers', 'timeline']) await expect(page.locator(`[data-info="${info}"]`)).toHaveCount(1);
  await expect(page.getByRole('tab')).toHaveCount(0);
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
  // Picking an option does not grade it; Submit does.
  await expect(page.locator('[data-question-result]')).toHaveText('');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('[data-question-result]')).toHaveText('Correct');
  await expect(page.getByText('Right: a metric is a number sampled over time.')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-question-result]')).toHaveText('Last time: right');
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

test('Effects off calms the page before paint and across pages', async ({ page }) => {
  await page.goto('/settings/');
  await page.getByLabel('Effects and motion').uncheck();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await page.goto('/m/m90/s01/');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  const duration = await page.locator('.pagetitle').evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBeLessThan(0.001);
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

test('a lab step has Learn and Practice; the tab is in the address and survives reload and Back', async ({ page }) => {
  await page.goto('/m/m90/s02/');
  await expect(page.getByRole('tab', { name: 'Learn' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-block="why"]')).toBeVisible();
  await expect(page.locator('[data-block="do"]')).toBeHidden();
  await expect(page.locator('[data-block="check"]')).toBeHidden();
  await page.getByRole('tab', { name: 'Practice' }).click();
  await expect(page).toHaveURL(/\/m\/m90\/s02\/\?tab=practice$/);
  await expect(page.locator('[data-block="do"]')).toBeVisible();
  await expect(page.locator('[data-block="check"]')).toBeVisible();
  await expect(page.locator('[data-block="why"]')).toBeHidden();
  // On a lab step the card question sits on Practice.
  await expect(page.locator('[data-block="question"]')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Practice' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-block="do"]')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/m\/m90\/s02\/$/);
  await expect(page.locator('[data-block="why"]')).toBeVisible();
  // Mark complete still waits for the check, on either tab. On Learn, Go to practice stands in its place.
  await expect(page.locator('[data-mark-complete]')).toBeDisabled();
  await page.getByRole('link', { name: 'Go to practice' }).click();
  await expect(page).toHaveURL(/\?tab=practice$/);
  await expect(page.getByRole('tab', { name: 'Practice' })).toHaveAttribute('aria-selected', 'true');
  // Back, Mark complete and Next stay on Practice.
  await expect(page.locator('[data-mark-complete]')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back' })).toBeVisible();
});

test('the lab check follows How you know it worked and says what is wrong', async ({ page }) => {
  await page.goto('/m/m90/s06/?tab=practice');
  const order = await page.locator('.prose > *').evaluateAll((els) => els.map((e) => e.getAttribute('data-block') ?? e.querySelector('[data-block]')?.getAttribute('data-block') ?? ''));
  expect(order.indexOf('check')).toBe(order.indexOf('done') + 1);
  await page.getByRole('textbox').fill('abc');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', /wrong|no-seed/);
});

test('the module name in the header opens the outline over the step; Back closes it', async ({ page }) => {
  await page.goto('/m/m90/s02/');
  await page.locator('.crumb a').click();
  await expect(page).toHaveURL(/#module$/);
  const dlg = page.locator('dialog[data-dialog-name="module"]');
  await expect(dlg).toBeVisible();
  await expect(dlg.locator('[aria-current="step"]')).toContainText('A lab step with an exact check');
  await page.goBack();
  await expect(dlg).toBeHidden();
  await expect(page).toHaveURL(/\/m\/m90\/s02\/$/);
});

test('an old-form step still renders its blocks', async ({ page }) => {
  await page.goto('/m/m90/s07/');
  for (const block of ['why', 'idea', 'question']) await expect(page.locator(`[data-block="${block}"]`)).toBeVisible();
});

test('the sidebar sits beside the article on a wide screen and under it on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/m/m90/s01/');
  const art = await page.locator('article.prose').boundingBox();
  let side = await page.locator('aside.sidebar').boundingBox();
  expect(side!.x).toBeGreaterThan(art!.x + art!.width - 1);
  await expect(page.locator('.toc a')).toHaveCount(2);
  // The contents list marks the section being read.
  await page.locator('.prose > h2').nth(1).scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect(page.locator('.toc a[aria-current="location"]')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  side = await page.locator('aside.sidebar').boundingBox();
  const art2 = await page.locator('article.prose').boundingBox();
  expect(side!.y).toBeGreaterThan(art2!.y + art2!.height - 1);
  // Nothing scrolls sideways on a phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('clicks inside a dialog while it opens keep it open, in place and without scrollbars', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 700 });
  await page.goto('/m/m90/quiz/');
  await page.locator('[data-dialog="practice"]').click();
  const dlg = page.locator('dialog[data-dialog-name="practice"]');
  const tops = new Set<number>();
  for (let k = 0; k < 6; k++) {
    await page.mouse.click(300 + k * 90, 160);
    const m = await dlg.evaluate((d) => ({ open: (d as HTMLDialogElement).open, top: Math.round(d.getBoundingClientRect().top), sx: d.scrollWidth - d.clientWidth }));
    expect(m.open).toBe(true);
    expect(m.sx).toBe(0);
    tops.add(m.top);
  }
  expect(tops.size).toBe(1);
  // A click on the backdrop, outside the dialog, still closes it.
  await page.mouse.click(10, 690);
  await expect(dlg).toBeHidden();
});
