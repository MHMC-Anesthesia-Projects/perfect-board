import { createClient, SupabaseClient } from '@supabase/supabase-js';

// The dedicated schema for Whiteboard tables in PostgreSQL
export const WHITEBOARD_SCHEMA = 'whiteboard';

// Default Perfect Call Supabase Project Credentials
export const DEFAULT_SUPABASE_URL = 'https://bxdrwumlkyltiygohjia.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZHJ3dW1sa3lsdGl5Z29oamlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3ODMzNzYsImV4cCI6MjA5NDM1OTM3Nn0.9MdarGEVB6h8PrvbnVhkS7SC__QKbRBq44aGYAJAZ-k';
export const DEFAULT_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4ZHJ3dW1sa3lsdGl5Z29oamlhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc4MzM3NiwiZXhwIjoyMDk0MzU5Mzc2fQ.9LzaeLlXhQs1BzRYTDfRs_Kx3s7k88_TBO5rp77JFsY';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_SERVICE_KEY;

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

let publicServerClient: SupabaseClient<any, any, any> | null = null;

/**
 * Returns a server-side Supabase client targeting the 'public' schema
 * (where Perfect Call tables live: profiles, board_chats, board_messages, chat_read_receipts).
 */
export function getPublicSupabaseServerClient(customUrl?: string, customKey?: string): SupabaseClient<any, any, any> | null {
  const url = customUrl || supabaseUrl;
  const key = customKey || supabaseServiceKey || supabaseAnonKey;
  if (!url || !key) return null;

  if (!publicServerClient || customUrl || customKey) {
    const client = createClient(url, key, {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    if (!customUrl && !customKey) publicServerClient = client;
    return client;
  }

  return publicServerClient;
}

let publicBrowserClient: SupabaseClient<any, any, any> | null = null;

/**
 * Returns a client-side Supabase client targeting the 'public' schema
 * for Realtime subscriptions on board_messages.
 */
export function getPublicBrowserSupabase(customUrl?: string, customKey?: string): SupabaseClient<any, any, any> | null {
  if (typeof window === 'undefined') return null;

  const url = customUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
  const key = customKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;

  if (!url || !key) return null;

  if (!publicBrowserClient || customUrl || customKey) {
    const client = createClient(url, key, {
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    if (!customUrl && !customKey) publicBrowserClient = client;
    return client;
  }

  return publicBrowserClient;
}

