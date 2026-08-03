import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER ONLY. Bypasses RLS, so it must never be
 * imported into client code and every caller must enforce its own authorization
 * (platform-admin or org owner/admin) before using it.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment (never NEXT_PUBLIC_*).
 * Returns null when the key is absent so callers can surface a friendly message
 * instead of crashing.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
