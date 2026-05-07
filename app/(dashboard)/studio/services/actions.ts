'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { uploadContentType, sanitizeFileName } from '@/lib/utils/image-utils'
import { revalidatePath } from 'next/cache'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { logAuditAction } from '@/lib/studio/audit'

export interface ActionResponse<T = any> {
    success: boolean
    error?: string
    data?: T
}

async function syncDirectPricePackage(supabase: any, studioId: string, serviceId: string, serviceName: string, directPrice: number) {
    if (directPrice <= 0) {
        await supabase
            .from('packages')
            .delete()
            .eq('studio_id', studioId)
            .eq('category', 'System Generated')
            .contains('applicable_service_ids', [serviceId])
        return
    }

    const { data: existingPkg } = await supabase
        .from('packages')
        .select('id, applicable_service_ids')
        .eq('studio_id', studioId)
        .eq('category', 'System Generated')
        .contains('applicable_service_ids', [serviceId])
        .maybeSingle()

    const pkgData = {
        studio_id: studioId,
        name: `Single Session - ${serviceName}`,
        description: `Direct drop-in rate for ${serviceName}`,
        category: 'System Generated',
        price: directPrice,
        credits: 1,
        validity_days: 365,
        validity_value: 1,
        validity_unit: 'years',
        applicable_service_ids: [serviceId],
        is_private: false,
        status: 'active'
    }

    if (existingPkg) {
        await supabase.from('packages').update(pkgData).eq('id', existingPkg.id)
    } else {
        await supabase.from('packages').insert(pkgData)
    }
}

export async function createService(formData: any): Promise<ActionResponse> {
    try {
        const studioId = formData.studioId
        if (!studioId) return { success: false, error: 'Studio ID is required' }

        const { user, isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_store) {
            return { success: false, error: 'Permission denied.' }
        }

        const supabase = await createClient()
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .insert({
                studio_id: studioId,
                name: formData.name,
                description: formData.description,
                type: formData.type || 'class',
                category: formData.category,
                category_id: formData.category_id || null,
                sub_category: formData.sub_category,
                duration_minutes: parseInt(formData.duration_minutes || '60'),
                difficulty: formData.difficulty,
                conduction_type: formData.conduction_type || 'Onsite',
                media_urls: formData.media_urls || [],
                video_url: formData.video_url,
                prep_instructions: formData.prep_instructions,
                is_visible_in_store: formData.isVisibleInStore ?? true,
                display_order: formData.display_order || 0,
                status: 'active'
            })
            .select()
            .single()

        if (serviceError) throw serviceError

        await logAuditAction({
            studioId,
            actorId: user.id,
            action: 'CREATE_SERVICE',
            entityType: 'service',
            entityId: service.id,
            metadata: { name: formData.name }
        })

        if (formData.pricing?.isPaid) {
            const { assignedMemberships = [], assignedPackages = [] } = formData.pricing

            // FIX PERF: Parallelize Membership Updates
            const membershipPromises = assignedMemberships.map(async (mId: string) => {
                const { data: membership } = await supabase.from('memberships').select('applicable_service_ids').eq('id', mId).single()
                const currentIds = membership?.applicable_service_ids || []
                if (!currentIds.includes(service.id)) {
                    return supabase.from('memberships').update({ applicable_service_ids: [...currentIds, service.id] }).eq('id', mId)
                }
                return null
            })

            // FIX PERF: Parallelize Package Updates
            const packagePromises = assignedPackages.map(async (pId: string) => {
                const { data: pkg } = await supabase.from('packages').select('applicable_service_ids').eq('id', pId).single()
                const currentIds = pkg?.applicable_service_ids || []
                if (!currentIds.includes(service.id)) {
                    return supabase.from('packages').update({ applicable_service_ids: [...currentIds, service.id] }).eq('id', pId)
                }
                return null
            })

            await Promise.all([...membershipPromises, ...packagePromises])
        }

        if (formData.pricing?.isDirectPayment && formData.pricing?.directPrice > 0) {
            await syncDirectPricePackage(supabase, studioId, service.id, formData.name, formData.pricing.directPrice)
        }

        revalidatePath('/studio/services')
        return { success: true }
    } catch (err: any) {
        console.error('[createService] Error:', err)
        return { success: false, error: 'Failed to create service.' }
    }
}

export async function updateStudioSettings(studioId: string, settings: any): Promise<ActionResponse> {
    try {
        const { isOwner } = await verifyStudioAccess(studioId)
        if (!isOwner) return { success: false, error: 'Only owners can update studio-wide settings' }

        const supabase = await createClient()
        const { error } = await supabase
            .from('studios')
            .update({ service_settings: settings })
            .eq('id', studioId)

        if (error) throw error
        revalidatePath('/studio/services/settings')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: 'Failed to update settings.' }
    }
}

