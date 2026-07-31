/**
 * Supabase client – single source of truth for all DB/Realtime calls.
 *
 * SECURITY NOTE
 * ─────────────
 * Only the ANON key belongs in the frontend. It is intentionally public:
 * Supabase's Row Level Security (RLS) policies enforce what each role can
 * read or write server-side. The SERVICE ROLE key is a full-bypass secret
 * and must never appear here or in any client-side code.
 *
 * Required env variables (copy .env.example → .env):
 *   VITE_SUPABASE_URL      – e.g. https://xyzxyz.supabase.co
 *   VITE_SUPABASE_ANON_KEY – public anon key from Project Settings → API
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// ── Environment validation ─────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const missing: string[] = []
if (!supabaseUrl)      missing.push('VITE_SUPABASE_URL')
if (!supabaseAnonKey)  missing.push('VITE_SUPABASE_ANON_KEY')

/**
 * `true` when both env variables are present.
 * Use this flag in the UI to show a configuration banner instead of failing
 * silently with empty data.
 */
export const isSupabaseConfigured = missing.length === 0

if (!isSupabaseConfigured) {
  const msg =
    `[Supabase] Missing environment variable(s): ${missing.join(', ')}.\n` +
    'Copy .env.example to .env and fill in your Supabase project credentials.\n' +
    'The app will render but all database calls will fail until this is fixed.'

  // In development, break loudly so the issue is immediately visible.
  if (import.meta.env.DEV) {
    console.error(msg)
  } else {
    console.warn(msg)
  }
}

// ── Client ────────────────────────────────────────────────────────────────

export const supabase = createClient<Database>(
  supabaseUrl  ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key'
)
