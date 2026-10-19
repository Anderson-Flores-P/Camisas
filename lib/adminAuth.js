import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'taller_admin';

// Clave solo-servidor. Se acepta la vieja NEXT_PUBLIC_ADMIN_KEY como
// transición para no romper tu .env.local actual.
export function getAdminKey() {
  return process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY || '';
}

export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7; // segundos (igual que la cookie)

// Firma la sesión con HMAC: la cookie no se puede falsificar sin la clave.
// Formato "<exp>.<hmac>": el vencimiento va firmado y se valida en el servidor.
export function signAdminSession(exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE) {
  const k = getAdminKey();
  if (!k) return '';
  return `${exp}.${createHmac('sha256', k).update(`taller-admin-v1:${exp}`).digest('hex')}`;
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function isValidKey(key) {
  const expected = getAdminKey();
  if (!expected) return process.env.NODE_ENV !== 'production'; // sin clave: acceso directo solo en local; en producción se cierra
  return safeEqual(key, expected);
}

export function isValidSession(token) {
  if (!getAdminKey()) return process.env.NODE_ENV !== 'production';
  const exp = Number(String(token || '').split('.')[0]);
  if (!Number.isInteger(exp) || exp <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(token, signAdminSession(exp));
}
