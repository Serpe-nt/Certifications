// React hook: the current state, re-rendered on every change. Before hydration (server
// rendering) it returns the default state, so the static HTML shows no progress.
import { useEffect, useState } from 'react';
import { bankNow } from './bank.ts';
import { celebrate, notice } from './fx.ts';
import { celebrationFor, levelOf, xpTotal } from './rewards.ts';
import { defaultState, type State } from './state.ts';
import { getStore } from './store.ts';

export function useStoreState(): State {
  const [state, setState] = useState<State>(defaultState);
  useEffect(() => {
    const store = getStore();
    setState(store.get());
    return store.subscribe(setState);
  }, []);
  return state;
}

/**
 * Changes the state on this device. Unless `quiet` (the mock exam while it runs), it then
 * celebrates the biggest thing the change finished (rewards.ts) and announces a new level.
 */
export function updateState(change: (draft: State) => void, opts: { quiet?: boolean } = {}): void {
  const store = getStore();
  const before = store.get();
  store.update(change);
  if (opts.quiet) return;
  const after = store.get();
  const outline = bankNow();
  const rung = celebrationFor(before, after, outline);
  if (rung) celebrate(rung, after.settings);
  const was = levelOf(xpTotal(before, outline)).level;
  const now = levelOf(xpTotal(after, outline)).level;
  if (now > was) notice(`Level ${now} reached`);
}

/** False in the static HTML and until the island has hydrated: controls stay disabled until they work. */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
