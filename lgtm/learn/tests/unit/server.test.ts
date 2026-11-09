import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, hostName, parseBase } from '../../server/main.mjs';
import { BASE_PLACEHOLDER as SERVER_PLACEHOLDER } from '../../server/site.mjs';
import { BASE_PLACEHOLDER } from '../../src/lib/build-env.ts';

const PORT = 8096; // free while the end-to-end servers are not running (npm test runs these first)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lgtm-dist-'));
const P = BASE_PLACEHOLDER;

function writeSite() {
  const files: Record<string, string> = {
    'index.html': `<!doctype html><html><head><script>var inline = 1;</script><link rel="stylesheet" href="${P}/_astro/a.css"></head><body><a href="${P}/m/m01/s01/">step</a>${'x'.repeat(600)}</body></html>`,
    'm/m01/s01/index.html': `<!doctype html><p>step</p><script type="module" src="${P}/_astro/a.js"></script>`,
    '404.html': '<!doctype html><p>not here</p>',
    '_astro/a.js': `fetch("${P}/api/state")`,
    '_astro/a.css': 'body{color:red}',
  };
  for (const [f, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), text);
  }
}

interface Res {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  raw: Buffer;
}

function request(port: number, method: string, p: string, headers: Record<string, string> = {}, body?: string): Promise<Res> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: p, agent: false, headers: { host: 'localhost', ...headers } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: raw.toString('utf8'), raw });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

const json = { 'content-type': 'application/json' };

describe('server at /', () => {
  let srv: ReturnType<typeof createServer>;
  beforeAll(async () => {
    writeSite();
    srv = createServer({ distDir: dir, dbPath: ':memory:', allowedHosts: new Set(['localhost']), base: '' });
    await new Promise<void>((r) => srv.server.listen(PORT, '127.0.0.1', r));
  });
  afterAll(async () => {
    await new Promise((r) => srv.server.close(r));
    srv.store.close();
  });

  it('the placeholder constant is the same in the build and the server', () => {
    expect(SERVER_PLACEHOLDER).toBe(BASE_PLACEHOLDER);
  });

  it('serves pages with the base placeholder replaced and security headers', async () => {
    const r = await request(PORT, 'GET', '/');
    expect(r.status).toBe(200);
    expect(r.body).toContain('href="/m/m01/s01/"');
    expect(r.body).not.toContain(P);
    const csp = String(r.headers['content-security-policy']);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toMatch(/script-src 'self' 'sha256-[A-Za-z0-9+/=]+'/);
    expect(csp).not.toMatch(/https?:/);
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBe('DENY');
    expect(r.headers['cache-control']).toBe('no-cache');
  });

  it('gzips text for browsers that accept it, and answers 304 to a known ETag', async () => {
    const r = await request(PORT, 'GET', '/', { 'accept-encoding': 'gzip' });
    expect(r.headers['content-encoding']).toBe('gzip');
    expect(zlib.gunzipSync(r.raw).toString()).toContain('step');
    const again = await request(PORT, 'GET', '/', { 'if-none-match': String(r.headers.etag) });
    expect(again.status).toBe(304);
  });

  it('hashed assets are immutable; scripts carry the base too', async () => {
    const r = await request(PORT, 'GET', '/_astro/a.js');
    expect(r.headers['cache-control']).toContain('immutable');
    expect(r.body).toBe('fetch("/api/state")');
  });

  it('redirects a folder without its slash, 404s unknown paths and traversal', async () => {
    expect((await request(PORT, 'GET', '/m/m01/s01')).headers.location).toBe('/m/m01/s01/');
    expect((await request(PORT, 'GET', '/nope/')).status).toBe(404);
    expect((await request(PORT, 'GET', '/m/../../etc/passwd')).status).toBe(404);
    expect((await request(PORT, 'GET', '/%2e%2e/%2e%2e/etc/passwd')).status).toBe(404);
    expect((await request(PORT, 'GET', '/m/')).status).toBe(404);
  });

  it('refuses unknown hosts (DNS rebinding) but not the health probe', async () => {
    expect((await request(PORT, 'GET', '/', { host: 'evil.example' })).status).toBe(421);
    expect((await request(PORT, 'GET', '/healthz', { host: 'evil.example' })).status).toBe(200);
  });

  it('the state API: empty, write, 304, conflict, validation', async () => {
    const empty = await request(PORT, 'GET', '/api/state');
    expect(JSON.parse(empty.body)).toEqual({ rev: 0, doc: null, savedAt: 0 });
    expect(empty.headers.etag).toBe('"0"');

    const put = await request(PORT, 'PUT', '/api/state', { ...json, 'if-match': '"0"' }, JSON.stringify({ v: 1, done: { a: 1 } }));
    expect(put.status).toBe(200);
    expect(JSON.parse(put.body)).toEqual({ rev: 1 });

    expect((await request(PORT, 'GET', '/api/state', { 'if-none-match': '"1"' })).status).toBe(304);
    expect((await request(PORT, 'GET', '/api/state', { 'if-none-match': 'W/"1"' })).status).toBe(304);
    const fresh = await request(PORT, 'GET', '/api/state', { 'if-none-match': '"0"' });
    expect(JSON.parse(fresh.body).doc).toEqual({ v: 1, done: { a: 1 } });

    const stale = await request(PORT, 'PUT', '/api/state', { ...json, 'if-match': '"0"' }, '{"v":1}');
    expect(stale.status).toBe(409);
    expect(JSON.parse(stale.body)).toMatchObject({ rev: 1, doc: { v: 1, done: { a: 1 } } });

    expect((await request(PORT, 'PUT', '/api/state', json, '{}')).status).toBe(428);
    expect((await request(PORT, 'PUT', '/api/state', { 'content-type': 'text/plain', 'if-match': '"1"' }, '{}')).status).toBe(415);
    expect((await request(PORT, 'PUT', '/api/state', { ...json, 'if-match': '"1"' }, '[1]')).status).toBe(400);
    expect((await request(PORT, 'PUT', '/api/state', { ...json, 'if-match': '"1"' }, '{bad')).status).toBe(400);
    expect((await request(PORT, 'PUT', '/api/state', { ...json, 'if-match': '"1"' }, `{"x":"${'a'.repeat(1024 * 1024)}"}`)).status).toBe(413);
    expect((await request(PORT, 'DELETE', '/api/state')).status).toBe(405);
  });

  it('refuses cross-site writes', async () => {
    const body = '{"v":1}';
    expect((await request(PORT, 'PUT', '/api/state', { ...json, 'if-match': '"1"', 'sec-fetch-site': 'cross-site' }, body)).status).toBe(403);
    expect((await request(PORT, 'PUT', '/api/state', { ...json, 'if-match': '"1"', origin: 'http://evil.example' }, body)).status).toBe(403);
    const same = await request(PORT, 'PUT', '/api/state', { ...json, 'if-match': '"1"', origin: 'http://localhost', 'sec-fetch-site': 'same-origin' }, body);
    expect(same.status).toBe(200);
  });
});

