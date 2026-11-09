// The browser's working copy of the state and its sync with the server.
//
// Protocol (server/api.mjs):
//   GET /api/state  -> 200 {rev, doc, savedAt} with ETag "<rev>"; 304 when If-None-Match names the current rev.
//   PUT /api/state  with If-Match "<rev>" and the document as the body -> 200 {rev}, or 409 {rev, doc, savedAt}.
// Local storage is the working copy; the server copy is the shared one. When both changed since
// they last agreed, mergeStates() combines them and the result is pushed.
import { STORAGE_KEY, defaultState, mergeStates, parseState, type State } from './state.ts';

export const SYNC_KEY = `${STORAGE_KEY}-sync`;
export const PUSH_DELAY_MS = 800;
export const PULL_EVERY_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;

export type SyncStatus = 'local' | 'synced' | 'pending' | 'offline' | 'error';

interface SyncMeta {
  /** The server revision this copy last agreed with (0 = none yet). */
  rev: number;
  /** True when this copy has changes the server has not seen. */
  dirty: boolean;
}

export interface StoreDeps {
  storage: Pick<Storage, 'getItem' | 'setItem'>;
  fetch: typeof fetch;
  apiUrl: string;
  now: () => number;
}

type Listener = (s: State) => void;

function readMeta(storage: StoreDeps['storage']): SyncMeta {
  try {
    const m = JSON.parse(storage.getItem(SYNC_KEY) ?? 'null') as Partial<SyncMeta> | null;
    const rev = typeof m?.rev === 'number' && Number.isSafeInteger(m.rev) && m.rev >= 0 ? m.rev : 0;
    return { rev, dirty: m?.dirty === true };
  } catch {
    return { rev: 0, dirty: false };
  }
}

export class Store {
  private state: State = defaultState();
  private meta: SyncMeta = { rev: 0, dirty: false };
  private listeners = new Set<Listener>();
  private pushTimer: ReturnType<typeof setTimeout> | undefined;
  private pushing: Promise<void> | null = null;
  private pulling: Promise<void> | null = null;
  /** Counts local changes, so a push knows whether more arrived while it was on its way. */
  private changes = 0;
  status: SyncStatus = 'local';

  private deps: StoreDeps;

  constructor(deps: StoreDeps) {
    this.deps = deps;
    this.reload();
  }

  /** Re-reads the working copy from local storage (at start, and when another tab wrote it). */
  reload(): void {
    let raw: string | null = null;
    try {
      raw = this.deps.storage.getItem(STORAGE_KEY);
    } catch {
      raw = null;
    }
    this.state = raw ? parseState(raw) : defaultState();
    this.meta = readMeta(this.deps.storage);
    this.emit();
  }

  get(): State {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }

  private write(): void {
    try {
      this.deps.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.deps.storage.setItem(SYNC_KEY, JSON.stringify(this.meta));
    } catch {
      // Storage full or blocked: the copy in memory still works for this page.
    }
  }

  /** Changes the state through a copy, saves it and schedules a push. */
  update(change: (draft: State) => void): void {
    const draft = parseState(JSON.parse(JSON.stringify(this.state)));
    change(draft);
    this.state = parseState(draft);
    this.state.savedAt = this.deps.now();
    this.meta.dirty = true;
    this.changes++;
    this.write();
    this.emit();
    this.schedulePush();
  }

  /** Replaces the whole state (import). The next push overwrites the server copy. */
  replace(next: unknown): void {
    this.update((draft) => {
      const parsed = parseState(next);
      for (const k of Object.keys(draft)) delete draft[k];
      Object.assign(draft, parsed);
    });
  }

