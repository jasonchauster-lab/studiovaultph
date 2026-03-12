import { createBrowserClient } from '@supabase/ssr'

// Singleton instance — avoids creating a new Supabase client on every call,
// which would otherwise spin up redundant realtime connections and re-trigger
// useEffect dependencies that list the client as a dep.
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!clientInstance) {
    clientInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return clientInstance
}
