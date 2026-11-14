import { expect, resetServer, test } from './helpers.ts';

test.beforeEach(async ({ request }) => resetServer(request));

// What a learner copies is the text the author wrote: indentation kept, straight quotes,
// two hyphens, and no newline added at the end.
test('a fenced block has the command frame and Copy gives its text exactly', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/m/m90/s02/?tab=practice');
  const file = page.locator('[data-file="yaml"]');
  await expect(file).toHaveClass(/codeblock/);
  await expect(file.locator('.codeblock-label')).toHaveText('YAML');
  await file.getByRole('button', { name: 'Copy' }).click();
  await expect(file.getByRole('button', { name: 'Copied' })).toBeVisible();
  const want = `checks:\n  - name: ready\n    command: "echo 'Ready' -- now"`;
  // Copy hands the clipboard the code's text; a Windows clipboard gives it back with CRLF.
  expect(await file.locator('code').textContent()).toBe(want);
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.replace(/\r\n/g, '\n')).toBe(want);

  await page.locator('[data-cmd]').getByRole('button', { name: 'Copy' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('echo Ready');
});
