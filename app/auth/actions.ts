'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signOut() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/')
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    if (!email) {
        return { error: 'Email is required' }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // For localhost, this will log the link in the terminal
        // In production, update site URL in Supabase dashboard
        redirectTo: 'http://localhost:3000/auth/update-password',
    })

    if (error) {
        console.error('Error sending password reset:', error)
        return { error: error.message }
    }

    return { success: true }
}
