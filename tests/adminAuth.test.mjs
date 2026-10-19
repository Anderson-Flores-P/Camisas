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

test('sesión HMAC: firma determinista y validación', () => {
  process.env.ADMIN_KEY = 'clave-a';
  const t = auth.signAdminSession();
  assert.match(t, /^[0-9a-f]{64}$/);
  assert.equal(t, auth.signAdminSession());
  assert.equal(auth.isValidSession(t), true);
  assert.equal(auth.isValidSession(t.slice(0, -1) + (t.endsWith('0') ? '1' : '0')), false);
  assert.equal(auth.isValidSession(undefined), false);
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
