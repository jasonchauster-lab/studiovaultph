'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function selectRole(role: 'customer' | 'instructor' | 'studio') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Update profile role
    const { error } = await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', user.id)

    if (error) {
        console.error('Role update failed:', error)
        return { error: 'Failed' }
    }

    if (role === 'customer') redirect('/customer')
    if (role === 'instructor') redirect('/instructor/onboarding')
    if (role === 'studio') redirect('/studio') // or studio onboarding
}