export async function createCategory(studioId: string, name: string, type: 'class' | 'appointment'): Promise<ActionResponse> {
    try {
        await verifyStudioAccess(studioId)
        const supabase = await createClient()
        const { data: lastCat } = await supabase
            .from('service_categories')
            .select('display_order')
            .eq('studio_id', studioId)
            .eq('type', type)
            .order('display_order', { ascending: false })
            .limit(1)
            .maybeSingle()

        const newOrder = (lastCat?.display_order ?? -1) + 1
        const { data, error } = await supabase
            .from('service_categories')
            .insert({ studio_id: studioId, name, type, display_order: newOrder })
            .select()
            .single()

        if (error) throw error
        revalidatePath('/studio/services')
        return { success: true, data }
    } catch (err: any) {
        return { success: false, error: 'Failed to create category.' }
    }
}

export async function updateService(id: string, formData: any): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: service } = await supabase.from('services').select('studio_id').eq('id', id).single()
        if (!service) return { success: false, error: 'Service not found' }
        
        const { user, isOwner, permissions } = await verifyStudioAccess(service.studio_id)
        if (!isOwner && !permissions.manage_store) {
            return { success: false, error: 'Permission denied.' }
        }
        const studioId = service.studio_id

        const { error: serviceError } = await supabase
            .from('services')
            .update({
                name: formData.name,
                description: formData.description,
                type: formData.type || 'class',
                category: formData.category,
                category_id: formData.category_id || null,
                sub_category: formData.sub_category,
                duration_minutes: parseInt(formData.duration_minutes || '60'),
                difficulty: formData.difficulty,
                conduction_type: formData.conduction_type,
                media_urls: formData.media_urls || [],
                video_url: formData.video_url,
                prep_instructions: formData.prep_instructions,
                is_visible_in_store: formData.isVisibleInStore ?? true,
                status: formData.status || 'active'
            })
            .eq('id', id)

        if (serviceError) throw serviceError

        await logAuditAction({
            studioId,
            actorId: user.id,
            action: 'UPDATE_SERVICE',
            entityType: 'service',
            entityId: id,
            metadata: { name: formData.name }
        })

        if (formData.pricing) {
            const { assignedMemberships = [], assignedPackages = [] } = formData.pricing

            const [{ data: memberships }, { data: packages }] = await Promise.all([
                supabase.from('memberships').select('id, applicable_service_ids').eq('studio_id', studioId),
                supabase.from('packages').select('id, applicable_service_ids').eq('studio_id', studioId)
            ])

            const updates: any[] = []

            if (memberships) {
                memberships.forEach(m => {
                    const isAssigned = assignedMemberships.includes(m.id)
                    const currentIds = m.applicable_service_ids || []
                    const exists = currentIds.includes(id)
                    if (isAssigned && !exists) {
                        updates.push(supabase.from('memberships').update({ applicable_service_ids: [...currentIds, id] }).eq('id', m.id))
                    } else if (!isAssigned && exists) {
                        updates.push(supabase.from('memberships').update({ applicable_service_ids: currentIds.filter((sid: string) => sid !== id) }).eq('id', m.id))
                    }
                })
            }

            if (packages) {
                packages.forEach(p => {
                    const isAssigned = assignedPackages.includes(p.id)
                    const currentIds = p.applicable_service_ids || []
                    const exists = currentIds.includes(id)
                    if (isAssigned && !exists) {
                        updates.push(supabase.from('packages').update({ applicable_service_ids: [...currentIds, id] }).eq('id', p.id))
                    } else if (!isAssigned && exists) {
                        updates.push(supabase.from('packages').update({ applicable_service_ids: currentIds.filter((sid: string) => sid !== id) }).eq('id', p.id))
                    }
                })
            }

            if (updates.length > 0) await Promise.all(updates)
        }

        if (formData.pricing?.isDirectPayment && formData.pricing?.directPrice > 0) {
            await syncDirectPricePackage(supabase, studioId, id, formData.name, formData.pricing.directPrice)
        }

        revalidatePath('/studio/services')
        return { success: true }
    } catch (err: any) {
        console.error('[updateService] Error:', err)
        return { success: false, error: 'Failed to update service.' }
    }
}

