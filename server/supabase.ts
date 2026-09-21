import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let hasLoggedConfigStatus = false;

/**
 * Creates, caches, and returns the authoritative server-side Supabase client.
 * Uses SUPABASE_SERVICE_ROLE_KEY exclusively on the server side for administrative PostgreSQL access.
 *
 * CRITICAL SECURITY CONSTRAINTS:
 * 1. SUPABASE_SERVICE_ROLE_KEY is NEVER sent to or imported by browser/React components.
 * 2. Never use VITE_SUPABASE_SERVICE_ROLE_KEY (no VITE_ prefix).
 * 3. Never hardcode keys in code.
 * 4. Never commit keys to GitHub.
 * 5. Service Role Key is used solely by server-side APIs.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fallbackKey = process.env.SUPABASE_ANON_KEY;
  const key = serviceRoleKey || fallbackKey;

  if (!url || !key) {
    if (!hasLoggedConfigStatus) {
      console.log('[Supabase Client] Notice: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.');
      hasLoggedConfigStatus = true;
    }
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      if (!hasLoggedConfigStatus) {
        const keyType = serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY (Server Admin)' : 'SUPABASE_ANON_KEY';
        console.log(`[Supabase Client] Initialized server client with ${keyType} at ${url}`);
        hasLoggedConfigStatus = true;
      }
    } catch (err) {
      console.error('[Supabase Client] Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseClient;
}

export function getSupabaseClient(): SupabaseClient | null {
  return getSupabase();
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key);
}
