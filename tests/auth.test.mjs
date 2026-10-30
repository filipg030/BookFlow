import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { openDatabase } from '../backend/database.mjs';
import { createAuth } from '../backend/auth.mjs';

test('Konta: walidacja, sesje, CSRF, restart, zmiana hasła i wylogowanie', async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'bookflow-auth-'));
  const file=path.join(dir,'test.sqlite');
  let db=await openDatabase(file);
  let handler=await createAuth(db);
  const server=http.createServer((req,res)=>handler(req,res,new URL(req.url,'http://localhost')));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const call=async(route,data,cookie='',origin=base)=>{
    const r=await fetch(base+'/api/auth/'+route,{method:data===undefined?'GET':'POST',headers:{origin,'Content-Type':'application/json',cookie},body:data===undefined?undefined:JSON.stringify(data)});
    return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0],rawCookie:r.headers.get('set-cookie')};
  };
  try {
    assert.equal((await call('me')).body.user,null);
    assert.equal((await call('register',{name:'Ala',email:'ala@example.com',password:'short'})).status,422);
    const input={name:'Ala Testowa',email:'ALA@example.com',password:'Testowe-haslo-12345'};
    assert.equal((await call('register',input,'','https://evil.example')).status,403);
    const registered=await call('register',input);
    assert.equal(registered.status,201); assert.equal(registered.body.user.email,'ala@example.com');
    assert.match(registered.rawCookie,/HttpOnly/); assert.match(registered.rawCookie,/SameSite=Lax/);
    const id=registered.body.user.id;
    assert.ok(!JSON.stringify(registered.body).includes('password'));
    const row=db.one('SELECT * FROM users WHERE id=?',[id]);
    assert.notEqual(row.password_hash,input.password); assert.match(row.password_hash,/^scrypt-v1\$/);
    assert.equal((await call('register',input)).status,409);
    assert.equal((await call('login',{email:input.email,password:'incorrect'})).status,401);
    assert.equal((await call('me',undefined,registered.cookie)).body.user.id,id);
    db.close(); db=await openDatabase(file); handler=await createAuth(db);
    assert.equal((await call('me',undefined,registered.cookie)).body.user.id,id);
    const logged=await call('login',input); assert.equal(logged.status,200);
    const changed=await call('password',{currentPassword:input.password,newPassword:'Zmienione-haslo-12345'},logged.cookie);
    assert.equal(changed.status,200);
    assert.equal((await call('me',undefined,registered.cookie)).body.user,null);
    assert.equal((await call('me',undefined,logged.cookie)).body.user,null);
    assert.equal((await call('me',undefined,changed.cookie)).body.user.id,id);
    assert.equal((await call('login',input)).status,401);
    assert.equal((await call('logout',{},changed.cookie)).status,200);
    assert.equal((await call('me',undefined,changed.cookie)).body.user,null);
    assert.equal((await call('password',{currentPassword:'x',newPassword:'Testowe-haslo-12345'})).status,401);
    const relogged=await call('login',{email:input.email,password:'Zmienione-haslo-12345'});
    assert.equal(relogged.status,200);
    db.transaction(()=>db.run('UPDATE sessions SET expires_at=0'));
    assert.equal((await call('me',undefined,relogged.cookie)).body.user,null);
    for(let i=0;i<10;i++) await call('login',{email:'limit@example.com',password:'bad'});
    assert.equal((await call('login',{email:'limit@example.com',password:'bad'})).status,429);
  } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); db.close(); await rm(dir,{recursive:true,force:true}); }
});
