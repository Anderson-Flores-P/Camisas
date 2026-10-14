import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

let cached = null;
export function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (!cached) cached = createClient(url, anon, { auth: { persistSession: false } });
  return cached;
}