export async function deleteService(id: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: service } = await supabase.from('services').select('studio_id, name').eq('id', id).single()
        if (!service) return { success: false, error: 'Service not found' }
        
        const { user, isOwner, permissions } = await verifyStudioAccess(service.studio_id)
        if (!isOwner && !permissions.manage_store) {
            return { success: false, error: 'Permission denied.' }
        }
        const studioId = service.studio_id

        // FIX PERF: Parallelize cleanup
        const [{ data: memberships }, { data: packages }] = await Promise.all([
            supabase.from('memberships').select('id, applicable_service_ids').eq('studio_id', studioId),
            supabase.from('packages').select('id, applicable_service_ids').eq('studio_id', studioId)
        ])

        const updates: any[] = []
        memberships?.forEach(m => {
            if (m.applicable_service_ids?.includes(id)) {
                updates.push(supabase.from('memberships').update({ applicable_service_ids: m.applicable_service_ids.filter((sid: string) => sid !== id) }).eq('id', m.id))
            }
        })
        packages?.forEach(p => {
            if (p.applicable_service_ids?.includes(id)) {
                updates.push(supabase.from('packages').update({ applicable_service_ids: p.applicable_service_ids.filter((sid: string) => sid !== id) }).eq('id', p.id))
            }
        })

        await Promise.all([
            ...updates,
            supabase.from('services').update({ is_deleted: true }).eq('id', id)
        ])
        
        await logAuditAction({
            studioId,
            actorId: user.id,
            action: 'SOFT_DELETE_SERVICE',
            entityType: 'service',
            entityId: id,
            metadata: { name: service.name }
        })

        revalidatePath('/studio/services')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: 'Failed to delete service.' }
    }
}

export async function updateCategory(id: string, name: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: cat } = await supabase.from('service_categories').select('studio_id').eq('id', id).single()
        if (!cat) return { success: false, error: 'Category not found' }
        
        // FIX BUG: Destructure user
        const { user } = await verifyStudioAccess(cat.studio_id)

        const { error } = await supabase.from('service_categories').update({ name }).eq('id', id)
        if (error) throw error
        
        await logAuditAction({
            studioId: cat.studio_id,
            actorId: user.id,
            action: 'UPDATE_CATEGORY',
            entityType: 'service_category',
            entityId: id,
            metadata: { name }
        })

        revalidatePath('/studio/services')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: 'Failed to update category.' }
    }
}

export async function deleteCategory(id: string): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: cat } = await supabase.from('service_categories').select('studio_id, name').eq('id', id).single()
        if (!cat) return { success: false, error: 'Category not found' }
        
        // FIX BUG: Destructure user
        const { user } = await verifyStudioAccess(cat.studio_id)

        const { error } = await supabase.from('service_categories').update({ is_deleted: true }).eq('id', id)
        if (error) throw error
        
        await logAuditAction({
            studioId: cat.studio_id,
            actorId: user.id,
            action: 'SOFT_DELETE_CATEGORY',
            entityType: 'service_category',
            entityId: id,
            metadata: { name: cat.name }
        })

        revalidatePath('/studio/services')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: 'Failed to delete category.' }
    }
}

export async function moveServiceToCategory(serviceId: string, categoryId: string | null): Promise<ActionResponse> {
    try {
        const supabase = await createClient()
        const { data: service } = await supabase.from('services').select('studio_id').eq('id', serviceId).single()
        if (!service) return { success: false, error: 'Service not found' }
        await verifyStudioAccess(service.studio_id)

        const { error } = await supabase.from('services').update({ category_id: categoryId }).eq('id', serviceId)
        if (error) throw error
        revalidatePath('/studio/services')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: 'Failed to move service.' }
    }
}

export async function reorderCategories(studioId: string, categoryIds: string[]): Promise<ActionResponse> {
    try {
        await verifyStudioAccess(studioId)
        const supabase = await createClient()
        const updates = categoryIds.map((id, index) => 
            supabase.from('service_categories').update({ display_order: index }).eq('id', id).eq('studio_id', studioId)
        )
        await Promise.all(updates)
        revalidatePath('/studio/services')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: 'Failed to reorder categories.' }
    }
}

export async function reorderServices(studioId: string, serviceIds: string[]): Promise<ActionResponse> {
    try {
        await verifyStudioAccess(studioId)
        const supabase = await createClient()
        const updates = serviceIds.map((id, index) => 
            supabase.from('services').update({ display_order: index }).eq('id', id).eq('studio_id', studioId)
        )
        await Promise.all(updates)
        revalidatePath('/studio/services')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: 'Failed to reorder services.' }
    }
}

export async function uploadServiceImage(formData: FormData) {
    try {
        const studioId = formData.get('studioId') as string
        if (!studioId) return { error: 'Studio ID is required' }

        await verifyStudioAccess(studioId)
        const file = formData.get('file') as File
        if (!file) return { error: 'File is required' }

        const adminSupabase = createAdminClient()
        const timestamp = Date.now()
        const ext = file.name.split('.').pop() || 'jpg'
        const cleanName = sanitizeFileName(file.name)
        const path = `studios/${studioId}/services/${timestamp}_${cleanName}`

        const { error: uploadErr } = await adminSupabase.storage.from('services').upload(path, file, {
            contentType: uploadContentType(file),
            upsert: true,
        })

        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = adminSupabase.storage.from('services').getPublicUrl(path)
        return { success: true, url: publicUrl }
    } catch (err: any) {
        return { error: `Upload failed: ${err.message}` }
    }
}
