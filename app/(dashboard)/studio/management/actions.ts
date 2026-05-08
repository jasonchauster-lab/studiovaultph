'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { logAuditAction } from '@/lib/studio/audit'

export async function updateBusinessInfo(formData: FormData) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const outletId = formData.get('outletId') as string
    
    // Branding (Shared)
    const studioName = formData.get('studioName') as string
    const registeredName = formData.get('registeredName') as string
    const registrationNo = formData.get('registrationNo') as string
    const industry = formData.get('industry') as string
    const whatsappNumber = formData.get('whatsappNumber') as string
    const showWhatsappButton = formData.get('showWhatsappButton') === 'true'
    
    // Location Details (Branch Specific)
    const branchName = formData.get('name') as string
    const contactEmail = formData.get('contactEmail') as string
    const contactNumber = formData.get('contactNumber') as string
    const address = formData.get('address') as string
    const floorOrUnit = formData.get('floorOrUnit') as string
    const country = formData.get('country') as string
    const openingTime = formData.get('openingTime') as string || '06:00'
    const closingTime = formData.get('closingTime') as string || '22:00'
    const timezone = formData.get('timezone') as string

    if (!studioId) return { error: 'Studio ID is required' }

    // Security Lockdown: Verify permission
    const { isOwner, permissions } = await verifyStudioAccess(studioId)
    if (!isOwner && !permissions?.manage_store) {
        return { error: 'Permission denied: manage_store required' }
    }

    // 1. Update Studio Record (Brand & Legal ONLY)
    // We only update contact info in 'studios' if it's the primary/only branch or for legacy single-branch support.
    const { count: outletCount } = await supabase
        .from('outlets')
        .select('*', { count: 'exact', head: true })
        .eq('studio_id', studioId)

    const studioUpdateData: any = {
        name: studioName,
        company_registered_name: registeredName,
        company_registration_no: registrationNo,
        business_industry: industry,
        whatsapp_number: whatsappNumber,
        show_whatsapp_button: showWhatsappButton,
        updated_at: new Date().toISOString()
    }

    // Only overwrite global contact info if this is the only branch or we are explicitly managing the main studio
    if (!outletId || outletCount === 1) {
        Object.assign(studioUpdateData, {
            business_contact_email: contactEmail,
            business_contact_number: contactNumber,
            address: address,
            floor_or_unit: floorOrUnit,
            business_country: country,
            opening_time: openingTime,
            closing_time: closingTime,
        })
    }

    const { error: studioError } = await supabase
        .from('studios')
        .update(studioUpdateData)
        .eq('id', studioId)

    if (studioError) {
        console.error('Error updating studio info:', studioError)
        return { error: `Studio Update Failed: ${studioError.message}` }
    }

    // 2. Update Outlet Record (Branch Specific)
    if (outletId) {
        const { error: outletError } = await supabase
            .from('outlets')
            .update({
                name: branchName,
                address,
                floor_or_unit: floorOrUnit,
                phone: contactNumber,
                email: contactEmail,
                country: country,
                opening_time: openingTime,
                closing_time: closingTime,
                timezone: timezone,
                updated_at: new Date().toISOString()
            })
            .eq('id', outletId)
            .eq('studio_id', studioId)

        if (outletError) {
            console.error('Error updating outlet info:', outletError)
            return { error: 'Failed to update branch location details' }
        }
    }

    revalidatePath('/studio/management/business')
    revalidatePath('/studio')

    await logAuditAction({
        studioId,
        actorId: user.id,
        action: 'BUSINESS_INFO_UPDATE',
        entityType: 'studio',
        entityId: studioId,
        metadata: { studioName, branchName }
    })
    return { success: true }
}

export async function updateStaffMember(formData: FormData) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const memberId = formData.get('memberId') as string
    const role = formData.get('role') as string

    // Security Lockdown: Verify the member belongs to a studio the user can manage
    const { data: member } = await supabase.from('studio_members').select('studio_id').eq('id', memberId).single()
    if (!member) return { error: 'Staff member not found' }
    
    const { isOwner, permissions } = await verifyStudioAccess(member.studio_id)
    if (!isOwner && !permissions?.manage_staff) {
        return { error: 'Permission denied: manage_staff required' }
    }

    const { error } = await supabase
        .from('studio_members')
        .update({ role })
        .eq('id', memberId)

    if (error) {
        return { error: 'Failed to update staff member' }
    }

    revalidatePath('/studio/management/staff/members')
    
    await logAuditAction({
        studioId: member.studio_id,
        actorId: user.id,
        action: 'STAFF_ROLE_CHANGE',
        entityType: 'staff',
        entityId: memberId,
        metadata: { newRole: role }
    })
    return { success: true }
}