describe('server under BASE_PATH=/h2', () => {
  let srv: ReturnType<typeof createServer>;
  beforeAll(async () => {
    srv = createServer({ distDir: dir, dbPath: ':memory:', allowedHosts: new Set(['localhost']), base: '/h2' });
    await new Promise<void>((r) => srv.server.listen(PORT, '127.0.0.1', r));
  });
  afterAll(async () => {
    await new Promise((r) => srv.server.close(r));
    srv.store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('serves everything under the prefix with the prefix in every link', async () => {
    const r = await request(PORT, 'GET', '/h2/');
    expect(r.body).toContain('href="/h2/m/m01/s01/"');
    expect((await request(PORT, 'GET', '/h2/_astro/a.js')).body).toBe('fetch("/h2/api/state")');
    expect((await request(PORT, 'GET', '/h2')).headers.location).toBe('/h2/');
    expect((await request(PORT, 'GET', '/')).status).toBe(404);
    expect((await request(PORT, 'GET', '/h2/api/state')).status).toBe(200);
    expect((await request(PORT, 'GET', '/h2/healthz')).status).toBe(200);
  });
});

describe('settings parsing', () => {
  it('BASE_PATH and host names', () => {
    expect(parseBase('/h2/')).toBe('/h2');
    expect(parseBase('')).toBe('');
    expect(() => parseBase('h2')).toThrow();
    expect(() => parseBase('/a b')).toThrow();
    expect(hostName('[::1]:8080')).toBe('::1');
    expect(hostName('LocalHost:8082')).toBe('localhost');
  });
});
