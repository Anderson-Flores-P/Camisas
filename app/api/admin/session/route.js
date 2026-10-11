import { cookies } from 'next/headers';
import { ADMIN_COOKIE, isValidSession } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  return Response.json({ ok: isValidSession(token) });
}