  schedulePush(delay = PUSH_DELAY_MS): void {
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => void this.push(), delay);
  }

  private async request(init: RequestInit & { headers: Record<string, string> }): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await this.deps.fetch(this.deps.apiUrl, { ...init, cache: 'no-store', credentials: 'same-origin', redirect: 'manual', signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Takes in a server copy that is newer than the one this copy last agreed with. */
  private absorb(rev: number, doc: unknown): void {
    const server = parseState(doc);
    if (!this.meta.dirty) {
      this.state = server;
      this.meta = { rev, dirty: false };
    } else {
      this.state = mergeStates(this.state, server);
      this.meta = { rev, dirty: true };
      this.changes++;
    }
    this.write();
    this.emit();
  }

  /** Asks the server for news. Costs a 304 when nothing changed. */
  pull(): Promise<void> {
    this.pulling ??= this.doPull().finally(() => (this.pulling = null));
    return this.pulling;
  }

  private async doPull(): Promise<void> {
    try {
      const res = await this.request({ method: 'GET', headers: { 'If-None-Match': `"${this.meta.rev}"`, Accept: 'application/json' } });
      if (res.status === 304) {
        this.status = this.meta.dirty ? 'pending' : 'synced';
      } else if (res.ok && (res.headers.get('content-type') ?? '').includes('application/json')) {
        const body = (await res.json()) as { rev?: unknown; doc?: unknown };
        const rev = typeof body.rev === 'number' && Number.isSafeInteger(body.rev) && body.rev >= 0 ? body.rev : null;
        if (rev === null) throw new Error('bad answer');
        if (rev !== this.meta.rev && body.doc != null) this.absorb(rev, body.doc);
        else if (rev !== this.meta.rev) this.meta.rev = rev;
        this.status = this.meta.dirty ? 'pending' : 'synced';
      } else {
        this.status = 'error';
      }
    } catch {
      this.status = 'offline';
    }
    if (this.meta.dirty) await this.push();
  }

  /** Sends unsaved changes. On a conflict, merges with the server copy and tries again. */
  push(keepalive = false): Promise<void> {
    this.pushing ??= this.doPush(keepalive).finally(() => (this.pushing = null));
    return this.pushing;
  }

  private async doPush(keepalive: boolean): Promise<void> {
    clearTimeout(this.pushTimer);
    for (let attempt = 0; attempt < 4 && this.meta.dirty; attempt++) {
      const sent = this.changes;
      const body = JSON.stringify(this.state);
      let res: Response;
      try {
        res = await this.request({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'If-Match': `"${this.meta.rev}"` },
          body,
          keepalive: keepalive && body.length < 60_000,
        });
      } catch {
        this.status = 'offline';
        return;
      }
      if (res.status === 409) {
        const cur = (await res.json().catch(() => ({}))) as { rev?: unknown; doc?: unknown };
        if (typeof cur.rev !== 'number' || !Number.isSafeInteger(cur.rev)) {
          this.status = 'error';
          return;
        }
        this.absorb(cur.rev, cur.doc ?? {});
        continue;
      }
      if (!res.ok) {
        this.status = 'error';
        return;
      }
      const ok = (await res.json().catch(() => ({}))) as { rev?: unknown };
      if (typeof ok.rev !== 'number' || !Number.isSafeInteger(ok.rev)) {
        this.status = 'error';
        return;
      }
      this.meta.rev = ok.rev;
      // Changes made while the request was on its way still need a push.
      this.meta.dirty = this.changes !== sent;
      this.write();
      this.status = this.meta.dirty ? 'pending' : 'synced';
    }
    if (this.meta.dirty) this.schedulePush();
  }
}

let shared: Store | null = null;

/** The page's one store, wired to the browser: other tabs, focus, visibility, network. */
export function getStore(): Store {
  if (shared) return shared;
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  const store = new Store({ storage: window.localStorage, fetch: window.fetch.bind(window), apiUrl: `${base}api/state`, now: () => Date.now() });
  shared = store;
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === SYNC_KEY) store.reload();
  });
  const pullIfVisible = () => {
    if (document.visibilityState === 'visible') void store.pull();
  };
  window.addEventListener('focus', pullIfVisible);
  window.addEventListener('online', pullIfVisible);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void store.pull();
    else void store.push(true);
  });
  window.addEventListener('pagehide', () => void store.push(true));
  setInterval(pullIfVisible, PULL_EVERY_MS);
  void store.pull();
  return store;
}
