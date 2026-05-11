'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { revalidatePath } from 'next/cache'

export async function signOut() {
    try {
        const supabase = await createClient()
        await supabase.auth.signOut()
        
        // Clear all cached data across the platform
        revalidatePath('/', 'layout')
    } catch (err) {
        console.error('[Auth] Logout error:', err)
    }
    
    // Redirect must be called outside try/catch in some Next.js versions, 
    // or properly re-thrown. Here we call it after the try/catch.
    redirect('/')
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    if (!email) {
        return { error: 'Email is required' }
    }

    const host = (await headers()).get('host')
    const protocol = host?.includes('localhost') ? 'http' : 'https'
    const siteUrl = `${protocol}://${host}`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
    })

    if (error) {
        console.error('Error sending password reset:', error)
        return { error: error.message }
    }

    return { success: true }
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string

    if (!password) {
        return { error: 'Password is required' }
    }

    const { error } = await supabase.auth.updateUser({
        password: password
    })

    if (error) {
        console.error('Error updating password:', error)
        return { error: error.message }
    }

    return { success: true }
}
