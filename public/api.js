const backendMessage = 'Ten adres obsługuje stary lub nieprawidłowy serwer BookFlow. Otwórz aktualną aplikację: http://127.0.0.1:4174/.';

function backendError() {
  return Object.assign(new Error(backendMessage), { code: 'BACKEND_UNAVAILABLE' });
}

export async function readApiResponse(response) {
  if (!response.headers.get('content-type')?.includes('application/json')) throw backendError();
  let result;
  try { result = await response.json(); } catch { throw backendError(); }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw backendError();
  if (!response.ok) throw Object.assign(new Error(typeof result.error === 'string' ? result.error : 'Nie udało się wykonać operacji. Spróbuj ponownie.'), { status: response.status });
  return result;
}

export async function booksApi(id = '', method = 'GET', data, fetcher = fetch) {
  const response = await fetcher('/api/books' + (id ? '/' + encodeURIComponent(id) : ''), {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  return readApiResponse(response);
}

export async function api(path, data, fetcher = fetch) {
  // Verify that this origin has the accounts API before sending credentials.
  if (data !== undefined && (path === 'register' || path === 'login')) {
    const check = await readApiResponse(await fetcher('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' }));
    if (!Object.hasOwn(check, 'user')) throw backendError();
  }
  const response = await fetcher('/api/auth/' + path, {
    method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: data === undefined ? {} : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  return readApiResponse(response);
}
