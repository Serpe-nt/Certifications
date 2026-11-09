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

describe('sync of the study features (card S2)', () => {
  const mockBank = ['q-mock-pca-001', 'q-mock-pca-002'].map((id) => ({ id, pool: 'mock-pca', tags: ['t'], cert: 'pca' as const, domain: 'P1', n: 4, a: [0] }));
  const by = new Map(mockBank.map((x) => [x.id, x]));
  // Earlier tests leave progress on the shared server copy; these start from an empty one.
  beforeEach(() => void db.put(db.get().rev, JSON.stringify({ v: 2 })));

  it('a mock exam submitted on one device is not submitted again by another that had it open', async () => {
    const { startExam, markExam, submitExam } = await import('../../src/lib/runs.ts');
    const pc = device();
    const phone = device();
    await pc.store.pull();
    pc.store.update((s) => startExam(s, 'pca', mockBank, Date.now()));
    await pc.store.push();
    await phone.store.pull();
    expect(phone.store.get().exam?.ids).toHaveLength(2);
    // The phone changes an answer offline while the PC submits.
    online = false;
    phone.store.update((s) => markExam(s, 'q-mock-pca-001', { a: [3] }, Date.now()));
    await phone.store.push();
    online = true;
    pc.store.update((s) => {
      markExam(s, 'q-mock-pca-001', { a: [0] }, Date.now() - 1000);
      submitExam(s, by, Date.now(), false);
    });
    await pc.store.push();
    await phone.store.pull(); // 200 with the new copy; the phone was dirty, so it merges and pushes
    await pc.store.pull();
    for (const s of [pc.store.get(), phone.store.get()]) {
      expect(s.exam?.done).toBeGreaterThan(0);
      expect(s.exam?.marks['q-mock-pca-001'].a).toEqual([0]);
      expect(s.mocks).toHaveLength(1);
    }
  });

  it('three devices that changed different things offline converge', async () => {
    const devices = [device(), device(), device()];
    for (const d of devices) await d.store.pull();
    online = false;
    const [a, b, c] = devices;
    a.store.update((s) => {
      s.done['m90-s01'] = 1;
      s.qs['q-m90-101'] = { seen: 2, right: 1, last: 1, at: 10, xp: 1 };
    });
    b.store.update((s) => {
      s.done['m90-s02'] = 2;
      s.qs['q-m90-101'] = { seen: 1, right: 0, last: 0, at: 20, xp: 0 };
      s.srs['q-m90-101'] = { step: 0, due: '2026-11-10' };
      s.quizzes.m90 = { best: 87, passed: 20, tries: [{ at: 20, score: 13, n: 15 }] };
    });
    c.store.update((s) => {
      s.checks['m90-s02'] = 3;
      s.rowBest = 9;
      s.quizzes.m90 = { best: 60, passed: 0, tries: [{ at: 30, score: 9, n: 15 }] };
    });
    online = true;
    for (const d of devices) await d.store.pull();
    for (const d of devices) await d.store.pull();
    const docs = devices.map((d) => JSON.stringify(d.store.get(), (k, v) => (k === 'savedAt' ? undefined : v)));
    expect(new Set(docs).size).toBe(1);
    const s = a.store.get();
    expect(Object.keys(s.done).sort()).toEqual(['m90-s01', 'm90-s02']);
    expect(s.checks['m90-s02']).toBe(3);
    expect(s.qs['q-m90-101'].seen).toBe(2);
    expect('q-m90-101' in s.srs).toBe(false);
    expect(s.quizzes.m90).toMatchObject({ best: 87, passed: 20 });
    expect(s.quizzes.m90.tries).toHaveLength(2);
    expect(s.rowBest).toBe(9);
  });

  it('the first sync is reported once the first pull has finished', async () => {
    const a = device();
    expect(a.store.firstSyncDone).toBe(false);
    const p = a.store.pull();
    expect(a.store.isPulling()).toBe(true);
    await p;
    await a.store.firstSync;
    expect(a.store.firstSyncDone).toBe(true);
    expect(a.store.isPulling()).toBe(false);
  });
});
