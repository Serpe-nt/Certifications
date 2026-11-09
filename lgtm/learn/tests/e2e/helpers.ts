import { expect, test as base, type APIRequestContext, type Page } from '@playwright/test';

/** Empties the server copy of the state, so every test starts from nothing. */
export async function resetServer(request: APIRequestContext, origin = 'http://localhost:8095', prefix = ''): Promise<void> {
  const cur = await (await request.get(`${origin}${prefix}/api/state`)).json();
  const res = await request.put(`${origin}${prefix}/api/state`, {
    headers: { 'Content-Type': 'application/json', 'If-Match': `"${cur.rev}"` },
    data: { v: 1 },
  });
  expect(res.status()).toBe(200);
}

/** Fails the test on any console error, such as a content security policy violation. */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(e.message));
      await use(errors);
      expect(errors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Runs one pull, as a focus of the window would. */
export async function pullNow(page: Page): Promise<void> {
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}
