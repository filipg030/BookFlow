import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './backend/database.mjs';
import { createAuth } from './backend/auth.mjs';
import { createBooks } from './backend/books.mjs';
import { reply } from './backend/http.mjs';

const root = path.resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const db = await openDatabase(path.resolve(process.env.BOOKFLOW_DB || fileURLToPath(new URL('./data/bookflow.sqlite', import.meta.url))));
const auth = await createAuth(db);
const books = createBooks(db, auth);
const server = http.createServer(async (req, res) => {
  try {
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) { res.writeHead(403).end(); return; }
    const url = new URL(req.url, 'http://localhost');
    if (await auth(req,res,url)) return;
    if (await books(req,res,url)) return;
    if (url.pathname.startsWith('/api/')) { reply(res,404,{error:'Nie znaleziono endpointu.'}); return; }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(url.pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) {
      res.writeHead(403).end(); return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(404).end('Nie znaleziono strony'); }
});
server.listen(Number(process.env.PORT || 4174), '127.0.0.1', () => console.log(`BookFlow: http://127.0.0.1:${server.address().port}`));
server.on('error', error => { db.close(); console.error(error.message); process.exitCode = 1; });
process.on('exit',()=>db.close());
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
