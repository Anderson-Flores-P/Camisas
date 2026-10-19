// Caracterización de scripts/recomprimir.mjs contra un Supabase falso local.
// Requiere `sharp` instalado (el script lo importa; no está en package.json):
//   npm i --no-save sharp
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = path.join(ROOT, 'scripts/recomprimir.mjs');
let sharpUrl = null;
try { sharpUrl = pathToFileURL(createRequire(path.join(ROOT, 'package.json')).resolve('sharp')).href; await import(sharpUrl); } catch { sharpUrl = null; }
const hasSharp = Boolean(sharpUrl);

function listen(handler) {
  return new Promise((res) => { const s = http.createServer(handler); s.listen(0, '127.0.0.1', () => res(s)); });
}

test('recomprimir: procesa fotos del storage propio y registra a qué hosts llama', { skip: !hasSharp && 'sharp no instalado' }, async () => {
  const sharp = (await import(sharpUrl)).default;
  const png = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#336699' } }).png().toBuffer();
  const externalHits = [];
  const ext = await listen((req, res) => { externalHits.push(req.method + ' ' + req.url); res.writeHead(200, { 'content-type': 'image/png' }); res.end(req.method === 'HEAD' ? undefined : png); });
  const extBase = `http://127.0.0.1:${ext.address().port}`;
  const calls = [];
  let sbBase;
  const sb = await listen((req, res) => {
    calls.push(req.method + ' ' + req.url.split('?')[0]);
    let body = []; req.on('data', (c) => body.push(c)); req.on('end', () => {
      if (req.url.startsWith('/rest/v1/productos') && req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify([{ id: 'p1', nombre: 'Camisa prueba', fotos: [
          `${sbBase}/storage/v1/object/public/fotos/grande.png`,
          `${extBase}/interno/metadata.png`,
        ] }]));
      }
      if (req.url.startsWith('/storage/v1/object/public/fotos/')) {
        // sin content-length en HEAD => el script la trata como pesada y la procesa
        res.writeHead(200, { 'content-type': 'image/png' });
        return res.end(req.method === 'HEAD' ? undefined : png);
      }
      if (req.url.startsWith('/storage/v1/object/fotos/') && req.method === 'POST') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ Key: 'fotos/x.jpg', Id: '1' }));
      }
      if (req.url.startsWith('/rest/v1/productos') && req.method === 'PATCH') { res.writeHead(204); return res.end(); }
      res.writeHead(404); res.end();
    });
  });
  sbBase = `http://127.0.0.1:${sb.address().port}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'recomp-'));
  fs.writeFileSync(path.join(dir, '.env.local'), `NEXT_PUBLIC_SUPABASE_URL=${sbBase}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon\n`);
  const out = await new Promise((res) => {
    const p = spawn(process.execPath, [...(typeof WebSocket === 'undefined' ? ['--experimental-websocket'] : []), SCRIPT], { cwd: dir, env: { ...process.env, NODE_PATH: path.join(ROOT, 'node_modules') } });
    let o = ''; p.stdout.on('data', (d) => (o += d)); p.stderr.on('data', (d) => (o += d)); p.on('close', (code) => res({ code, o }));
  });
  sb.close(); ext.close();
  assert.equal(out.code, 0, out.o);
  assert.match(out.o, /productos: 1/);
  assert.match(out.o, /listo/);
  // foto propia: se recomprime, sube y actualiza
  assert.ok(calls.some((c) => c.startsWith('POST /storage/v1/object/fotos/recomp-')), calls.join('\n'));
  assert.ok(calls.some((c) => c.startsWith('PATCH /rest/v1/productos')));
  console.log('# hits host externo:', JSON.stringify(externalHits));
  if (process.env.EXPECT_URL_CHECK) assert.deepEqual(externalHits, [], 'no debe pedir URLs fuera del storage de supabase');
  else assert.ok(externalHits.length > 0, 'hoy pide cualquier URL');
});
