import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'

/**
 * Standard Supabase client for Server Components and Server Actions.
 * Wrapped in React cache to de-duplicate across a single request.
 */
export const createClient = cache(async () => {
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
                    }
                },
            },
        }
    )
})

/** 
 * Service-role client — bypasses RLS. Use ONLY in trusted server-side admin code. 
 * Wrapped in React cache to prevent redundant client creation.
 */
export const createAdminClient = cache(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.DASHBOARD_MASTER_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url) {
        throw new Error('MISSING_ENV: NEXT_PUBLIC_SUPABASE_URL is not defined.')
    }

    if (!key) {
        throw new Error('MISSING_ENV: DASHBOARD_MASTER_KEY is not defined.')
    }

    return createSupabaseClient(url, key)
})
