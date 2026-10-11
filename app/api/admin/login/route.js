import { cookies } from 'next/headers';
import { ADMIN_COOKIE, isValidKey, signAdminSession } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { key } = await req.json().catch(() => ({}));
  if (!isValidKey(key)) {
    return Response.json({ ok: false, error: 'Clave incorrecta' }, { status: 401 });
  }
  cookies().set(ADMIN_COOKIE, signAdminSession(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  });
  return Response.json({ ok: true });
}
