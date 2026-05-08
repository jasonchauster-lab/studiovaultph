'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { uploadContentType } from '@/lib/utils/image-utils'
import { ErrorService } from '@/lib/services/error-service'

import { ServerActionResponse } from './types'

export async function addStudioCustomerAction(formData: {
    studioId: string
    email: string
    firstName: string
    lastName: string
    mobile?: string
    dob?: string
}): Promise<ServerActionResponse> {
    try {
        const supabase = await createClient()
        const { studioId, email, firstName, lastName, mobile, dob } = formData

        await verifyStudioAccess(studioId)

        const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle()
        let profileId = existingProfile?.id

        if (!profileId) {
            const { data: newProfile, error: profileError } = await supabase
                .from('profiles')
                .insert({
                    email: email.toLowerCase(),
                    full_name: `${firstName} ${lastName}`,
                    contact_number: mobile || null,
                    date_of_birth: dob || null,
                    role: 'customer',
                    origin_portal: 'cms'
                })
                .select('id')
                .single()

            if (profileError) {
                await ErrorService.logServiceError('StudioMarketplace', 'addStudioCustomer (Profile)', profileError, { formData })
                return { success: false, error: 'Failed to create customer profile' }
            }
            profileId = newProfile.id
        }

        const { error: customerError } = await supabase.from('studio_customers').upsert({ studio_id: studioId, profile_id: profileId, created_at: new Date().toISOString() }, { onConflict: 'studio_id,profile_id' })
        if (customerError) {
            await ErrorService.logServiceError('StudioMarketplace', 'addStudioCustomer (Link)', customerError, { studioId, profileId })
            return { success: false, error: 'Failed to link customer to studio' }
        }

        revalidatePath('/studio/customers')
        return { success: true, data: { profileId } }
    } catch (err: any) {
        await ErrorService.logServiceError('StudioMarketplace', 'addStudioCustomer (Critical)', err, { formData })
        return { success: false, error: 'Internal system error' }
    }
}

export async function submitStudioGlobalDocs(formData: FormData): Promise<ServerActionResponse> {
    try {
        const supabase = await createClient()
        const studioId = formData.get('studioId') as string
        if (!studioId) return { success: false, error: 'Studio ID is required' }
        await verifyStudioAccess(studioId)

        const adminSupabase = createAdminClient()
        const timestamp = Date.now()
        const updateData: any = {
            marketplace_eligibility: 'pending',
            bir_expiry: formData.get('birExpiry') || null,
            gov_id_expiry: formData.get('govIdExpiry') || null,
            updated_at: new Date().toISOString()
        }

        const files = ['birFile', 'govIdFile', 'secCertFile']
        const keys = ['bir_url', 'gov_id_url', 'sec_cert_url']

        for (let i = 0; i < files.length; i++) {
            const file = formData.get(files[i]) as File
            if (file && file.size > 0) {
                const path = `studios/${studioId}/${files[i].replace('File', '').toLowerCase()}_${timestamp}.${file.name.split('.').pop()}`
                const { error } = await adminSupabase.storage.from('studios').upload(path, file, { contentType: uploadContentType(file) })
                if (error) {
                    await ErrorService.logServiceError('StudioMarketplace', 'submitGlobalDocs (Upload)', error, { studioId, file: files[i] })
                    return { success: false, error: `Failed to upload ${files[i]}` }
                }
                updateData[keys[i]] = path
            }
        }

        const { error: updateError } = await supabase.from('studios').update(updateData).eq('id', studioId)
        if (updateError) {
            await ErrorService.logServiceError('StudioMarketplace', 'submitGlobalDocs (Update)', updateError, { studioId })
            return { success: false, error: 'Failed to update studio documentation status' }
        }

        revalidatePath('/studio/settings')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('StudioMarketplace', 'submitGlobalDocs (Critical)', err)
        return { success: false, error: 'Internal system error' }
    }
}

