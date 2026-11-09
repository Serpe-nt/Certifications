// The progress API: GET and PUT /api/state. Used by server/main.mjs and by `astro dev`.
// The request has already passed the host and origin checks in main.mjs (not in dev).

export const MAX_BODY = 1024 * 1024; // 1 MB; a full course of progress is far smaller.

/** @param {import('node:http').ServerResponse} res @param {number} status @param {unknown} body @param {Record<string,string>} [headers] */
function json(res, status, body, headers = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(text);
}

/** Reads "<n>" or W/"<n>" from an ETag-style header; null when absent or malformed. */
export function parseTag(value) {
  if (typeof value !== 'string') return null;
  const m = /^\s*(?:W\/)?"(\d{1,15})"\s*$/.exec(value);
  return m ? Number(m[1]) : null;
}

/** @param {import('node:http').IncomingMessage} req @returns {Promise<string | null>} null when too large */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let over = false;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) over = true;
      else chunks.push(c);
    });
    req.on('end', () => resolve(over ? null : Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** @param {ReturnType<typeof import('./store.mjs').openStore>} store */
export function createApi(store) {
  /** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
  return async function api(req, res) {
    if (req.method === 'GET' || req.method === 'HEAD') {
      const cur = store.get();
      const etag = `"${cur.rev}"`;
      if (parseTag(req.headers['if-none-match']) === cur.rev) {
        res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-store' });
        return res.end();
      }
      return json(res, 200, { rev: cur.rev, doc: cur.doc ? JSON.parse(cur.doc) : null, savedAt: cur.savedAt }, { ETag: etag });
    }
    if (req.method === 'PUT') {
      if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
        return json(res, 415, { error: 'Content-Type must be application/json' });
      }
      const ifRev = parseTag(req.headers['if-match']);
      if (ifRev === null) return json(res, 428, { error: 'If-Match with the revision you last saw is required' });
      const text = await readBody(req);
      if (text === null) return json(res, 413, { error: `the document is larger than ${MAX_BODY} bytes` });
      let doc;
      try {
        doc = JSON.parse(text);
      } catch {
        return json(res, 400, { error: 'the body is not JSON' });
      }
      if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return json(res, 400, { error: 'the document must be a JSON object' });
      const result = store.put(ifRev, JSON.stringify(doc));
      if (!result.ok) {
        const cur = result.current;
        return json(res, 409, { rev: cur.rev, doc: cur.doc ? JSON.parse(cur.doc) : null, savedAt: cur.savedAt }, { ETag: `"${cur.rev}"` });
      }
      return json(res, 200, { rev: result.rev }, { ETag: `"${result.rev}"` });
    }
    res.writeHead(405, { Allow: 'GET, HEAD, PUT', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
  };
}
