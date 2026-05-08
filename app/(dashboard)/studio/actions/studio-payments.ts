'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { uploadContentType } from '@/lib/utils/image-utils'

import { ServerActionResponse } from './types'

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB Hard Limit

/**
 * Hardened Payment Settings Action (Phase 15 Final)
 * 
 * Security: 
 * 1. Handles 'Masked Keys'.
 * 2. Enforces MAX_FILE_SIZE (2MB) on uploads to prevent DoS/Storage abuse.
 * 3. Atomic payload verification.
 */
export async function updateStudioPaymentSettings(formData: FormData): Promise<ServerActionResponse> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const { isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner) return { success: false, error: 'Unauthorized' }

    const adminSupabase = createAdminClient()
    const timestamp = Date.now()

    const manualMethodsJson = formData.get('manualPaymentMethods') as string
    let manualMethods: Array<Record<string, any>> = []

    if (manualMethodsJson) {
        try {
            const parsedMethods = JSON.parse(manualMethodsJson)
            if (Array.isArray(parsedMethods)) {
                manualMethods = parsedMethods.map((method) => ({ ...method }))
                for (const method of manualMethods) {
                    const methodId = method.id
                    if (!methodId) continue

                    const qrFile = formData.get(`qr_code_file_${methodId}`) as File | null
                    
                    // SECURITY: Enforce file size limits
                    if (qrFile && qrFile.size > 0) {
                        if (qrFile.size > MAX_FILE_SIZE) {
                            return { success: false, error: `File '${qrFile.name}' exceeds the 2MB size limit.` }
                        }

                        const path = `studios/${studioId}/qr_${methodId}_${timestamp}.${qrFile.name.split('.').pop()}`
                        const { error: uploadErr } = await adminSupabase.storage.from('studios').upload(path, qrFile, {
                            contentType: uploadContentType(qrFile),
                            upsert: true,
                        })
                        if (!uploadErr) method.qr_code_url = path
                    }
                }
            }
        } catch (e) {
            return { success: false, error: 'Invalid payment method payload' }
        }
    }

    const { error: studioError } = await supabase
        .from('studios')
        .update({
            enable_xendit: formData.get('enableXendit') === 'true',
            enable_manual_payments: formData.get('enableManualPayments') === 'true',
            manual_payment_methods: manualMethods,
        })
        .eq('id', studioId)
        .eq('owner_id', user.id)

    if (studioError) return { success: false, error: 'Failed to update studio settings' }

    // SECURE XENDIT CONFIG UPDATE
    const rawApiKey = formData.get('xenditApiKey') as string
    const rawCallbackToken = formData.get('xenditCallbackToken') as string

    const configUpdate: Record<string, any> = {
        id: studioId,
        updated_at: new Date().toISOString()
    }

    if (rawApiKey !== undefined) {
        if (!rawApiKey) configUpdate.xendit_api_key = null
        else if (!rawApiKey.includes('*')) configUpdate.xendit_api_key = rawApiKey
    }

    if (rawCallbackToken !== undefined) {
        if (!rawCallbackToken) configUpdate.xendit_callback_token = null
        else if (!rawCallbackToken.includes('*')) configUpdate.xendit_callback_token = rawCallbackToken
    }

    if (Object.keys(configUpdate).length > 2) {
        await supabase
            .from('studio_payment_configs')
            .upsert(configUpdate)
    }

    revalidatePath('/studio/online-store/payments')
    return { success: true }
}

export async function updateStudioPlan(studioId: string, newTier: string): Promise<ServerActionResponse> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const { isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner) return { success: false, error: 'Only studio owners can change plans.' }

    const validTiers = ['starter', 'pro', 'premium', 'business']
    if (!validTiers.includes(newTier)) return { success: false, error: 'Invalid plan selected' }

    const updateData: any = {
        subscription_tier: newTier,
        plan: newTier,
    }

    if (newTier !== 'starter') updateData.subscription_status = 'active'

    const { error } = await supabase
        .from('studios')
        .update(updateData)
        .eq('id', studioId)
        .eq('owner_id', user.id)

    if (error) return { success: false, error: `Update failed: ${error.message}` }

    revalidatePath('/studio/settings/billing')
    revalidatePath('/studio')
    return { success: true }
}
