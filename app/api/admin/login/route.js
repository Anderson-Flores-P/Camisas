import { cookies } from 'next/headers';
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE, isValidKey, signAdminSession } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

// Límite mínimo en memoria por IP: 5 fallos cada 15 min (por instancia).
const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000;
const fallos = new Map();

export async function POST(req) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
  const ahora = Date.now();
  if (fallos.size > 5000) for (const [k, v] of fallos) if (v.hasta <= ahora) fallos.delete(k);
  const f = fallos.get(ip);
  if (f && f.hasta > ahora && f.n >= MAX_FALLOS) {
    return Response.json({ ok: false, error: 'Demasiados intentos, espera unos minutos' }, { status: 429, headers: { 'Retry-After': String(Math.ceil((f.hasta - ahora) / 1000)) } });
  }
  const { key } = await req.json().catch(() => ({}));
  if (!isValidKey(key)) {
    if (f && f.hasta > ahora) f.n++; else fallos.set(ip, { n: 1, hasta: ahora + VENTANA_MS });
    return Response.json({ ok: false, error: 'Clave incorrecta' }, { status: 401 });
  }
  fallos.delete(ip);
  cookies().set(ADMIN_COOKIE, signAdminSession(), {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
  return Response.json({ ok: true });
}