export async function createOutlet(formData: FormData) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const timezone = formData.get('timezone') as string || 'Asia/Manila'

    if (!studioId) return { error: 'Studio ID is required' }
    const { isOwner, permissions } = await verifyStudioAccess(studioId)
    if (!isOwner && !permissions?.manage_settings) {
        return { error: 'Permission denied: manage_settings required' }
    }

    // Clone website config from the first branch if available
    const { data: firstBranch } = await supabase
        .from('outlets')
        .select('website_config')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

    const { data, error } = await supabase
        .from('outlets')
        .insert({
            studio_id: studioId,
            name,
            address,
            phone,
            email,
            timezone,
            slug: formData.get('slug') as string || null,
            status: formData.get('status') as string || 'published',
            hero_image_url: formData.get('hero_image_url') as string || null,
            banner_url: formData.get('banner_url') as string || null,
            website_config: firstBranch?.website_config || null,
            is_active: true
        })
        .select()
        .single()

    if (error) {
        console.error('[createOutlet] Error:', error)
        return { error: error.message || 'Failed to create location' }
    }

    revalidatePath('/studio/management/outlets')
    return { success: true, data }
}

export async function updateOutlet(formData: FormData) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const outletId = formData.get('outletId') as string
    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const phone = formData.get('phone') as string
    const email = formData.get('email') as string
    const isActive = formData.get('isActive') === 'true'

    const { data: outlet } = await supabase.from('outlets').select('studio_id').eq('id', outletId).single()
    if (!outlet) return { error: 'Location not found' }
    
    const { isOwner, permissions } = await verifyStudioAccess(outlet.studio_id)
    if (!isOwner && !permissions?.manage_settings) {
        return { error: 'Permission denied: manage_settings required' }
    }

    const { error } = await supabase
        .from('outlets')
        .update({
            name,
            address,
            phone,
            email,
            slug: formData.get('slug') as string || null,
            status: formData.get('status') as string || 'published',
            hero_image_url: formData.get('hero_image_url') as string || null,
            banner_url: formData.get('banner_url') as string || null,
            is_active: isActive,
            updated_at: new Date().toISOString()
        })
        .eq('id', outletId)

    if (error) {
        console.error('Error updating outlet:', error)
        return { error: 'Failed to update location' }
    }

    revalidatePath('/studio/management/outlets')
    return { success: true }
}

export async function deleteOutlet(outletId: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const { data: outlet } = await supabase.from('outlets').select('studio_id').eq('id', outletId).single()
    if (!outlet) return { error: 'Location not found' }
    
    const { isOwner, permissions } = await verifyStudioAccess(outlet.studio_id)
    if (!isOwner && !permissions?.manage_settings) {
        return { error: 'Permission denied: manage_settings required' }
    }

    // Check if it's the last outlet (optional safety)
    const { count } = await supabase
        .from('outlets')
        .select('*', { count: 'exact', head: true })

    if (count === 1) {
        return { error: 'Cannot delete the only location. At least one location is required.' }
    }

    const { error } = await supabase
        .from('outlets')
        .delete()
        .eq('id', outletId)

    if (error) {
        console.error('Error deleting outlet:', error)
        return { error: 'Failed to delete location' }
    }

    revalidatePath('/studio/management/outlets')
    return { success: true }
}

export async function updateMemberOutlets(memberId: string, outletIds: string[]) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const { data: member } = await supabase.from('studio_members').select('studio_id').eq('id', memberId).single()
    if (!member) return { error: 'Staff member not found' }
    await verifyStudioAccess(member.studio_id)

    // 1. Remove existing assignments
    const { error: deleteError } = await supabase
        .from('outlet_members')
        .delete()
        .eq('member_id', memberId)

    if (deleteError) {
        console.error('Error removing assignments:', deleteError)
        return { error: 'Failed to update location assignments' }
    }

    // 2. Add new assignments
    if (outletIds.length > 0) {
        const assignments = outletIds.map(id => ({
            member_id: memberId,
            outlet_id: id
        }))

        const { error: insertError } = await supabase
            .from('outlet_members')
            .insert(assignments)

        if (insertError) {
            console.error('Error creating assignments:', insertError)
            return { error: 'Failed to create location assignments' }
        }
    }

    revalidatePath('/studio/management/staff/members')
    return { success: true }
}

