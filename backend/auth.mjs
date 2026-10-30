import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const params = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const sessionSeconds = 7 * 24 * 3600;
const digest = value => createHash('sha256').update(value).digest('hex');
const publicUser = user => ({ id: user.id, name: user.name, email: user.email, createdAt: user.created_at });
const fail = (status, message) => Object.assign(new Error(message), { status });
async function hashPassword(password) { const salt = randomBytes(16).toString('hex'); const key = await derive(password, salt, 64, params); return `scrypt-v1$${salt}$${key.toString('hex')}`; }
async function matches(password, encoded) { const [,salt,hash] = encoded.split('$'); const key = await derive(password, salt, 64, params); return timingSafeEqual(key, Buffer.from(hash, 'hex')); }
function passwordValid(value) { if (typeof value !== 'string' || value.length < 12 || value.length > 128) throw fail(422, 'Hasło musi mieć od 12 do 128 znaków.'); }
function identity(data) {
  if (typeof data.email !== 'string') throw fail(422, 'Podaj poprawny adres e-mail.');
  const email = data.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw fail(422, 'Podaj poprawny adres e-mail.');
  return email;
}
async function readBody(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw fail(415, 'Wymagany format JSON.');
  let body = '', bytes = 0;
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 8192) throw fail(413, 'Za duże żądanie.'); body += chunk; }
  try { const data = JSON.parse(body); if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error(); return data; }
  catch { throw fail(400, 'Niepoprawne dane JSON.'); }
}
export async function createAuth(db) {
  const dummy = await hashPassword(randomBytes(24).toString('hex'));
  const limits = new Map();
  function rateLimit(key, max) {
    const now = Date.now();
    for (const [k,v] of limits) if (v.until <= now) limits.delete(k);
    const item = limits.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    item.count++; limits.set(key,item);
    if (item.count > max) throw fail(429, 'Zbyt wiele prób. Spróbuj za 15 minut.');
  }
  const cookieValue = req => (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('bookflow_session='))?.slice(17) || '';
  function session(req) { const token = cookieValue(req); if (!/^[a-f0-9]{64}$/.test(token)) return null; return db.one('SELECT u.*, s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?', [digest(token),Date.now()]); }
  const cookie = (token, age) => `bookflow_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}`;
  function newSession(req, userId) {
    const token = randomBytes(32).toString('hex'), now = Date.now();
    db.run('DELETE FROM sessions WHERE expires_at<=? OR token_hash=?',[now,digest(cookieValue(req))]);
    db.run('INSERT INTO sessions VALUES(?,?,?,?)',[digest(token),userId,now,now + sessionSeconds * 1000]);
    return token;
  }
  function reply(res,status,data) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(data)); }
  return async function auth(req,res,url) {
    if (!url.pathname.startsWith('/api/')) return false;
    try {
      const route = url.pathname;
      if (req.method === 'GET' && route === '/api/auth/me') { const user = session(req); reply(res,200,{user:user ? publicUser(user) : null}); return true; }
      if (req.method !== 'POST') throw fail(405,'Metoda niedozwolona.');
      // Exact host/origin check, no CORS. Required for all state changes, including login.
      const origin = `http${process.env.COOKIE_SECURE === '1' ? 's' : ''}://${req.headers.host}`;
      if (req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site') throw fail(403,'Niedozwolone pochodzenie żądania.');
      const ip = req.socket.remoteAddress;
      rateLimit(`ip:${ip}`,60);
      const data = await readBody(req);
      if (route === '/api/auth/register') {
        const email = identity(data); passwordValid(data.password);
        const name = typeof data.name === 'string' ? data.name.trim() : '';
        if (name.length < 2 || name.length > 60) throw fail(422,'Imię musi mieć od 2 do 60 znaków.');
        rateLimit(`register:${ip}`,10);
        const passwordHash = await hashPassword(data.password);
        if (db.one('SELECT id FROM users WHERE email=?',[email])) throw fail(409,'Nie można utworzyć konta z tym adresem. Spróbuj się zalogować.');
        const user = {id:randomUUID(),email,name,created_at:Date.now()};
        const token = db.transaction(()=>{ db.run('INSERT INTO users VALUES(?,?,?,?,?)',[user.id,email,name,passwordHash,user.created_at]); return newSession(req,user.id); });
        res.setHeader('Set-Cookie',cookie(token,sessionSeconds)); reply(res,201,{user:publicUser(user)});
      } else if (route === '/api/auth/login') {
        const email = identity(data);
        if (typeof data.password !== 'string' || data.password.length > 128) throw fail(401,'Niepoprawny e-mail lub hasło.');
        rateLimit(`login:${digest(email)}`,10);
        const user = db.one('SELECT * FROM users WHERE email=?',[email]);
        const valid = await matches(data.password,user?.password_hash || dummy);
        if (!user || !valid || db.one('SELECT password_hash FROM users WHERE id=?',[user.id])?.password_hash !== user.password_hash) throw fail(401,'Niepoprawny e-mail lub hasło.');
        const token = db.transaction(()=>newSession(req,user.id));
        res.setHeader('Set-Cookie',cookie(token,sessionSeconds)); reply(res,200,{user:publicUser(user)});
      } else if (route === '/api/auth/logout') {
        db.transaction(()=>db.run('DELETE FROM sessions WHERE token_hash=?',[digest(cookieValue(req))]));
        res.setHeader('Set-Cookie',cookie('',0)); reply(res,200,{ok:true});
      } else if (route === '/api/auth/password') {
        const user = session(req); if (!user) throw fail(401,'Sesja wygasła. Zaloguj się ponownie.');
        rateLimit(`password:${user.id}`,5);
        passwordValid(data.newPassword);
        if (typeof data.currentPassword !== 'string' || data.currentPassword.length > 128 || !await matches(data.currentPassword,user.password_hash)) throw fail(401,'Niepoprawne obecne hasło.');
        const next = await hashPassword(data.newPassword);
        // Recheck after asynchronous hashing: another request may have revoked this session.
        if (!session(req) || db.one('SELECT password_hash FROM users WHERE id=?',[user.id]).password_hash !== user.password_hash) throw fail(401,'Sesja zmieniła się. Zaloguj się ponownie.');
        const token = db.transaction(()=>{ db.run('UPDATE users SET password_hash=? WHERE id=?',[next,user.id]); db.run('DELETE FROM sessions WHERE user_id=?',[user.id]); return newSession(req,user.id); });
        res.setHeader('Set-Cookie',cookie(token,sessionSeconds)); reply(res,200,{ok:true});
      } else throw fail(404,'Nie znaleziono endpointu.');
    } catch(error) { if (!error.status) console.error('Błąd API:',error.code || error.name); if (!res.headersSent) reply(res,error.status || 500,{error:error.status ? error.message : 'Błąd serwera. Spróbuj ponownie.'}); }
    return true;
  };
}
