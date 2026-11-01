import { randomUUID } from 'node:crypto';
import { categories, conditions, coverThemes, coverArts } from '../public/data.js';
import { fail, readBody, reply, replyError, checkOrigin } from './http.mjs';

const fields = {
  title: 100, author: 100, description: 1500,
  kicker: 100, subtitle: 100, note: 200
};
const required = new Set(['title', 'author', 'description']);
const labels = { title: 'Tytuł', author: 'Autor', description: 'Opis', kicker: 'Podpis autora', subtitle: 'Tytuł na okładce', note: 'Dopisek', category: 'Kategoria', condition: 'Stan książki', theme: 'Kolor okładki', art: 'Ilustracja' };
const choices = { category: categories.slice(1), condition: conditions, theme: coverThemes, art: coverArts };
const editable = new Set([...Object.keys(fields), ...Object.keys(choices)]);
const select = 'SELECT b.*, u.name AS owner_name FROM books b JOIN users u ON u.id=b.owner_id';

function serialize(row) {
  return {
    id: row.id, owner: row.owner_id, ownerName: row.owner_name,
    title: row.title, author: row.author, category: row.category,
    condition: row.condition, description: row.description,
    theme: row.cover_theme, art: row.cover_art, kicker: row.cover_kicker,
    subtitle: row.cover_subtitle, note: row.cover_note,
    createdAt: row.created_at, updatedAt: row.updated_at, version: row.version
  };
}

function validate(data, previous) {
  for (const key of Object.keys(data)) {
    if (!editable.has(key) && !(previous && key === 'version')) throw fail(422, `Niedozwolone pole: ${key}.`);
  }
  if (previous && (!Number.isSafeInteger(data.version) || data.version < 1)) throw fail(422, 'Brakuje poprawnej wersji ogłoszenia.');
  if (previous && data.version !== previous.version) throw fail(409, 'Ogłoszenie zmieniło się w międzyczasie. Otwórz je ponownie przed edycją.');
  const result = { theme: 'olive', art: 'sun', kicker: '', subtitle: '', note: '', ...previous, ...data };
  for (const [key, max] of Object.entries(fields)) {
    if (typeof result[key] !== 'string') throw fail(422, `Niepoprawne pole: ${labels[key]}.`);
    result[key] = result[key].trim();
    if (result[key].length > max || (required.has(key) && !result[key])) throw fail(422, `${labels[key]}: ${required.has(key) ? '1' : '0'}–${max} znaków.`);
  }
  for (const [key, allowed] of Object.entries(choices)) {
    if (!allowed.includes(result[key])) throw fail(422, `Niepoprawna wartość pola: ${labels[key]}.`);
  }
  return result;
}

export function createBooks(db, auth) {
  const get = id => db.one(`${select} WHERE b.id=?`, [id]);
  return async function books(req, res, url) {
    if (url.pathname !== '/api/books' && !url.pathname.startsWith('/api/books/')) return false;
    try {
      const match = /^\/api\/books(?:\/([a-f0-9-]{36}))?$/.exec(url.pathname);
      if (!match) throw fail(404, 'Nie znaleziono ogłoszenia.');
      const id = match[1];
      if (req.method === 'GET') {
        if (id) {
          const row = get(id);
          if (!row) throw fail(404, 'Ogłoszenie nie jest już dostępne.');
          reply(res, 200, { book: serialize(row) });
        } else {
          reply(res, 200, { books: db.all(`${select} ORDER BY b.created_at DESC, b.id`).map(serialize) });
        }
        return true;
      }
      if (!((req.method === 'POST' && !id) || (['PATCH', 'DELETE'].includes(req.method) && id))) throw fail(405, 'Metoda niedozwolona.');
      checkOrigin(req);
      let user = auth.session(req);
      if (!user) throw fail(401, 'Zaloguj się, aby zarządzać ogłoszeniami.');
      const data = await readBody(req, 16384);
      // Reading the request is asynchronous: check that the session still exists.
      user = auth.session(req);
      if (!user) throw fail(401, 'Sesja wygasła. Zaloguj się ponownie.');
      const row = id ? get(id) : null;
      if (id && !row) throw fail(404, 'Ogłoszenie nie jest już dostępne.');
      if (row && row.owner_id !== user.id) throw fail(403, 'Możesz zmieniać tylko własne ogłoszenia.');
      if (req.method === 'DELETE') {
        if (Object.keys(data).some(key => key !== 'version') || !Number.isSafeInteger(data.version) || data.version < 1) throw fail(422, 'Podaj wersję usuwanego ogłoszenia.');
        if (data.version !== row.version) throw fail(409, 'Ogłoszenie zmieniło się w międzyczasie. Otwórz je ponownie przed usunięciem.');
        db.transaction(() => db.run('DELETE FROM books WHERE id=? AND owner_id=?', [id, user.id]));
        reply(res, 200, { ok: true });
      } else {
        const book = validate(data, row && serialize(row));
        const now = Date.now();
        const bookId = id || randomUUID();
        const values = [book.title, book.author, book.category, book.condition, book.description, book.theme, book.art, book.kicker, book.subtitle, book.note];
        db.transaction(() => {
          if (id) {
            db.run(`UPDATE books SET title=?, author=?, category=?, condition=?, description=?, cover_theme=?, cover_art=?, cover_kicker=?, cover_subtitle=?, cover_note=?, updated_at=?, version=version+1 WHERE id=? AND owner_id=?`, [...values, now, id, user.id]);
          } else {
            db.run(`INSERT INTO books(title,author,category,condition,description,cover_theme,cover_art,cover_kicker,cover_subtitle,cover_note,id,owner_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [...values, bookId, user.id, now, now]);
          }
        });
        reply(res, id ? 200 : 201, { book: serialize(get(bookId)) });
      }
    } catch (error) { replyError(res, error); }
    return true;
  };
}