export async function updateEquipmentInventory(studioId: string, inventory: any, outletId?: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    // Security Lockdown
    await verifyStudioAccess(studioId)
    const { data: studio, error: fetchError } = await supabase
        .from('studios')
        .select('id, inventory')
        .eq('id', studioId)
        .single()

    if (fetchError || !studio) {
        return { error: 'Studio not found' }
    }

    // 2. Perform Update (Either Outlet or Studio)
    if (outletId) {
        const { error } = await supabase
            .from('outlets')
            .update({ inventory, updated_at: new Date().toISOString() })
            .eq('id', outletId)
            .eq('studio_id', studioId)
        if (error) return { error: 'Failed to update branch inventory' }

        // 3. Sync Categories to Master Registry (Studios table)
        // We ensure any new types created in a branch are added to the master list with 0 counts
        const masterInventory = studio.inventory || {}
        let registryChanged = false
        
        Object.keys(inventory).forEach(key => {
            if (!masterInventory[key]) {
                masterInventory[key] = { 
                    ...inventory[key], 
                    total: 0, 
                    rental_cap: 0 
                }
                registryChanged = true
            }
        })

        if (registryChanged) {
            await supabase
                .from('studios')
                .update({ inventory: masterInventory })
                .eq('id', studioId)
        }
    } else {
        const { error } = await supabase
            .from('studios')
            .update({ inventory, updated_at: new Date().toISOString() })
            .eq('id', studioId)
        if (error) return { error: 'Failed to update studio inventory' }
    }

    revalidatePath('/studio/management/equipments')
    return { success: true }
}

export async function updateTaxSettings(studioId: string, taxInclusive: boolean) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    // Security Lockdown
    await verifyStudioAccess(studioId)

    const { error } = await supabase
        .from('studios')
        .update({ tax_inclusive: taxInclusive })
        .eq('id', studioId)

    if (error) {
        console.error('Error updating tax settings:', error)
        return { error: error.message }
    }

    revalidatePath('/studio/management/tax-settings')
    return { success: true }
}

export async function addStudioTax(formData: FormData) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    if (!studioId) return { error: 'Studio ID is required' }
    await verifyStudioAccess(studioId)
    const name = formData.get('name') as string
    const country = formData.get('country') as string
    const percentage = parseFloat(formData.get('percentage') as string)
    const registrationNumber = formData.get('registrationNumber') as string

    const { error } = await supabase
        .from('studio_taxes')
        .insert({
            studio_id: studioId,
            name,
            country,
            percentage,
            registration_number: registrationNumber || null
        })

    if (error) {
        console.error('Error adding studio tax:', error)
        return { error: error.message }
    }

    revalidatePath('/studio/management/tax-settings')
    return { success: true }
}

export async function deleteStudioTax(taxId: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const { data: tax } = await supabase.from('studio_taxes').select('studio_id').eq('id', taxId).single()
    if (!tax) return { error: 'Tax record not found' }
    
    const { isOwner, permissions } = await verifyStudioAccess(tax.studio_id)
    if (!isOwner && !permissions?.manage_store) {
        return { error: 'Permission denied: manage_store required' }
    }

    const { error } = await supabase
        .from('studio_taxes')
        .delete()
        .eq('id', taxId)

    if (error) {
        console.error('Error deleting studio tax:', error)
        return { error: error.message }
    }

    revalidatePath('/studio/management/tax-settings')
    return { success: true }
}

export async function upsertNotificationRecipient(
    studioId: string, 
    profileId: string, 
    isEnabled: boolean, 
    preferences: any
) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    // Security Lockdown
    await verifyStudioAccess(studioId)

    // Optional: Additional logic for who can manage WHO
    // But verifyStudioAccess already ensures the caller is at least Staff or Owner of this studio
    const { data: studio } = await supabase
        .from('studios')
        .select('owner_id')
        .eq('id', studioId)
        .single()

    const isOwner = studio?.owner_id === user.id
    if (!isOwner && user.id !== profileId) {
        return { error: 'Only owners can manage other staff notification settings.' }
    }

    const { error } = await supabase
        .from('staff_notification_recipients')
        .upsert({
            studio_id: studioId,
            profile_id: profileId,
            is_enabled: isEnabled,
            preferences,
            updated_at: new Date().toISOString()
        }, { onConflict: 'studio_id,profile_id' })

    if (error) {
        console.error('Error upserting notification recipient:', error)
        return { error: 'Failed to save notification settings' }
    }

    revalidatePath('/studio/management/notifications')
    return { success: true }
}

export async function deleteNotificationRecipient(id: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const { data: recipient } = await supabase.from('staff_notification_recipients').select('studio_id').eq('id', id).single()
    if (!recipient) return { error: 'Recipient not found' }
    await verifyStudioAccess(recipient.studio_id)

    const { error } = await supabase
        .from('staff_notification_recipients')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting notification recipient:', error)
        return { error: 'Failed to delete notification recipient' }
    }

    revalidatePath('/studio/management/notifications')
    return { success: true }
}

export async function markNotificationRead(notificationId: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('recipient_id', user.id)

    if (error) return { error: 'Failed to update notification' }

    revalidatePath('/studio')
    return { success: true }
}

export async function clearAllNotifications() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Not authenticated' }

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

    if (error) return { error: 'Failed to clear notifications' }

    revalidatePath('/studio')
    return { success: true }
}

