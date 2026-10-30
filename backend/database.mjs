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
  save();
  let closed = false;
  return { one, run, transaction, close() { if (closed) return; closed = true; db.close(); closeSync(lockFd); unlinkSync(lock); } };
}
