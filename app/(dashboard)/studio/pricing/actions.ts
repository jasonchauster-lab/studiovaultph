'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { logAuditAction } from '@/lib/studio/audit'
import { PricingService } from '@/lib/services/pricing'
import { ErrorService } from '@/lib/services/error-service'

export interface ActionResponse<T = any> {
    success: boolean
    error?: string
    data?: T
}

export async function createMembership(formData: any): Promise<ActionResponse> {
    try {
        const studioId = formData.studioId
        if (!studioId) return { success: false, error: 'Studio ID is required' }

        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_store) {
            return { success: false, error: 'Permission denied.' }
        }

        await PricingService.createMembership(studioId, formData)

        revalidatePath('/studio/pricing')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('PricingActions', 'createMembership', err, { formData })
        if (err.code === '23505') return { success: false, error: 'A membership with this name already exists.' }
        return { success: false, error: 'Failed to create membership.' }
    }
}

export async function updateMembership(id: string, studioId: string, formData: any): Promise<ActionResponse> {
    try {
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_store) return { success: false, error: 'Permission denied.' }

        await PricingService.updateMembership(id, studioId, formData)

        revalidatePath('/studio/pricing')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('PricingActions', 'updateMembership', err, { id, studioId, formData })
        return { success: false, error: 'Failed to update membership.' }
    }
}

export async function deleteMembership(id: string, studioId?: string, name?: string): Promise<ActionResponse> {
    try {
        let finalStudioId = studioId
        let finalName = name

        if (!finalStudioId || !finalName) {
            const supabase = await createClient()
            const { data: membership } = await supabase.from('memberships').select('studio_id, name').eq('id', id).single()
            if (!membership) return { success: false, error: 'Membership not found' }
            finalStudioId = membership.studio_id
            finalName = membership.name
        }

        if (!finalStudioId) return { success: false, error: 'Studio ID is required' }

        const { user, isOwner, permissions } = await verifyStudioAccess(finalStudioId)
        if (!isOwner && !permissions.manage_store) {
            return { success: false, error: 'Permission denied.' }
        }

        const deletedName = `${finalName} (Deleted ${Date.now()})`
        await PricingService.softDeleteMembership(id, finalStudioId, deletedName)

        await logAuditAction({
            studioId: finalStudioId,
            actorId: user.id,
            action: 'SOFT_DELETE_MEMBERSHIP',
            entityType: 'membership',
            entityId: id,
            metadata: { original_name: finalName }
        })

        revalidatePath('/studio/pricing')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('PricingActions', 'deleteMembership', err, { id, studioId })
        return { success: false, error: 'Failed to delete membership.' }
    }
}

export async function createPackage(formData: any): Promise<ActionResponse> {
    try {
        const studioId = formData.studioId
        if (!studioId) return { success: false, error: 'Studio ID is required' }
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_store) return { success: false, error: 'Permission denied.' }

        let validityDays = 30
        const val = parseInt(formData.validity_value || '1')
        if (formData.validity_unit === 'days') validityDays = val
        if (formData.validity_unit === 'weeks') validityDays = val * 7
        if (formData.validity_unit === 'months') validityDays = val * 30

        await PricingService.createPackage(studioId, {
            ...formData,
            validityDays,
            validityValue: val,
            validityUnit: formData.validity_unit || 'months'
        })

        revalidatePath('/studio/pricing')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('PricingActions', 'createPackage', err, { formData })
        if (err.code === '23505') return { success: false, error: 'A package with this name already exists.' }
        return { success: false, error: 'Failed to create package.' }
    }
}

export async function updatePackage(id: string, studioId: string, formData: any): Promise<ActionResponse> {
    try {
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_store) return { success: false, error: 'Permission denied.' }

        let validityDays = 30
        const val = parseInt(formData.validity_value || '1')
        if (formData.validity_unit === 'days') validityDays = val
        if (formData.validity_unit === 'weeks') validityDays = val * 7
        if (formData.validity_unit === 'months') validityDays = val * 30

        await PricingService.updatePackage(id, studioId, {
            ...formData,
            validityDays,
            validityValue: val,
            validityUnit: formData.validity_unit || 'months'
        })

        revalidatePath('/studio/pricing')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('PricingActions', 'updatePackage', err, { id, studioId, formData })
        return { success: false, error: 'Failed to update package.' }
    }
}

export async function deletePackage(id: string, studioId?: string, name?: string): Promise<ActionResponse> {
    try {
        let finalStudioId = studioId
        let finalName = name

        if (!finalStudioId || !finalName) {
            const supabase = await createClient()
            const { data: pkg } = await supabase.from('packages').select('studio_id, name').eq('id', id).single()
            if (!pkg) return { success: false, error: 'Package not found' }
            finalStudioId = pkg.studio_id
            finalName = pkg.name
        }

        if (!finalStudioId) return { success: false, error: 'Studio ID is required' }

        const { user, isOwner, permissions } = await verifyStudioAccess(finalStudioId)
        if (!isOwner && !permissions.manage_store) {
            return { success: false, error: 'Permission denied.' }
        }

        const deletedName = `${finalName} (Deleted ${Date.now()})`
        await PricingService.softDeletePackage(id, finalStudioId, deletedName)

        await logAuditAction({
            studioId: finalStudioId,
            actorId: user.id,
            action: 'SOFT_DELETE_PACKAGE',
            entityType: 'package',
            entityId: id,
            metadata: { original_name: finalName }
        })

        revalidatePath('/studio/pricing')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('PricingActions', 'deletePackage', err, { id, studioId })
        return { success: false, error: 'Failed to delete package.' }
    }
}

export async function createCategory(studioId: string, name: string, type: 'membership' | 'package'): Promise<ActionResponse> {
    try {
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_store) return { success: false, error: 'Permission denied.' }

        const data = await PricingService.createCategory(studioId, name, type)

        revalidatePath('/studio/pricing')
        return { success: true, data }
    } catch (err: any) {
        await ErrorService.logServiceError('PricingActions', 'createCategory', err, { studioId, name, type })
        return { success: false, error: 'Failed to create category.' }
    }
}

export async function updateCategory(id: string, studioId: string, name: string): Promise<ActionResponse> {
    try {
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_store) return { success: false, error: 'Permission denied.' }

        await PricingService.updateCategory(id, studioId, name)

        revalidatePath('/studio/pricing')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('PricingActions', 'updateCategory', err, { id, studioId, name })
        return { success: false, error: 'Failed to update category.' }
    }
}

export async function deleteCategory(id: string, studioId: string): Promise<ActionResponse> {
    try {
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_store) return { success: false, error: 'Permission denied.' }

        await PricingService.softDeleteCategory(id, studioId)

        revalidatePath('/studio/pricing')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('PricingActions', 'deleteCategory', err, { id, studioId })
        return { success: false, error: 'Failed to delete category.' }
    }
}

export async function reorderCategories(studioId: string, categoryIds: string[]): Promise<ActionResponse> {
    try {
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_store) {
            return { success: false, error: 'Permission denied.' }
        }

        await PricingService.reorderCategories(studioId, categoryIds)

        revalidatePath('/studio/pricing')
        return { success: true }
    } catch (err: any) {
        await ErrorService.logServiceError('PricingActions', 'reorderCategories', err, { studioId, categoryIds })
        return { success: false, error: 'Failed to reorder categories.' }
    }
}
