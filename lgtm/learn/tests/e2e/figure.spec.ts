import { expect, test } from './helpers.ts';

test('an unregistered figure shows a labelled placeholder with its alt text', async ({ page }) => {
  await page.goto('/m/m90/s01/');
  const ph = page.locator('[data-figure="m90-s01-later"] [data-figure-placeholder]');
  await expect(ph).toContainText('Figure to come');
  await expect(ph).toHaveAttribute('aria-label', 'A dashboard panel shows a latency line rising at night.');
});

test('a registered scene loads lazily and stops when off screen', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 500 });
  await page.goto('/m/m90/s01/');
  const scene = page.locator('[data-figure-scene="m90-s01-flow"]');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene.locator('[data-test-scene]')).toHaveAttribute('data-scene-playing', 'true');
  await page.locator('[data-mark-complete]').scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(scene).toHaveAttribute('data-playing', 'false');
});

test('under reduced motion a scene shows a still', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/m/m90/s01/');
  const scene = page.locator('[data-figure-scene="m90-s01-flow"]');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene.locator('[data-test-scene]')).toHaveAttribute('data-scene-still', 'true');
  await expect(scene.locator('[data-test-scene]')).toHaveAttribute('data-scene-playing', 'false');
  await ctx.close();
});
