// The six lesson scenes of src/figures, shown together by the fixture figure m91-s01-scenes.
// Each scene marks itself with data-scene-animate (its script may run) and data-scene-settled (it shows
// its finished frame); its stage carries data-still whenever no script runs.
import { expect, test } from './helpers.ts';

const IDS = ['m02-s04-waterfall', 'm02-s06-three-hops', 'm02-s10-series-multiply', 'm05-s02-explore', 'm05-s04-panel-editor', 'm05-s06-variable-editor'];
const PAGE = '/m/m91/s01/';

test('every scene renders and plays while its figure is on screen', async ({ page }) => {
  await page.goto(PAGE);
  const fig = page.locator('[data-figure-scene="m91-s01-scenes"]');
  await fig.scrollIntoViewIfNeeded();
  for (const id of IDS) {
    const scene = fig.locator(`[data-test-lesson-scene="${id}"]`);
    await expect(scene.locator('.ss-stage')).toBeVisible();
    await expect(scene.locator('[data-scene-animate]')).toHaveAttribute('data-scene-animate', 'true');
    await expect(scene.locator('.ss-stage')).not.toHaveAttribute('data-still');
  }
});

test('every scene stops when its figure leaves the screen', async ({ page }) => {
  // A short window, so the page's header alone fills it once the page is scrolled to the top.
  await page.setViewportSize({ width: 1000, height: 300 });
  await page.goto(PAGE);
  const fig = page.locator('[data-figure-scene="m91-s01-scenes"]');
  await fig.scrollIntoViewIfNeeded();
  await expect(fig).toHaveAttribute('data-playing', 'true');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(fig).toHaveAttribute('data-playing', 'false');
  for (const id of IDS) {
    const scene = fig.locator(`[data-test-lesson-scene="${id}"]`);
    await expect(scene.locator('[data-scene-animate]')).toHaveAttribute('data-scene-animate', 'false');
    await expect(scene.locator('.ss-stage')).toHaveAttribute('data-still', 'true');
  }
});

test('under reduced motion every scene shows its finished frame and does not play', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(PAGE);
  const fig = page.locator('[data-figure-scene="m91-s01-scenes"]');
  await fig.scrollIntoViewIfNeeded();
  for (const id of IDS) {
    const scene = fig.locator(`[data-test-lesson-scene="${id}"]`);
    await expect(scene.locator('[data-scene-settled]')).toHaveAttribute('data-scene-settled', 'true');
    await expect(scene.locator('[data-scene-animate]')).toHaveAttribute('data-scene-animate', 'false');
    await expect(scene.locator('.ss-stage')).toHaveAttribute('data-still', 'true');
  }
  // The finished frame of the first scene: the payment span has its error mark.
  await expect(fig.locator('[data-test-lesson-scene="m02-s04-waterfall"] .wf-row[data-err]')).toHaveCount(1);
  await ctx.close();
});

test('with Effects off every scene stops and shows its finished frame', async ({ page }) => {
  await page.goto(PAGE);
  const fig = page.locator('[data-figure-scene="m91-s01-scenes"]');
  await fig.scrollIntoViewIfNeeded();
  await expect(fig.locator('[data-scene-animate="true"]')).toHaveCount(IDS.length);
  // The Settings switch sets data-motion="off" on <html> (src/lib/page.ts); the scenes follow it at once.
  await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'off'));
  for (const id of IDS) {
    const scene = fig.locator(`[data-test-lesson-scene="${id}"]`);
    await expect(scene.locator('[data-scene-animate]')).toHaveAttribute('data-scene-animate', 'false');
    await expect(scene.locator('[data-scene-settled]')).toHaveAttribute('data-scene-settled', 'true');
    await expect(scene.locator('.ss-stage')).toHaveAttribute('data-still', 'true');
  }
});
