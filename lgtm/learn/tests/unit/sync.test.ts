// Two browser copies (two Store instances with their own storage) against the real API.
import http from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApi } from '../../server/api.mjs';
import { openStore } from '../../server/store.mjs';
import { STORAGE_KEY } from '../../src/lib/state.ts';
import { Store } from '../../src/lib/store.ts';

const PORT = 8096; // free while the end-to-end servers are not running (npm test runs these first)
const url = `http://127.0.0.1:${PORT}/api/state`;
let db: ReturnType<typeof openStore>;
let server: http.Server;
let online = true;

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

function device() {
  const storage = memoryStorage();
  const fetchFn: typeof fetch = (input, init) => (online ? fetch(input, init) : Promise.reject(new TypeError('offline')));
  return { storage, store: new Store({ storage, fetch: fetchFn, apiUrl: url, now: () => Date.now() }) };
}

beforeAll(async () => {
  db = openStore(':memory:');
  const api = createApi(db);
  server = http.createServer((req, res) => void api(req, res));
  await new Promise<void>((r) => server.listen(PORT, '127.0.0.1', r));
});
afterAll(async () => {
  await new Promise((r) => server.close(r));
  db.close();
});
beforeEach(() => {
  online = true;
});

describe('sync between two devices', () => {
  it('a change on one device reaches the other on its next pull', async () => {
    const a = device();
    const b = device();
    await a.store.pull();
    await b.store.pull();
    a.store.update((s) => void (s.done['m90-s01'] = 1));
    await a.store.push();
    expect(a.store.status).toBe('synced');
    await b.store.pull();
    expect(b.store.get().done['m90-s01']).toBe(1);
    expect(JSON.parse(b.storage.getItem(STORAGE_KEY)!).done['m90-s01']).toBe(1);
  });

  it('when both changed, completed steps from both survive (409 and merge)', async () => {
    const a = device();
    const b = device();
    await a.store.pull();
    await b.store.pull();
    a.store.update((s) => void (s.done['m90-s02'] = 2));
    b.store.update((s) => void (s.done['m90-s03'] = 3));
    await a.store.push();
    await b.store.push(); // 409, merge, push again
    await a.store.pull();
    for (const s of [a.store.get(), b.store.get()]) {
      expect(s.done['m90-s02']).toBe(2);
      expect(s.done['m90-s03']).toBe(3);
    }
    expect(a.store.status).toBe('synced');
    expect(b.store.status).toBe('synced');
  });

  it('changes made offline are kept and pushed when the network returns', async () => {
    const a = device();
    await a.store.pull();
    online = false;
    a.store.update((s) => void (s.checks['m90-s06'] = 6));
    await a.store.push();
    expect(a.store.status).toBe('offline');
    online = true;
    await a.store.pull();
    const b = device();
    await b.store.pull();
    expect(b.store.get().checks['m90-s06']).toBe(6);
  });

  it('a device without changes takes the server copy as it is', async () => {
    const a = device();
    await a.store.pull();
    a.store.update((s) => void (s.settings.theme = 'dark'));
    await a.store.push();
    const b = device();
    b.storage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, settings: { theme: 'light' } }));
    b.store.reload();
    await b.store.pull();
    expect(b.store.get().settings.theme).toBe('dark');
  });

  it('a hostile server answer is bounded by parseState', async () => {
    db.put(db.get().rev, JSON.stringify({ v: 1, done: { __proto__: 1, 'ok-1': 1, '<script>': 2 } }));
    const a = device();
    await a.store.pull();
    expect(Object.keys(a.store.get().done)).toContain('ok-1');
    expect(Object.keys(a.store.get().done)).not.toContain('<script>');
  });
});
