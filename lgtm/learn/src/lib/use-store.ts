// React hook: the current state, re-rendered on every change. Before hydration (server
// rendering) it returns the default state, so the static HTML shows no progress.
import { useEffect, useState } from 'react';
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

export function updateState(change: (draft: State) => void): void {
  getStore().update(change);
}

/** False in the static HTML and until the island has hydrated: controls stay disabled until they work. */
export function useHydrated(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready;
}
