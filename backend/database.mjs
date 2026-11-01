import initSqlJs from 'sql.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync, fsyncSync } from 'node:fs';
import path from 'node:path';

export async function openDatabase(filename) {
  mkdirSync(path.dirname(filename), { recursive: true });
  // sql.js keeps a memory image: prevent two writers from overwriting each other.
  const lock = `${filename}.lock`;
  let lockFd;
  try { lockFd = openSync(lock, 'wx'); } catch { throw new Error(`Baza jest zablokowana: ${lock}. Zamknij drugi serwer. Po awarii sprawdź procesy przed usunięciem blokady.`); }
  writeFileSync(lockFd, String(process.pid));
  const SQL = await initSqlJs();
  let db = new SQL.Database(existsSync(filename) ? readFileSync(filename) : undefined);
  function one(sql, params = []) { const stmt = db.prepare(sql); try { stmt.bind(params); return stmt.step() ? stmt.getAsObject() : null; } finally { stmt.free(); } }
  function all(sql, params = []) { const stmt = db.prepare(sql); try { stmt.bind(params); const rows = []; while (stmt.step()) rows.push(stmt.getAsObject()); return rows; } finally { stmt.free(); } }
  function run(sql, params = []) { db.run(sql, params); }
  function save() {
    const temp = `${filename}.tmp`;
    const fd = openSync(temp, 'w', 0o600);
    try { writeFileSync(fd, db.export()); fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(temp, filename);
    db.run('PRAGMA foreign_keys = ON');
  }
  function transaction(fn) {
    const previous = db.export();
    db.run('PRAGMA foreign_keys = ON');
    db.run('BEGIN');
    try { const result = fn(); db.run('COMMIT'); save(); return result; }
    catch (error) { db.close(); db = new SQL.Database(previous); db.run('PRAGMA foreign_keys = ON'); throw error; }
  }
  db.run(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS users(
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    INSERT OR IGNORE INTO schema_migrations VALUES(1, unixepoch() * 1000);`);
  if (!one('SELECT version FROM schema_migrations WHERE version=2')) {
    db.run(`
      CREATE TABLE books(
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 100),
        author TEXT NOT NULL CHECK(length(trim(author)) BETWEEN 1 AND 100),
        category TEXT NOT NULL,
        condition TEXT NOT NULL,
        description TEXT NOT NULL CHECK(length(trim(description)) BETWEEN 1 AND 1500),
        cover_theme TEXT NOT NULL DEFAULT 'olive',
        cover_art TEXT NOT NULL DEFAULT 'sun',
        cover_kicker TEXT NOT NULL DEFAULT '',
        cover_subtitle TEXT NOT NULL DEFAULT '',
        cover_note TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0)
      );
      CREATE INDEX books_owner ON books(owner_id);
      CREATE INDEX books_created ON books(created_at DESC, id);
      CREATE INDEX books_category ON books(category, created_at DESC);
      CREATE TABLE book_photos(
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        storage_key TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
        byte_size INTEGER NOT NULL CHECK(byte_size > 0 AND byte_size <= 10485760),
        width INTEGER NOT NULL CHECK(width > 0),
        height INTEGER NOT NULL CHECK(height > 0),
        alt_text TEXT NOT NULL DEFAULT '',
        position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 4),
        created_at INTEGER NOT NULL,
        UNIQUE(book_id, position)
      );
      INSERT INTO schema_migrations VALUES(2, unixepoch() * 1000);
    `);
  }
  save();
  let closed = false;
  return { one, all, run, transaction, close() { if (closed) return; closed = true; db.close(); closeSync(lockFd); unlinkSync(lock); } };
}
