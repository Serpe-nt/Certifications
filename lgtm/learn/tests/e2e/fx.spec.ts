// Celebrations: the banner always says what was finished; the effects switch, reduced motion
// and the sound switch each silence their part.
import type { Page } from '@playwright/test';
import { expect, resetServer, test } from './helpers.ts';
import { answer, loadBank } from './study.ts';

test.beforeEach(async ({ request }) => resetServer(request));

const fxLast = (page: Page) => page.evaluate(() => document.documentElement.dataset.fxLast ?? '');
const fxAnswer = (page: Page) => page.evaluate(() => document.documentElement.dataset.fxAnswer ?? '');

async function setSwitch(page: Page, label: string, on: boolean) {
  await page.goto('/settings/');
  const box = page.getByLabel(label);
  await (on ? box.check() : box.uncheck());
}

async function completeStep(page: Page, step: string) {
  await page.goto(`/m/m90/${step}/`);
  await page.locator('[data-mark-complete]').click();
  await expect(page.locator('[data-celebration="step"]')).toHaveText('Step complete');
}

test('effects off, sound off and reduced motion each silence what they should', async ({ page }) => {
  // Everything on: banner, canvas and sound.
  await completeStep(page, 's01');
  expect(await fxLast(page)).toBe('step effects=on sound=on');
  await expect(page.locator('canvas[data-fx-canvas]')).toHaveCount(1);

  // Effects off: the banner stays, the canvas goes, the sound stays.
  await setSwitch(page, 'Effects when you finish something', false);
  await completeStep(page, 's07');
  expect(await fxLast(page)).toBe('step effects=off sound=on');
  await expect(page.locator('canvas[data-fx-canvas]')).toHaveCount(0);

  // Sound off as well: silence, the banner still says what happened. The second sample module
  // has one step and no quiz, so completing it finishes the module: a bigger rung.
  await setSwitch(page, 'Sound', false);
  await page.goto('/m/m91/s01/');
  await page.locator('[data-mark-complete]').click();
  await expect(page.locator('[data-celebration="module"]')).toHaveText('Module done');
  expect(await fxLast(page)).toBe('module effects=off sound=off');

  // Answer sounds in practice follow the sound switch too.
  await page.goto('/practice/?step=m90-s01');
  const bank = await loadBank(page);
  await page.locator('[data-start-step]').click();
  await answer(page, bank, true);
  expect(await fxAnswer(page)).toBe('right sound=off');
  await setSwitch(page, 'Sound', true);
  await page.goto('/practice/');
  await page.locator('[data-next-open]').click();
  await answer(page, bank, false);
  expect(await fxAnswer(page)).toBe('wrong sound=on');
});

test('reduced motion turns the canvas off even with effects on', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await completeStep(page, 's01');
  expect(await fxLast(page)).toBe('step effects=off sound=on');
  await expect(page.locator('canvas[data-fx-canvas]')).toHaveCount(0);
  // The banner shows without animation.
  const animation = await page.locator('[data-celebration]').evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe('none');
});

test('a passed lab check is a bigger rung than a step', async ({ page }) => {
  await page.goto('/m/m90/s02/');
  await page.getByLabel('Type the word the command prints.').fill('Ready');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('[data-check-result]')).toHaveAttribute('data-check-result', 'pass');
  await expect(page.locator('[data-celebration="check"]')).toHaveText('Lab check passed');
});
