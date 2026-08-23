// Compatibility boundary retained for existing repository imports.
// Persistence is now Supabase Postgres; MongoDB is no longer selected.
import { getSupabaseDb } from '@/lib/supabaseDb';

export async function getDb() {
  return getSupabaseDb();
}
