// The study site's server: static pages, the progress API, and the guards around them.
//
// Settings (environment):
//   ADDR           where to listen, ":8080" or "127.0.0.1:8095" (default :8080)
//   DIST_DIR       the Astro build to serve (default ../dist next to this file)
//   DB_PATH        the SQLite file (default ../data/learn.db; /data/learn.db in the image)
//   ALLOWED_HOSTS  host names the server answers to, comma-separated (default localhost,127.0.0.1,::1)
//   BASE_PATH      URL prefix when a proxy passes /h2/... through unchanged (default: none)
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from './api.mjs';
import { openStore } from './store.mjs';
import { loadSite, resolve } from './site.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

export function parseAddr(addr) {
  const m = /^(.*):(\d{1,5})$/.exec(addr ?? ':8080');
  if (!m) throw new Error(`ADDR "${addr}" must look like :8080 or 127.0.0.1:8095`);
  return { host: m[1].replace(/^\[|\]$/g, '') || '0.0.0.0', port: Number(m[2]) };
}

export function parseBase(raw) {
  const base = (raw ?? '').trim().replace(/\/+$/, '');
  if (base && !/^(\/[A-Za-z0-9._~-]+)+$/.test(base)) throw new Error(`BASE_PATH "${raw}" must look like /h2`);
  return base;
}

export function parseHosts(raw) {
  return new Set(
    (raw ?? 'localhost,127.0.0.1,::1')
      .split(',')
      .map((h) => h.trim().toLowerCase().replace(/^\[|\]$/g, ''))
      .filter(Boolean),
  );
}

/** Host name from a Host header or an origin's host, without the port. */
export function hostName(value) {
  const v = (value ?? '').trim().toLowerCase();
  if (v.startsWith('[')) return v.slice(1, v.indexOf(']'));
  return v.replace(/:\d+$/, '');
}

/**
 * @param {{ distDir: string, dbPath: string, allowedHosts: Set<string>, base: string }} cfg
 */
export function createServer(cfg) {
  const site = loadSite(cfg.distDir, cfg.base);
  const store = openStore(cfg.dbPath);
  const api = createApi(store);
  const csp = [
    "default-src 'none'",
    `script-src 'self' ${[...site.scripts].join(' ')}`.trim(),
    `style-src 'self' ${[...site.styles].join(' ')}`.trim(),
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ].join('; ');
  const security = {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  };

  const text = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
    res.end(body);
  };

  const notFound = (req, res) => {
    const page = site.files.get('404.html');
    if (!page) return text(res, 404, 'Not found');
    res.writeHead(404, { 'Content-Type': page.type, 'Cache-Control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : page.body);
  };

  const server = http.createServer(async (req, res) => {
    for (const [k, v] of Object.entries(security)) res.setHeader(k, v);
    res.setHeader('Vary', 'Accept-Encoding');
    const url = new URL(req.url ?? '/', 'http://x');
    let p = url.pathname;

    // Health first: the container's probe uses 127.0.0.1, which needs no host check.
    if (p === '/healthz' || p === `${cfg.base}/healthz`) return text(res, 200, 'ok');

    // DNS rebinding: answer only to the names this server is meant to have.
    if (!cfg.allowedHosts.has(hostName(req.headers.host))) return text(res, 421, 'Unknown host');

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Cross-site request forgery: writes only from this site's own pages.
      const fetchSite = req.headers['sec-fetch-site'];
      if (fetchSite && fetchSite !== 'same-origin') return text(res, 403, 'Cross-site request refused');
      const origin = req.headers.origin;
      if (origin) {
        let originHost = '';
        try {
          originHost = new URL(origin).host;
        } catch {
          originHost = '';
        }
        if (originHost.toLowerCase() !== (req.headers.host ?? '').toLowerCase()) return text(res, 403, 'Foreign origin refused');
      }
    }

    if (cfg.base) {
      if (p === cfg.base) return text(res, 301, '', { Location: `${cfg.base}/` });
      if (!p.startsWith(`${cfg.base}/`)) return notFound(req, res);
      p = p.slice(cfg.base.length);
    }

    if (p === '/api/state') {
      try {
        return await api(req, res);
      } catch {
        if (!res.headersSent) return text(res, 500, 'Server error');
        return res.end();
      }
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return text(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' });
    const found = resolve(site, p);
    if (!found) return notFound(req, res);
    if ('redirect' in found) return text(res, 301, '', { Location: `${cfg.base}${found.redirect}${url.search}` });
    const { asset } = found;
    const headers = {
      'Content-Type': asset.type,
      ETag: asset.etag,
      'Cache-Control': asset.immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    };
    if (req.headers['if-none-match'] === asset.etag) {
      res.writeHead(304, headers);
      return res.end();
    }
    const gzip = asset.gz && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
    const body = gzip ? asset.gz : asset.body;
    res.writeHead(200, { ...headers, ...(gzip ? { 'Content-Encoding': 'gzip' } : {}), 'Content-Length': body.length });
    res.end(req.method === 'HEAD' ? undefined : body);
  });

  return { server, store, csp };
}

function main() {
  const { host, port } = parseAddr(process.env.ADDR);
  const cfg = {
    distDir: path.resolve(process.env.DIST_DIR ?? path.join(here, '../dist')),
    dbPath: process.env.DB_PATH === ':memory:' ? ':memory:' : path.resolve(process.env.DB_PATH ?? path.join(here, '../data/learn.db')),
    allowedHosts: parseHosts(process.env.ALLOWED_HOSTS),
    base: parseBase(process.env.BASE_PATH),
  };
  const { server, store } = createServer(cfg);
  server.listen(port, host, () => {
    console.log(`lgtm-learn listening on ${host}:${port}${cfg.base ? ` under ${cfg.base}/` : ''}, serving ${cfg.distDir}`);
  });
  const stop = () => {
    server.close(() => {
      store.close();
      process.exit(0);
    });
    server.closeIdleConnections();
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
