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
  let url = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim().replace(/^['"]|['"]$/g, '') : '';
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim().replace(/^['"]|['"]$/g, '') : '';
  let fallbackKey = process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.trim().replace(/^['"]|['"]$/g, '') : '';
  let key = serviceRoleKey || fallbackKey;

  if (!url || !key || !url.startsWith('http')) {
    if (!hasLoggedConfigStatus) {
      console.log('[Supabase Client] Notice: Valid SUPABASE_URL (starting with http/https) or SUPABASE_SERVICE_ROLE_KEY not configured.');
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
        },
        global: {
          fetch: async (input, init) => {
            let attempt = 0;
            const maxAttempts = 3;
            let delay = 100; // ms
            while (attempt < maxAttempts) {
              try {
                attempt++;
                const response = await fetch(input, init);
                // If it is a transient server error (502 Gateway, 503 Service Unavailable, 504 Gateway Timeout), retry
                if ([502, 503, 504].includes(response.status) && attempt < maxAttempts) {
                  console.warn(`[Supabase DB Connection Retry] Received HTTP ${response.status}. Retrying in ${delay}ms (Attempt ${attempt}/${maxAttempts})...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  delay *= 2;
                  continue;
                }
                return response;
              } catch (err: any) {
                // Retry on transient network/reset/timeout errors
                if (attempt < maxAttempts) {
                  console.warn(`[Supabase Network Retry] Attempt ${attempt}/${maxAttempts} failed: ${err.message || err}. Retrying in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  delay *= 2;
                  continue;
                }
                throw err;
              }
            }
            throw new Error('Supabase request failed after max retry attempts');
          }
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
  const url = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim().replace(/^['"]|['"]$/g, '') : '';
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '').trim().replace(/^['"]|['"]$/g, '');
  return Boolean(url && key && url.startsWith('http'));
}
