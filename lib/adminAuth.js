import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'taller_admin';

// Clave solo-servidor. Se acepta la vieja NEXT_PUBLIC_ADMIN_KEY como
// transición para no romper tu .env.local actual.
export function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY || '';
}

// Firma la sesión con HMAC: la cookie no se puede falsificar sin la clave.
export function signAdminSession() {
  const k = getAdminKey();
  if (!k) return '';
  return createHmac('sha256', k).update('taller-admin-v1').digest('hex');
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function isValidKey(key) {
  const expected = getAdminKey();
  if (!expected) return true; // sin clave configurada: acceso local directo (como antes)
  return safeEqual(key, expected);
}

export function isValidSession(token) {
  const expected = signAdminSession();
  if (!expected) return true;
  return safeEqual(token, expected);
}
