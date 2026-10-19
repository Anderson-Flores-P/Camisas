// Pruebas de caracterización de lib/adminAuth.js (sin red).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as auth from '../lib/adminAuth.js';

// Hallazgo 5: antes fallaba abierto (true); ahora en producción sin clave se niega.
const PROD_NO_KEY_EXPECTED = false;
const ORIG = { ...process.env };
beforeEach(() => {
  delete process.env.ADMIN_KEY;
  delete process.env.NEXT_PUBLIC_ADMIN_KEY;
  process.env.NODE_ENV = ORIG.NODE_ENV ?? 'test';
});

test('cookie name estable', () => {
  assert.equal(auth.ADMIN_COOKIE, 'taller_admin');
});

test('ADMIN_KEY tiene prioridad y la clave correcta valida', () => {
  process.env.ADMIN_KEY = 'clave-a';
  process.env.NEXT_PUBLIC_ADMIN_KEY = 'clave-b';
  assert.equal(auth.getAdminKey(), 'clave-a');
  assert.equal(auth.isValidKey('clave-a'), true);
  assert.equal(auth.isValidKey('clave-b'), false);
  assert.equal(auth.isValidKey(''), false);
  assert.equal(auth.isValidKey(undefined), false);
  assert.equal(auth.isValidKey('clave-a '), false);
});

test('fallback NEXT_PUBLIC_ADMIN_KEY sigue funcionando (transición)', () => {
  process.env.NEXT_PUBLIC_ADMIN_KEY = 'vieja';
  assert.equal(auth.getAdminKey(), 'vieja');
  assert.equal(auth.isValidKey('vieja'), true);
});

test('sesión HMAC: token con vencimiento firmado', () => {
  process.env.ADMIN_KEY = 'clave-a';
  const t = auth.signAdminSession();
  assert.match(t, /^\d+\.[0-9a-f]{64}$/);
  const exp = Number(t.split('.')[0]);
  const ahora = Math.floor(Date.now() / 1000);
  assert.ok(Math.abs(exp - (ahora + auth.ADMIN_SESSION_MAX_AGE)) <= 2, 'exp = ahora + maxAge');
  assert.equal(auth.isValidSession(t), true);
  assert.equal(auth.isValidSession(t.slice(0, -1) + (t.endsWith('0') ? '1' : '0')), false, 'hmac alterado');
  assert.equal(auth.isValidSession(`${exp + 999999}.${t.split('.')[1]}`), false, 'exp alterado');
  assert.equal(auth.isValidSession(auth.signAdminSession(ahora - 1)), false, 'vencido');
  assert.equal(auth.isValidSession(auth.signAdminSession(ahora + 60)), true);
  assert.equal(auth.isValidSession(undefined), false);
  assert.equal(auth.isValidSession('basura'), false);
  assert.equal(auth.isValidSession('a'.repeat(64)), false, 'formato viejo sin exp');
  process.env.ADMIN_KEY = 'otra';
  assert.equal(auth.isValidSession(t), false, 'cambiar la clave invalida sesiones viejas');
});

test('sin clave en desarrollo: acceso directo (comportamiento local documentado)', () => {
  process.env.NODE_ENV = 'development';
  assert.equal(auth.signAdminSession(), '');
  assert.equal(auth.isValidKey('lo-que-sea'), true);
  assert.equal(auth.isValidSession(undefined), true);
});

test('sin clave en producción', () => {
  process.env.NODE_ENV = 'production';
  assert.equal(auth.isValidKey('lo-que-sea'), PROD_NO_KEY_EXPECTED);
  assert.equal(auth.isValidSession(undefined), PROD_NO_KEY_EXPECTED);
});
