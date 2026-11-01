import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import initSqlJs from 'sql.js';
import { openDatabase } from '../backend/database.mjs';
import { createAuth } from '../backend/auth.mjs';
import { createBooks } from '../backend/books.mjs';
import { reply } from '../backend/http.mjs';

const input = {
  title: ' Zażółć gęślą jaźń ', author: 'Autorka Testowa', category: 'Literatura piękna',
  condition: 'Bardzo dobry', description: 'Opis egzemplarza.\nBez uszkodzeń.',
  theme: 'blue', art: 'planet', kicker: 'AUTORKA', subtitle: 'Zażółć\ngęślą', note: 'Własny dopisek'
};

test('Ogłoszenia: CRUD, uprawnienia dwóch kont, walidacja, konflikty i trwałość', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bookflow-books-'));
  const file = path.join(dir, 'books.sqlite');
  let db = await openDatabase(file);
  let auth = await createAuth(db), books = createBooks(db, auth);
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (await auth(req, res, url) || await books(req, res, url)) return;
    reply(res, 404, { error: 'Brak endpointu' });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function call(route, method = 'GET', data, cookie = '', origin = base, contentType = 'application/json') {
    const response = await fetch(base + route, {
      method, headers: { origin, cookie, 'Content-Type': contentType },
      body: data === undefined ? undefined : JSON.stringify(data)
    });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  async function restart() {
    db.close(); db = await openDatabase(file);
    auth = await createAuth(db); books = createBooks(db, auth);
  }
  try {
    assert.deepEqual((await call('/api/books')).body, { books: [] });
    const alice = await call('/api/auth/register', 'POST', { name: 'Ala', email: 'ala@example.com', password: 'Testowe-haslo-12345' });
    const bob = await call('/api/auth/register', 'POST', { name: 'Bob', email: 'bob@example.com', password: 'Testowe-haslo-12345' });
    assert.equal(alice.status, 201); assert.equal(bob.status, 201);
    assert.equal((await call('/api/books', 'POST', input)).status, 401);
    assert.equal((await call('/api/books', 'POST', input, alice.cookie, 'https://evil.example')).status, 403);
    assert.equal((await call('/api/books', 'POST', input, alice.cookie, base, 'text/plain')).status, 415);
    for (const invalid of [{ title: '  ' }, { author: null }, { description: 'x'.repeat(1501) }, { category: 'Nieznana' }, { condition: 'Nowy?' }, { theme: 'evil' }, { art: '<script>' }, { owner: bob.body.user.id }, { id: 'custom' }, { photos: [] }]) {
      assert.equal((await call('/api/books', 'POST', { ...input, ...invalid }, alice.cookie)).status, 422);
    }
    assert.equal((await call('/api/books', 'POST', { ...input, description: 'ą'.repeat(9000) }, alice.cookie)).status, 413);
    const created = await call('/api/books', 'POST', input, alice.cookie);
    assert.equal(created.status, 201);
    const book = created.body.book, route = '/api/books/' + book.id;
    assert.equal(book.owner, alice.body.user.id); assert.equal(book.ownerName, 'Ala');
    for (const [key, value] of Object.entries(input)) assert.equal(book[key], value.trim());
    assert.equal(book.version, 1); assert.ok(book.createdAt > 0);
    assert.equal(db.one('SELECT COUNT(*) AS n FROM books').n, 1);
    assert.equal((await call(route)).body.book.id, book.id);
    const publicList = (await call('/api/books')).body.books;
    assert.equal(publicList.length, 1);
    assert.ok(!JSON.stringify(publicList).includes('email'));
    assert.ok(!JSON.stringify(publicList).includes('password'));
    assert.equal((await call(route, 'PATCH', { title: 'Nie moje', version: 1 }, bob.cookie)).status, 403);
    assert.equal((await call(route, 'DELETE', { version: 1 }, bob.cookie)).status, 403);
    assert.equal((await call(route, 'PATCH', { title: 'Bez wersji' }, alice.cookie)).status, 422);
    assert.equal((await call(route, 'PATCH', { title: 'CSRF', version: 1 }, alice.cookie, 'https://evil.example')).status, 403);
    const updated = await call(route, 'PATCH', { title: 'Poprawiony tytuł', condition: 'Dobry', version: 1 }, alice.cookie);
    assert.equal(updated.status, 200); assert.equal(updated.body.book.version, 2);
    assert.equal(updated.body.book.createdAt, book.createdAt);
    assert.equal(updated.body.book.note, input.note);
    assert.equal((await call(route, 'PATCH', { title: 'Stara karta', version: 1 }, alice.cookie)).status, 409);
    assert.equal((await call(route, 'DELETE', { version: 1 }, alice.cookie)).status, 409);
    await restart();
    assert.equal((await call(route)).body.book.title, 'Poprawiony tytuł');
    assert.equal((await call('/api/auth/me', 'GET', undefined, alice.cookie)).body.user.id, alice.body.user.id);
    const snapshot = await readFile(file);
    const SQL = await initSqlJs(), disk = new SQL.Database(snapshot);
    assert.equal(disk.exec('SELECT title FROM books')[0].values[0][0], 'Poprawiony tytuł');
    disk.close();
    db.transaction(() => db.run('INSERT INTO book_photos VALUES(?,?,?,?,?,?,?,?,?,?)', ['photo-1', book.id, 'books/photo-1.webp', 'image/webp', 1200, 800, 1200, 'Okładka', 0, Date.now()]));
    assert.throws(() => db.transaction(() => db.run('INSERT INTO book_photos VALUES(?,?,?,?,?,?,?,?,?,?)', ['photo-2', book.id, 'books/photo-2.webp', 'image/webp', 1200, 800, 1200, '', 0, Date.now()])));
    assert.equal((await call(route, 'DELETE', { version: 2 }, alice.cookie, 'https://evil.example')).status, 403);
    assert.equal((await call(route, 'DELETE', { version: 2 }, alice.cookie)).status, 200);
    assert.equal(db.one('SELECT COUNT(*) AS n FROM book_photos').n, 0);
    assert.equal((await call(route)).status, 404);
    assert.equal((await call(route, 'PATCH', { title: 'Usunięta', version: 2 }, alice.cookie)).status, 404);
    await restart();
    assert.deepEqual((await call('/api/books')).body.books, []);
    db.transaction(() => db.run('UPDATE sessions SET expires_at=0'));
    assert.equal((await call('/api/books', 'POST', input, alice.cookie)).status, 401);
    assert.equal((await call('/api/books', 'PUT', input)).status, 405);
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    db.close(); await rm(dir, { recursive: true, force: true });
  }
});