export async function submitBranchMarketplaceDocs(formData: FormData): Promise<ServerActionResponse> {
    try {
        const supabase = await createClient()
        const studioId = formData.get('studioId') as string
        const outletId = formData.get('outletId') as string
        if (!studioId || !outletId) return { success: false, error: 'Studio and Branch ID required' }
        await verifyStudioAccess(studioId)

        const adminSupabase = createAdminClient()
        const timestamp = Date.now()
        const updateData: any = {
            marketplace_status: 'pending',
            mayors_permit_expiry: formData.get('mayorsPermitExpiry') || null,
            insurance_expiry: formData.get('insuranceExpiry') || null,
            updated_at: new Date().toISOString()
        }

        const files = ['mayorsPermitFile', 'insuranceFile']
        const keys = ['mayors_permit_url', 'insurance_url']

        for (let i = 0; i < files.length; i++) {
            const file = formData.get(files[i]) as File
            if (file && file.size > 0) {
                const path = `studios/${studioId}/branch_${outletId}/${files[i].replace('File', '').toLowerCase()}_${timestamp}.${file.name.split('.').pop()}`
                const { error } = await adminSupabase.storage.from('studios').upload(path, file, { contentType: uploadContentType(file) })
                if (error) {
                    await ErrorService.logServiceError('StudioMarketplace', 'submitBranchDocs (Upload)', error, { outletId, file: files[i] })
                    return { success: false, error: `Failed to upload ${files[i]}` }
                }
                updateData[keys[i]] = path
            }
        }

        const { error: updateError } = await supabase.from('outlets').update(updateData).eq('id', outletId).eq('studio_id', studioId)
        if (updateError) {
            await ErrorService.logServiceError('StudioMarketplace', 'submitBranchDocs (Update)', updateError, { outletId })
            return { success: false, error: 'Failed to update branch documentation status' }
        }

        revalidatePath('/studio/settings')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('StudioMarketplace', 'submitBranchDocs (Critical)', err)
        return { success: false, error: 'Internal system error' }
    }
}

export async function toggleBranchMarketplaceSync(outletId: string, enabled: boolean): Promise<ServerActionResponse> {
    try {
        const supabase = await createClient()
        const { data: outlet } = await supabase.from('outlets').select('studio_id').eq('id', outletId).single()
        if (!outlet) return { success: false, error: 'Branch not found' }

        await verifyStudioAccess(outlet.studio_id)
        const { error } = await supabase.from('outlets').update({ is_marketplace_sync_enabled: enabled }).eq('id', outletId)
        if (error) {
            await ErrorService.logServiceError('StudioMarketplace', 'toggleSync', error, { outletId })
            return { success: false, error: 'Failed to update sync status' }
        }

        revalidatePath('/studio/settings')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: 'Internal error' }
    }
}

export async function updateBranchMarketplaceHours(outletId: string, from: string, to: string): Promise<ServerActionResponse> {
    try {
        const supabase = await createClient()
        const { data: outlet } = await supabase.from('outlets').select('studio_id').eq('id', outletId).single()
        if (!outlet) return { success: false, error: 'Branch not found' }

        await verifyStudioAccess(outlet.studio_id)
        const { error } = await supabase.from('outlets').update({ marketplace_available_from: from, marketplace_available_to: to }).eq('id', outletId)
        if (error) {
            await ErrorService.logServiceError('StudioMarketplace', 'updateHours', error, { outletId })
            return { success: false, error: 'Failed to update hours' }
        }

        revalidatePath('/studio/settings')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: 'Internal error' }
    }
}

export async function activateStudioStorefront(studioId: string): Promise<ServerActionResponse> {
    try {
        const supabase = await createClient()
        const { isOwner, user } = await verifyStudioAccess(studioId)
        if (!isOwner) return { success: false, error: "Unauthorized" }

        const { error } = await supabase.from('studios').update({ subscription_tier: 'premium' }).eq('id', studioId).eq('owner_id', user.id)
        if (error) {
            await ErrorService.logServiceError('StudioMarketplace', 'activateStorefront', error, { studioId })
            return { success: false, error: 'Activation failed' }
        }
        revalidatePath('/studio/online-store')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: 'Internal error' }
    }
}
