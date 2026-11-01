export const fail = (status, message) => Object.assign(new Error(message), { status });

export function checkOrigin(req) {
  const origin = `http${process.env.COOKIE_SECURE === '1' ? 's' : ''}://${req.headers.host}`;
  if (req.headers.origin !== origin || req.headers['sec-fetch-site'] === 'cross-site') {
    throw fail(403, 'Niedozwolone pochodzenie żądania.');
  }
}

export async function readBody(req, limit = 8192) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw fail(415, 'Wymagany format JSON.');
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) throw fail(413, 'Za duże żądanie.');
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw fail(400, 'Niepoprawne dane JSON.'); }
}

export function reply(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}

export function replyError(res, error) {
  if (!error.status) console.error('Błąd API:', error.code || error.name);
  if (!res.headersSent) reply(res, error.status || 500, { error: error.status ? error.message : 'Błąd serwera. Spróbuj ponownie.' });
}
