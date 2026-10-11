import { cookies } from 'next/headers';
import { ADMIN_COOKIE } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST() {
  cookies().delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}
