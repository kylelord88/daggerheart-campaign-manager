import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars')
}

// The anon key is meant to be public — it ships in the built JS bundle.
// Row Level Security on every table is the real access boundary, not key secrecy.
export const supabase = createClient<Database>(url, anonKey)
