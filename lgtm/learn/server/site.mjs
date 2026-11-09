// Serves the static build. At start-up every file is read into memory once:
// - the build's base placeholder is replaced with BASE_PATH in every text file,
// - text files are gzipped once,
// - the hashes of inline scripts and styles are collected for the content security policy.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/** Must match BASE_PLACEHOLDER in src/lib/build-env.ts. */
export const BASE_PLACEHOLDER = '/__lgtm_base__';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
const TEXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.xml', '.webmanifest']);

/**
 * @typedef {{ body: Buffer, gz: Buffer | null, type: string, etag: string, immutable: boolean }} Asset
 */

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

const sha256 = (text) => `'sha256-${crypto.createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** Inline <script> and <style> contents of an HTML page, for CSP hashes. */
export function inlineHashes(html) {
  const scripts = new Set();
  const styles = new Set();
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/.test(m[1]) && m[2].length) scripts.add(sha256(m[2]));
  }
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (m[1].length) styles.add(sha256(m[1]));
  }
  return { scripts, styles };
}

/**
 * @param {string} dir  the build output
 * @param {string} base  '' or a prefix such as '/h2'
 */
export function loadSite(dir, base) {
  /** @type {Map<string, Asset>} */
  const files = new Map();
  const scripts = new Set();
  const styles = new Set();
  for (const full of walk(dir)) {
    const rel = path.relative(dir, full).split(path.sep).join('/');
    const ext = path.extname(rel).toLowerCase();
    let body = fs.readFileSync(full);
    if (TEXT.has(ext)) {
      const text = body.toString('utf8').replaceAll(BASE_PLACEHOLDER, base);
      if (ext === '.html') {
        const h = inlineHashes(text);
        h.scripts.forEach((x) => scripts.add(x));
        h.styles.forEach((x) => styles.add(x));
      }
      body = Buffer.from(text, 'utf8');
    }
    const gz = TEXT.has(ext) && body.length > 512 ? zlib.gzipSync(body, { level: 9 }) : null;
    files.set(rel, {
      body,
      gz,
      type: TYPES[ext] ?? 'application/octet-stream',
      etag: `"${crypto.createHash('sha1').update(body).digest('base64url').slice(0, 20)}"`,
      immutable: rel.startsWith('_astro/'),
    });
  }
  return { files, scripts, styles };
}

/**
 * Finds the file for a URL path below the base (it starts with '/').
 * @returns {{ asset: Asset, status: number } | { redirect: string } | null}
 */
export function resolve(site, urlPath) {
  let p;
  try {
    p = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (p.includes('\0') || p.split('/').some((seg) => seg === '..' || seg === '.')) return null;
  const rel = p.replace(/^\/+/, '');
  if (rel === '' || rel.endsWith('/')) {
    const asset = site.files.get(`${rel}index.html`);
    return asset ? { asset, status: 200 } : null;
  }
  const asset = site.files.get(rel);
  if (asset) return { asset, status: 200 };
  if (site.files.has(`${rel}/index.html`)) return { redirect: `${p}/` };
  return null;
}
