'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function selectRole(role: 'customer' | 'instructor' | 'studio') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Check if profile exists (required for OAuth users whose profile creation
    // may have failed or been skipped in the auth callback).
    const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

    let error: unknown = null

    if (existingProfile) {
        // Profile exists — update the role field only
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', user.id)
        error = updateError
    } else {
        // Profile doesn't exist yet (edge case for OAuth users) — create it now
        const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] || 'User'

        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                id: user.id,
                email: user.email,
                full_name: fullName,
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                role,
            })
        error = insertError
    }

    if (error) {
        console.error('Role selection failed:', error)
        return { error: 'Failed to set role. Please try again.' }
    }

    if (role === 'customer') redirect('/customer/onboarding')
    if (role === 'instructor') redirect('/instructor/onboarding')
    if (role === 'studio') redirect('/studio')
}
