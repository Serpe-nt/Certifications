// SQLite storage for the learner's state: one row, with a revision that goes up on every write.
// better-sqlite3 is used because node:sqlite is still a release candidate in Node 26 (docs/adr/s1-stack.md).
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @typedef {{ rev: number, doc: string | null, savedAt: number }} Row
 * @typedef {{ ok: true, rev: number } | { ok: false, current: Row }} PutResult
 */

/** @param {string} file  a path, or ':memory:' */
export function openStore(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`CREATE TABLE IF NOT EXISTS state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    rev INTEGER NOT NULL,
    doc TEXT NOT NULL,
    saved_at INTEGER NOT NULL
  )`);
  const select = db.prepare('SELECT rev, doc, saved_at AS savedAt FROM state WHERE id = 1');
  const upsert = db.prepare(
    `INSERT INTO state (id, rev, doc, saved_at) VALUES (1, @rev, @doc, @savedAt)
     ON CONFLICT(id) DO UPDATE SET rev = excluded.rev, doc = excluded.doc, saved_at = excluded.saved_at`,
  );

  /** @returns {Row} */
  const get = () => select.get() ?? { rev: 0, doc: null, savedAt: 0 };

  // A transaction makes the read-check-write one step, so two writers cannot both win.
  const putTx = db.transaction((/** @type {number} */ ifRev, /** @type {string} */ doc) => {
    const cur = get();
    if (cur.rev !== ifRev) return /** @type {PutResult} */ ({ ok: false, current: cur });
    const rev = cur.rev + 1;
    upsert.run({ rev, doc, savedAt: Date.now() });
    return /** @type {PutResult} */ ({ ok: true, rev });
  });

  return {
    get,
    /** @param {number} ifRev @param {string} doc @returns {PutResult} */
    put: (ifRev, doc) => putTx.immediate(ifRev, doc),
    close: () => db.close(),
  };
}
