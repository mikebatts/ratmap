import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase clients for ratmap.nyc.
//
// Two flavors:
//   - getServerClient(): anon key, read-only, used by API routes.
//   - getServiceClient(): service-role key, used ONLY by ingest scripts.
//
// Both are defensive: if env vars are missing (e.g. during a build with
// placeholder config), they return null instead of throwing. Callers must
// handle null and fall back to empty results so the build never breaks.

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

let serverClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

/** True when the public (read) client can be constructed. */
export function hasSupabaseConfig(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Read-only client for API routes. Returns null when unconfigured. */
export function getServerClient(): SupabaseClient | null {
  if (!hasSupabaseConfig()) return null;
  if (!serverClient) {
    serverClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return serverClient;
}

/** Write client for ingest scripts. Returns null when unconfigured. */
export function getServiceClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!serviceClient) {
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return serviceClient;
}
