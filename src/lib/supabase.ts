import { createClient } from "@supabase/supabase-js";

function getUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

/**
 * Server-side Supabase client with service role key.
 * Use this in route handlers and server-side code.
 * Bypasses RLS policies.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(getUrl(), key, {
    auth: { persistSession: false },
  });
}

/**
 * Public Supabase client with anon key.
 * Use this for operations that should respect RLS.
 */
export function createAnonClient() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createClient(getUrl(), key, {
    auth: { persistSession: false },
  });
}
