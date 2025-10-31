/**
 * Supabase Client for Admin Panel
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabase() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Temporary: Use hardcoded values for deployment testing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://avpymookdzjovwxirkpq.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2cHltb29rZHpqb3Z3eGlya3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NTcyNzcsImV4cCI6MjA1MTEzMzI3N30.UzEGafPjMvt6J7QeZoggVjvfDhc-hKrCnT7o_uDJYdA'

  console.log('[Supabase Init] URL:', supabaseUrl)
  console.log('[Supabase Init] Key exists:', !!supabaseAnonKey && supabaseAnonKey.length > 20)

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return supabaseInstance
}

// Backward compatibility
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return (getSupabase() as any)[prop]
  },
})
