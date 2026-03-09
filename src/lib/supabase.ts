// src/lib/supabase.ts
// We only export the browser client from here.
// The server client is imported directly from supabase-server.ts
// when needed — never through this file.
export { createSupabaseBrowserClient } from './supabase-browser'