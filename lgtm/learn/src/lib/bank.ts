// The question bank and the course outline as the islands see them. Built once at build time
// into bank.json (src/pages/bank.json.ts) and fetched once per page, so pages do not carry the
// bank in their HTML. Question text is build-time HTML from the course's own files (only <b>
// and <code> survive, see markup.ts); nothing in it comes from saved state.
import { useEffect, useState } from 'react';
import type { Cert } from './exams.ts';
import { href } from './links.ts';
import type { BankQuestion } from './quiz.ts';

export interface BankStep {
  id: string;
  title: string;
  tags: string[];
}

export interface BankModule {
  id: string;
  title: string;
  quiz: boolean;
  exams: Cert[];
  steps: BankStep[];
}

export interface FullQuestion extends BankQuestion {
  /** The question, as HTML. */
  q: string;
  /** The options in file order: text and explanation, as HTML. */
  o: { t: string; w: string }[];
  competency: string;
  source: string;
}

/** A step's card question, for readiness: it counts toward the step's first exam domain. */
export interface CardRef {
  id: string;
  step: string;
  cert: Cert | 'none';
  domain: string;
}

export interface Bank {
  modules: BankModule[];
  questions: FullQuestion[];
  cards: CardRef[];
}

let pending: Promise<Bank> | null = null;
let loaded: Bank | null = null;

/** Loads bank.json once per page. A failed load is retried on the next call. */
export function fetchBank(): Promise<Bank> {
  pending ??= fetch(href.bank, { credentials: 'same-origin' })
    .then((r) => {
      if (!r.ok) throw new Error(`bank.json: ${r.status}`);
      return r.json() as Promise<Bank>;
    })
    .then((b) => (loaded = b))
    .catch((err: unknown) => {
      pending = null;
      throw err;
    });
  return pending;
}

/** The bank if it has already arrived, else null. */
export function bankNow(): Bank | null {
  return loaded;
}

/**
 * React hook: the bank, or null while it loads; `failed` when it could not be loaded. The first
 * render is always null, like the static HTML, so hydration matches even when the bank arrived first.
 */
export function useBank(): { bank: Bank | null; failed: boolean } {
  const [bank, setBank] = useState<Bank | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    if (loaded) setBank(loaded);
    fetchBank().then(
      (b) => alive && setBank(b),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);
  return { bank, failed };
}

/** Questions by id, for lookups with ids from saved state (a Map, never a plain object). */
export function byId(bank: Bank): Map<string, FullQuestion> {
  return new Map(bank.questions.map((q) => [q.id, q]));
}

/** Steps that teach a tag, the ones in `preferModule` first. */
export function stepsTeaching(bank: Bank, tag: string, preferModule = ''): BankStep[] {
  const all = bank.modules.flatMap((m) => m.steps.filter((s) => s.tags.includes(tag)).map((s) => ({ s, own: m.id === preferModule ? 0 : 1 })));
  return all.sort((a, b) => a.own - b.own).map((x) => x.s);
}

export function findStep(bank: Bank, stepId: string): BankStep | undefined {
  for (const m of bank.modules) {
    const s = m.steps.find((x) => x.id === stepId);
    if (s) return s;
  }
  return undefined;
}
