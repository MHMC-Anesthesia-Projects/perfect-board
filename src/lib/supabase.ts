import { createClient, SupabaseClient } from '@supabase/supabase-js';

// The dedicated schema for Whiteboard tables in PostgreSQL
export const WHITEBOARD_SCHEMA = 'whiteboard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && (supabaseAnonKey || supabaseServiceKey)
);

let serverClient: SupabaseClient<any, any, any> | null = null;

/**
 * Returns a server-side Supabase client targeting the 'whiteboard' schema.
 * Uses service role key if available, otherwise falls back to anon key.
 */
export function getSupabaseServerClient(): SupabaseClient<any, any, any> | null {
  if (!isSupabaseConfigured) return null;

  if (!serverClient) {
    const key = supabaseServiceKey || supabaseAnonKey;
    serverClient = createClient(supabaseUrl, key, {
      db: {
        schema: WHITEBOARD_SCHEMA,
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClient;
}

let browserClient: SupabaseClient<any, any, any> | null = null;

/**
 * Returns a client-side Supabase client for browser components (e.g. Realtime WebSockets).
 */
export function getBrowserSupabase(): SupabaseClient<any, any, any> | null {
  if (typeof window === 'undefined') return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  if (!browserClient) {
    browserClient = createClient(url, key, {
      db: {
        schema: WHITEBOARD_SCHEMA,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return browserClient;
}