test('Migracja istniejącej bazy v1 zachowuje konta i sesje, nie dodaje przykładów', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bookflow-migrate-'));
  const file = path.join(dir, 'old.sqlite');
  let db;
  try {
    const SQL = await initSqlJs(), old = new SQL.Database();
    old.run(`CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
      INSERT INTO schema_migrations VALUES(1, 1);
      CREATE TABLE users(id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
      INSERT INTO users VALUES('existing', 'existing@example.com', 'Existing', 'unchanged-hash', 1);
      CREATE TABLE sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
      INSERT INTO sessions VALUES('unchanged-token', 'existing', 1, 9999999999999);`);
    await writeFile(file, old.export()); old.close();
    db = await openDatabase(file);
    assert.equal(db.one('SELECT password_hash FROM users').password_hash, 'unchanged-hash');
    assert.equal(db.one('SELECT token_hash FROM sessions').token_hash, 'unchanged-token');
    assert.equal(db.one('SELECT COUNT(*) AS n FROM books').n, 0);
    assert.equal(db.one('SELECT COUNT(*) AS n FROM book_photos').n, 0);
    assert.equal(db.one('SELECT MAX(version) AS v FROM schema_migrations').v, 2);
    db.close(); db = await openDatabase(file);
    assert.equal(db.one('SELECT COUNT(*) AS n FROM schema_migrations').n, 2);
  } finally { db?.close(); await rm(dir, { recursive: true, force: true }); }
});
