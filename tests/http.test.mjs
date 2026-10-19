// Caracterización HTTP contra el build real (`next start`).
// Requiere `npm run build` previo. Usa ADMIN_KEY de prueba (no la real).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3907;
const BASE = `http://127.0.0.1:${PORT}`;
const KEY = 'test-key-parche';
let srv;

before(async () => {
  srv = spawn(path.join(ROOT, 'node_modules/.bin/next'), ['start', '-p', String(PORT), '-H', '127.0.0.1'], {
    cwd: ROOT, env: { ...process.env, ADMIN_KEY: KEY, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(BASE + '/api/admin/session'); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('next start no levantó');
});
after(() => srv?.kill());

const post = (p, body, headers = {}) => fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });

test('páginas públicas responden 200', async () => {
  for (const p of ['/', '/admin', '/icon.svg']) {
    const r = await fetch(BASE + p);
    assert.equal(r.status, 200, p);
  }
  const html = await (await fetch(BASE + '/')).text();
  const m = html.match(/href="\/producto\/([^"]+)"/);
  assert.ok(m, 'home enlaza productos');
  const r = await fetch(BASE + '/producto/' + m[1]);
  assert.equal(r.status, 200);
});

test('login: clave incorrecta 401, correcta 200 + cookie httpOnly', async () => {
  let r = await post('/api/admin/login', { key: 'mala' }, { 'x-forwarded-for': '10.0.0.1' });
  assert.equal(r.status, 401);
  assert.deepEqual(await r.json(), { ok: false, error: 'Clave incorrecta' });
  r = await post('/api/admin/login', { key: KEY }, { 'x-forwarded-for': '10.0.0.2' });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  const sc = r.headers.get('set-cookie') || '';
  assert.match(sc, /taller_admin=\d+\.[0-9a-f]{64}/);
  assert.match(sc, /Max-Age=604800/i);
  assert.match(sc, /HttpOnly/i);
  assert.match(sc, /SameSite=strict/i);
  const cookie = sc.split(';')[0];
  let s = await (await fetch(BASE + '/api/admin/session', { headers: { cookie } })).json();
  assert.equal(s.ok, true);
  s = await (await fetch(BASE + '/api/admin/session')).json();
  assert.equal(s.ok, false);
  s = await (await fetch(BASE + '/api/admin/session', { headers: { cookie: 'taller_admin=deadbeef' } })).json();
  assert.equal(s.ok, false);
  r = await fetch(BASE + '/api/admin/logout', { method: 'POST', headers: { cookie } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('set-cookie') || '', /taller_admin=;/);
});

test('login: body inválido -> 401', async () => {
  const r = await fetch(BASE + '/api/admin/login', { method: 'POST', body: 'no-json', headers: { 'x-forwarded-for': '10.0.0.3' } });
  assert.equal(r.status, 401);
});

test('login: intentos fallidos repetidos desde una IP', async () => {
  const ip = '10.9.9.9';
  const codes = [];
  for (let i = 0; i < 12; i++) codes.push((await post('/api/admin/login', { key: 'x' + i }, { 'x-forwarded-for': ip })).status);
  if (process.env.EXPECT_RATE_LIMIT) {
    assert.ok(codes.includes(429), 'debe limitar: ' + codes);
    // otra IP no queda bloqueada y la clave correcta sigue entrando
    const ok = await post('/api/admin/login', { key: KEY }, { 'x-forwarded-for': '10.9.9.10' });
    assert.equal(ok.status, 200);
  } else {
    assert.ok(codes.every((c) => c === 401), 'sin límite hoy: ' + codes);
  }
});

test('optimizador de imágenes: foto real de supabase se sirve', async () => {
  const html = await (await fetch(BASE + '/')).text();
  const m = html.match(/\/_next\/image\?url=([^&"]+)&amp;w=(\d+)&amp;q=(\d+)/);
  if (!m) return test.skip?.('sin fotos en catálogo');
  const url = `${BASE}/_next/image?url=${m[1]}&w=${m[2]}&q=${m[3]}`;
  const r = await fetch(url, { headers: { accept: 'image/avif,image/webp,*/*' } });
  assert.equal(r.status, 200);
  const ct = r.headers.get('content-type');
  console.log('# content-type con accept avif:', ct);
  assert.ok(/image\/(avif|webp)/.test(ct));
  if (process.env.EXPECT_NO_AVIF) assert.equal(ct, 'image/webp');
});

test('optimizador de imágenes: host supabase ajeno', async () => {
  const u = encodeURIComponent('https://otro-proyecto-xyz.supabase.co/storage/v1/object/public/fotos/a.jpg');
  const r = await fetch(`${BASE}/_next/image?url=${u}&w=640&q=75`);
  console.log('# status host ajeno:', r.status);
  if (process.env.EXPECT_STRICT_HOST) assert.equal(r.status, 400);
  else assert.notEqual(r.status, 400);
});
