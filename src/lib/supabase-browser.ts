// src/lib/supabase-browser.ts
// ─────────────────────────────────────────────────────────
// This file is ONLY for browser (client) components.
// Files with 'use client' at the top will import from here.
// ─────────────────────────────────────────────────────────
import { createBrowserClient } from '@supabase/ssr'

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}