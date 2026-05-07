import { createAdminClient } from '@/lib/supabase/server'

/**
 * Checks if an action exceeds the rate limit.
 * @param key Unique key for the limit (e.g. `payout:${studioId}`)
 * @param limit Max hits allowed in the window
 * @param windowSeconds Duration of the window in seconds
 * @returns boolean true if allowed, false if rate limited
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const supabase = createAdminClient()
    
    try {
        const { data, error } = await supabase.rpc('check_rate_limit', {
            p_key: key,
            p_limit: limit,
            p_window_seconds: windowSeconds
        })

        if (error) {
            console.error('[RateLimit] RPC Error:', error)
            return true // Fail open to not block users on DB issues
        }

        return !!data
    } catch (err) {
        console.error('[RateLimit] Exception:', err)
        return true
    }
}
