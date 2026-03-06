import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url) throw new Error('MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL is not defined.')
    if (!key) throw new Error('MISSING_ENV: NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined.')

    const cookieStore = await cookies()

    return createServerClient(
        url,
        key,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}

/** Service-role client — bypasses RLS. Use ONLY in trusted server-side admin code. */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url) {
        const envKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ')
        throw new Error(`MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL is not defined. Found these keys: [${envKeys || 'None'}]`)
    }

    if (!key) {
        const envKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', ')
        throw new Error(`MISSING_ENV: SUPABASE_SERVICE_ROLE_KEY is not defined. Please add this to your Environment Variables. Found these keys: [${envKeys || 'None'}]`)
    }

    return createSupabaseClient(url, key)
}
