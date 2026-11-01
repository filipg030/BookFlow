import test from 'node:test';
import assert from 'node:assert/strict';
import { api, booksApi, readApiResponse } from '../public/api.js';

test('Stary serwer 404 tekst: czytelny błąd, bez wysłania hasła', async()=>{
  const calls=[];
  await assert.rejects(api('register',{password:'not-sent'},async(url,options)=>{
    calls.push({url,options}); return new Response('Nie znaleziono strony',{status:404});
  }), {code:'BACKEND_UNAVAILABLE'});
  assert.equal(calls.length,1);
  assert.equal(calls[0].url,'/api/auth/me');
  assert.equal(calls[0].options.body,undefined);
});
test('Uszkodzony JSON i HTML nie ujawniają komunikatów parsera',async()=>{
  for(const body of ['Nie znaleziono strony','<html>Error</html>','null','[]']) {
    await assert.rejects(readApiResponse(new Response(body,{headers:{'Content-Type':'application/json'}})),{code:'BACKEND_UNAVAILABLE'});
  }
});
test('Poprawne API rejestruje, a błędy walidacji są zachowane',async()=>{
  const calls=[];
  const result=await api('register',{name:'Ala'},async(url,options)=>{
    calls.push(options);
    return Response.json(url.endsWith('/me') ? {user:null} : {user:{name:'Ala'}},{status:url.endsWith('/me')?200:201});
  });
  assert.equal(result.user.name,'Ala'); assert.equal(calls[1].method,'POST');
  await assert.rejects(readApiResponse(Response.json({error:'Adres jest zajęty'},{status:409})),/Adres jest zajęty/);
});

test('Klient katalogu wysyła zmiany do API i zachowuje kod konfliktu', async () => {
  const calls = [];
  const fetcher = async (url, options) => { calls.push({ url, ...options }); return Response.json({ book: { id: '123' } }); };
  await booksApi('', 'POST', { title: 'Tytuł' }, fetcher);
  await booksApi('123', 'PATCH', { title: 'Zmiana', version: 1 }, fetcher);
  await booksApi('123', 'DELETE', { version: 2 }, fetcher);
  assert.deepEqual(calls.map(c => [c.url, c.method]), [['/api/books', 'POST'], ['/api/books/123', 'PATCH'], ['/api/books/123', 'DELETE']]);
  assert.equal(JSON.parse(calls[1].body).version, 1);
  assert.ok(calls.every(c => c.credentials === 'same-origin' && c.cache === 'no-store'));
  await assert.rejects(booksApi('123', 'PATCH', {}, async () => Response.json({ error: 'Konflikt wersji' }, { status: 409 })), { status: 409, message: 'Konflikt wersji' });
});
