'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { ErrorService } from '@/lib/services/error-service'

import { ServerActionResponse } from './types'

/**
 * Hardened Staff Management
 */

export async function addStudioMember(formData: FormData): Promise<ServerActionResponse> {
    const supabase = await createClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return { success: false, error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const email = formData.get('email') as string
    const roleId = formData.get('role') as string || 'staff'

    const { isOwner, permissions } = await verifyStudioAccess(studioId)
    if (!isOwner && !permissions?.manage_staff) {
        await ErrorService.logSecurityEvent('Unauthorized addMember attempt', { studioId, userId: currentUser.id })
        return { success: false, error: 'Permission denied.' }
    }

    const { data: studio } = await supabase.from('studios').select('subscription_tier').eq('id', studioId).single()
    if (!studio) return { success: false, error: 'Studio not found.' }

    if (studio.subscription_tier === 'starter' || !studio.subscription_tier) {
        return { success: false, error: 'Please upgrade to Pro to add staff members.' }
    }

    // PRIVACY: Standardized lookup error
    const { data: profile } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).maybeSingle()
    if (!profile) return { success: false, error: 'Could not invite user. Please ensure they have a StudioVault account.' }

    if (profile.id === currentUser.id) return { success: false, error: 'You are the studio owner.' }

    // Use Atomic RPC
    const { data: result, error: rpcError } = await supabase.rpc('add_staff_member_atomic_v1', {
        p_studio_id: studioId,
        p_profile_id: profile.id,
        p_role_id: roleId,
        p_invited_by_id: currentUser.id,
        p_metadata: {}
    })

    if (rpcError || !result?.success) {
        await ErrorService.logServiceError('StudioStaff', 'addStudioMember', rpcError || result?.error, { studioId, email })
        return { success: false, error: rpcError?.message || result?.error || 'Failed to add member.' }
    }

    revalidatePath('/studio/staff')
    return { success: true }
}

export async function addStaffAction(payload: any): Promise<ServerActionResponse> {
    const { studioId, account, contact, personal, employment, website } = payload
    const { user: currentUser, isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner) {
        await ErrorService.logSecurityEvent('Unauthorized addStaffAction attempt', { studioId, userId: currentUser.id })
        return { success: false, error: 'Unauthorized.' }
    }

    const supabase = await createClient()
    
    // PRIVACY: Standardized lookup error
    const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', account.email.toLowerCase().trim()).maybeSingle()
    if (!existingProfile) return { success: false, error: 'User not found. Ensure they have a StudioVault account.' }

    const metadata = { is_bookable: account.is_bookable, contact, personal, employment, website }

    // Use Atomic RPC for transactional integrity
    const { data: result, error: rpcError } = await supabase.rpc('add_staff_member_atomic_v1', {
        p_studio_id: studioId,
        p_profile_id: existingProfile.id,
        p_role_id: account.role_id,
        p_invited_by_id: currentUser.id,
        p_metadata: metadata,
        p_outlet_id: employment.default_location_id || null
    })

    if (rpcError || !result?.success) {
        await ErrorService.logServiceError('StudioStaff', 'addStaffAction', rpcError || result?.error, { studioId, payload })
        return { success: false, error: rpcError?.message || result?.error || 'Failed to finalize staff setup.' }
    }

    revalidatePath('/studio/management/staff/members')
    return { success: true }
}

export async function removeStudioMember(memberId: string): Promise<ServerActionResponse> {
    const supabase = await createClient()
    const { data: member } = await supabase.from('studio_members').select('studio_id').eq('id', memberId).single()
    if (!member) return { success: false, error: 'Member not found' }

    const { isOwner, permissions } = await verifyStudioAccess(member.studio_id)
    if (!isOwner && !permissions?.manage_staff) {
        return { success: false, error: 'Permission denied.' }
    }

    const { error } = await supabase.from('studio_members').delete().eq('id', memberId)
    if (error) {
        await ErrorService.logServiceError('StudioStaff', 'removeStudioMember', error, { memberId })
        return { success: false, error: 'Failed to remove member.' }
    }

    revalidatePath('/studio/staff')
    return { success: true }
}

export async function createStudioRole(formData: FormData): Promise<ServerActionResponse> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const name = formData.get('name') as string

    if (!studioId || !name) return { success: false, error: 'Name is required' }

    const { isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner) return { success: false, error: 'Unauthorized.' }

    const { error } = await supabase.from('studio_roles').insert({ studio_id: studioId, name, type: 'custom', created_by: user.id })
    if (error) {
        await ErrorService.logServiceError('StudioStaff', 'createStudioRole', error, { studioId, name })
        return { success: false, error: 'Failed to create role.' }
    }

    revalidatePath('/studio/management/staff/roles')
    return { success: true }
}

export async function updateStudioRolePermissions(roleId: string, permissions: Record<string, boolean>): Promise<ServerActionResponse> {
    const supabase = await createClient()
    const { data: role } = await supabase.from('studio_roles').select('studio_id').eq('id', roleId).single()
    if (!role) return { success: false, error: 'Role not found' }

    const { isOwner } = await verifyStudioAccess(role.studio_id)
    if (!isOwner) return { success: false, error: 'Unauthorized.' }

    const { error } = await supabase.from('studio_roles').update({ permissions }).eq('id', roleId)
    if (error) {
        await ErrorService.logServiceError('StudioStaff', 'updateStudioRolePermissions', error, { roleId, permissions })
        return { success: false, error: 'Update failed.' }
    }

    revalidatePath('/studio/management/staff/roles')
    return { success: true }
}
