'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { logAuditAction } from '@/lib/studio/audit'

export async function createPromoCode(formData: any) {
    const supabase = await createClient()
    const studioId = formData.studioId
    if (!studioId) throw new Error('Studio ID is required')

    // Security Lockdown: Verify access
    const { isOwner, metadata } = await verifyStudioAccess(studioId)
    if (!isOwner && !metadata.manage_store) {
        throw new Error('Permission denied: You do not have access to manage promo codes.')
    }

    const { error } = await supabase.from('promo_codes').insert({
        studio_id: studioId,
        code: formData.code,
        description: formData.description,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value || '0'),
        applies_to_type: formData.applies_to_type,
        applicable_ids: formData.applicable_ids || [],
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        starts_at: formData.starts_at || new Date().toISOString(),
        expires_at: formData.expires_at || null
    })

    if (error) {
        console.error('Error creating promo code:', error)
        return { success: false, error: error.message }
    }
    
    revalidatePath('/studio/promo')
    return { success: true }
}

export async function deletePromoCode(id: string) {
    const supabase = await createClient()
    
    // Security Lockdown
    const { data: promo } = await supabase.from('promo_codes').select('studio_id, code').eq('id', id).single()
    if (!promo) throw new Error('Promo code not found')
    // Security Lockdown
    const { user, isOwner, metadata } = await verifyStudioAccess(promo.studio_id)
    if (!isOwner && !metadata.manage_store) {
        throw new Error('Permission denied: You do not have access to manage promo codes.')
    }
    const studioId = promo.studio_id

    const { error } = await supabase.from('promo_codes').update({ is_deleted: true }).eq('id', id).eq('studio_id', studioId)
    
    if (!error) {
        await logAuditAction({
            studioId,
            actorId: user.id,
            action: 'SOFT_DELETE_PROMO',
            entityType: 'promo_code',
            entityId: id,
            metadata: { code: promo.code }
        })
    }
    if (error) throw error
    revalidatePath('/studio/promo')
    return { success: true }
}

export async function getPromoUsageHistory(promoId: string) {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Security check: Verify studio access
    const { data: promo } = await supabase.from('promo_codes').select('studio_id').eq('id', promoId).single()
    if (!promo) throw new Error('Promo code not found')
    
    await verifyStudioAccess(promo.studio_id)

    // Fetch usage with admin client to ensure we can see all records and related data
    const { data, error } = await adminSupabase
        .from('customer_plans')
        .select(`
            id,
            total_amount,
            created_at,
            user_id,
            memberships:membership_id (name),
            packages:package_id (name)
        `)
        .eq('promo_code_id', promoId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching usage history:', error)
        throw error
    }

    // Fetch profiles separately for the user_ids found
    const userIds = data.map((u: any) => u.user_id).filter(Boolean)
    let profilesMap: Record<string, any> = {}
    
    if (userIds.length > 0) {
        const { data: profiles } = await adminSupabase
            .from('profiles')
            .select('id, first_name, last_name, full_name, email')
            .in('id', userIds)
        
        if (profiles) {
            profiles.forEach(p => { profilesMap[p.id] = p })
        }
    }

    return data.map((usage: any) => {
        const profile = profilesMap[usage.user_id]
        return {
            id: usage.id,
            amount: usage.total_amount,
            date: usage.created_at,
            customer: {
                name: profile ? (profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email) : 'Unknown Customer',
                email: profile?.email || 'N/A'
            },
            item: usage.memberships?.name || usage.packages?.name || 'Unknown Item'
        }
    })
}
