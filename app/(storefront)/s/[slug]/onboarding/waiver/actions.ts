'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sanitizeHtml } from '@/lib/utils/security'

interface SignWaiverParams {
    studioId: string
    signatureData: string // This will be the base64 PNG data from the canvas
    waiverTitle: string
    waiverContent: string
}

export async function signWaiverAction({
    studioId,
    signatureData,
    waiverTitle,
    waiverContent
}: SignWaiverParams) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'You must be logged in to sign the waiver.' }
    }

    try {
        const sanitizedContent = sanitizeHtml(waiverContent)

        // 1. Insert the waiver consent record with snapshots and signature
        const { error: consentError } = await supabase
            .from('waiver_consents')
            .insert({
                user_id: user.id,
                studio_id: studioId,
                waiver_agreed: true,
                terms_agreed: true,
                signature_svg: signatureData,
                waiver_title_snapshot: waiverTitle,
                waiver_content_snapshot: sanitizedContent,
                waiver_version: new Date().toISOString().split('T')[0],
                agreed_at: new Date().toISOString(),
                parq_answers: {
                    dizziness: false,
                    bone_joint: false,
                    medical_advice: false,
                    chest_pain_rest: false,
                    heart_condition: false,
                    chest_pain_activity: false,
                    pregnant_postpartum: false
                }
            })

        if (consentError) {
            console.error('Waiver consent insertion error:', consentError)
            return { error: 'Failed to record waiver consent: ' + consentError.message }
        }

        // 2. Update the profile timestamp for the general 'waiver_signed_at'
        // This acts as a global flag that the user has signed "at least one" waiver, 
        // though studio-specific logic will now rely on the waiver_consents table.
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                waiver_signed_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (profileError) {
            console.error('Profile waiver update error:', profileError)
            // We don't return error here because the consent record was already saved
        }

        revalidatePath('/(storefront)/s/[slug]/dashboard', 'layout')
        
        return { success: true }
    } catch (err: any) {
        console.error('Sign waiver exception:', err)
        return { error: 'An unexpected error occurred while signing.' }
    }
}
