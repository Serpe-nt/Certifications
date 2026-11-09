// Helpers for the study-feature tests: the bank, answering the question on screen, local times.
import { expect, type Page } from '@playwright/test';

export interface BankQ {
  id: string;
  pool: string;
  domain: string;
  cert: string;
  a: number[];
  n: number;
}
export interface Bank {
  questions: BankQ[];
}

export async function loadBank(page: Page): Promise<Bank> {
  return page.evaluate(async () => (await fetch('/bank.json')).json());
}

/** A moment in the browser's local time zone, e.g. at('2026-11-10'). */
export const at = (day: string, time = '10:00') => new Date(`${day}T${time}:00`);

/** Picks the right options (or wrong ones) for the question on screen. */
export async function pick(page: Page, bank: Bank, right: boolean): Promise<string> {
  const qid = (await page.locator('[data-qid]').first().getAttribute('data-qid'))!;
  const q = bank.questions.find((x) => x.id === qid)!;
  const wrong = Array.from({ length: q.n }, (_, i) => i).filter((i) => !q.a.includes(i));
  const picks = right ? q.a : q.a.length > 1 ? [q.a[0], wrong[0]] : [wrong[0]];
  for (const i of picks) await page.locator(`[data-qid="${qid}"] [data-opt="${i}"] input`).check();
  return qid;
}

/** Answers the question on screen in a quiz or practice run and checks the verdict. */
export async function answer(page: Page, bank: Bank, right: boolean): Promise<void> {
  await pick(page, bank, right);
  await page.locator('[data-check-answer]').click();
  await expect(page.locator('[data-verdict]')).toHaveAttribute('data-verdict', right ? 'right' : 'wrong');
}

/** Answers every question of the run on screen (`rights[k]` for the k-th one answered), then opens the results. */
export async function playRun(page: Page, bank: Bank, rights: boolean[]): Promise<void> {
  for (let k = 0; k < rights.length; k++) {
    await answer(page, bank, rights[k]);
    if (k < rights.length - 1) await page.locator('[data-next-open]').click();
  }
  await page.locator('[data-see-results]').click();
}

/** The saved progress document of this page. */
export async function saved(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate(() => JSON.parse(localStorage.getItem('lgtm-learn-v1') ?? '{}'));
}
