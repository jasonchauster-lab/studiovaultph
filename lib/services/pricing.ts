import { createClient } from '@/lib/supabase/server'
import { Membership, Package, Service, ServiceCategory, Outlet } from '@/types/agency'
import { ErrorService } from '@/lib/services/error-service'

export class PricingService {
    /**
     * Fetches all pricing-related data for a given studio.
     */
    static async getPricingData(studioId: string) {
        const supabase = await createClient()
        
        const [
            { data: memberships, error: mErr }, 
            { data: packages, error: pErr }, 
            { data: services, error: sErr }, 
            { data: categories, error: cErr },
            { data: outlets, error: oErr }
        ] = await Promise.all([
            supabase.from('memberships').select('*').eq('studio_id', studioId).eq('is_deleted', false).order('price', { ascending: true }),
            supabase.from('packages').select('*').eq('studio_id', studioId).eq('is_deleted', false).order('price', { ascending: true }),
            supabase.from('services').select('*').eq('studio_id', studioId).eq('is_deleted', false).order('name', { ascending: true }),
            supabase.from('service_categories').select('*').eq('studio_id', studioId).eq('is_deleted', false).order('display_order', { ascending: true }),
            supabase.from('outlets').select('*').eq('studio_id', studioId).eq('is_active', true).order('name', { ascending: true })
        ])

        if (mErr || pErr || sErr || cErr || oErr) {
            await ErrorService.logServiceError('PricingService', 'getPricingData', mErr || pErr || sErr || cErr || oErr, { studioId })
            throw new Error('Failed to fetch pricing data.')
        }

        return {
            memberships: (memberships as Membership[]) || [],
            packages: (packages as Package[]) || [],
            services: (services as Service[]) || [],
            categories: (categories as ServiceCategory[]) || [],
            outlets: (outlets as Outlet[]) || []
        }
    }

    /**
     * Soft deletes a membership and logs the action via the caller if needed.
     */
    static async softDeleteMembership(id: string, studioId: string, deletedName: string) {
        const supabase = await createClient()
        const { error } = await supabase.from('memberships')
            .update({ 
                is_deleted: true,
                name: deletedName 
            })
            .eq('id', id)
            .eq('studio_id', studioId)
        
        if (error) {
            await ErrorService.logServiceError('PricingService', 'softDeleteMembership', error, { id, studioId })
            throw error
        }
    }

    /**
     * Soft deletes a package.
     */
    static async softDeletePackage(id: string, studioId: string, deletedName: string) {
        const supabase = await createClient()
        const { error } = await supabase.from('packages')
            .update({ 
                is_deleted: true, 
                name: deletedName
            })
            .eq('id', id)
            .eq('studio_id', studioId)
        
        if (error) {
            await ErrorService.logServiceError('PricingService', 'softDeletePackage', error, { id, studioId })
            throw error
        }
    }

    /**
     * Creates a new membership.
     */
    static async createMembership(studioId: string, data: any) {
        const supabase = await createClient()
        const { error } = await supabase.from('memberships').insert({
            studio_id: studioId,
            name: data.name,
            description: data.description,
            category: data.category,
            category_id: data.category_id || null,
            price: parseFloat(data.price || '0'),
            credits: data.credits ? parseInt(data.credits) : null,
            validity_days: parseInt(data.validity_days || '30'),
            is_private: !!data.is_private,
            features: data.features || [],
            applicable_service_ids: data.applicable_service_ids || [],
            applicable_outlet_ids: (data.applicable_outlet_ids && data.applicable_outlet_ids.length > 0) ? data.applicable_outlet_ids : null
        })

        if (error) {
            await ErrorService.logServiceError('PricingService', 'createMembership', error, { studioId, data })
            throw error
        }
    }

    /**
     * Updates an existing membership.
     */
    static async updateMembership(id: string, studioId: string, data: any) {
        const supabase = await createClient()
        const { error } = await supabase.from('memberships').update({
            name: data.name,
            description: data.description,
            category: data.category,
            category_id: data.category_id || null,
            price: parseFloat(data.price || '0'),
            credits: data.credits ? parseInt(data.credits) : null,
            validity_days: parseInt(data.validity_days || '30'),
            is_private: !!data.is_private,
            features: data.features || [],
            applicable_service_ids: data.applicable_service_ids || [],
            applicable_outlet_ids: (data.applicable_outlet_ids && data.applicable_outlet_ids.length > 0) ? data.applicable_outlet_ids : null
        }).eq('id', id).eq('studio_id', studioId)

        if (error) {
            await ErrorService.logServiceError('PricingService', 'updateMembership', error, { id, studioId, data })
            throw error
        }
    }

    /**
     * Creates a new package.
     */
    static async createPackage(studioId: string, data: any) {
        const supabase = await createClient()
        const { error } = await supabase.from('packages').insert({
            studio_id: studioId,
            name: data.name,
            description: data.description,
            category: data.category || 'Package',
            category_id: data.category_id || null,
            price: parseFloat(data.price || '0'),
            credits: parseInt(data.credits || '1'),
            validity_days: data.validityDays,
            validity_value: data.validityValue,
            validity_unit: data.validity_unit || 'months',
            is_private: !!data.is_private,
            applicable_service_ids: data.applicable_service_ids || [],
            location_access_type: data.location_access_type || 'admin_selected',
            applicable_outlet_ids: (data.applicable_outlet_ids && data.applicable_outlet_ids.length > 0) ? data.applicable_outlet_ids : null,
            purchase_limit: data.purchase_limit ? parseInt(data.purchase_limit) : null,
            restriction_type: data.restriction_type || 'all',
            booking_per_class_limit: data.booking_per_class_limit ? parseInt(data.booking_per_class_limit) : null,
            display_type: data.display_type || 'auto',
            activation_type: data.activation_type || 'purchase',
            grace_period_value: data.grace_period_value ? parseInt(data.grace_period_value) : null,
            grace_period_unit: data.grace_period_unit || 'weeks'
        })

        if (error) {
            await ErrorService.logServiceError('PricingService', 'createPackage', error, { studioId, data })
            throw error
        }
    }

    /**
     * Updates an existing package.
     */
    static async updatePackage(id: string, studioId: string, data: any) {
        const supabase = await createClient()
        const { error } = await supabase.from('packages').update({
            name: data.name,
            description: data.description,
            category: data.category || 'Package',
            category_id: data.category_id || null,
            price: parseFloat(data.price || '0'),
            credits: parseInt(data.credits || '1'),
            validity_days: data.validityDays,
            validity_value: data.validityValue,
            validity_unit: data.validityUnit || data.validity_unit || 'months',
            is_private: !!data.is_private,
            applicable_service_ids: data.applicable_service_ids || [],
            location_access_type: data.location_access_type || 'admin_selected',
            applicable_outlet_ids: (data.applicable_outlet_ids && data.applicable_outlet_ids.length > 0) ? data.applicable_outlet_ids : null,
            purchase_limit: data.purchase_limit ? parseInt(data.purchase_limit) : null,
            restriction_type: data.restriction_type || 'all',
            booking_per_class_limit: data.booking_per_class_limit ? parseInt(data.booking_per_class_limit) : null,
            display_type: data.display_type || 'auto',
            activation_type: data.activation_type || 'purchase',
            grace_period_value: data.grace_period_value ? parseInt(data.grace_period_value) : null,
            grace_period_unit: data.grace_period_unit || 'weeks'
        }).eq('id', id).eq('studio_id', studioId)

        if (error) {
            await ErrorService.logServiceError('PricingService', 'updatePackage', error, { id, studioId, data })
            throw error
        }
    }

    /**
     * Creates a new category.
     */
    static async createCategory(studioId: string, name: string, type: 'membership' | 'package') {
        const supabase = await createClient()
        const { data, error } = await supabase.from('service_categories').insert({
            studio_id: studioId,
            name,
            type,
            is_deleted: false
        }).select().single()

        if (error) {
            await ErrorService.logServiceError('PricingService', 'createCategory', error, { studioId, name, type })
            throw error
        }
        return data as ServiceCategory
    }

    /**
     * Updates a category name.
     */
    static async updateCategory(id: string, studioId: string, name: string) {
        const supabase = await createClient()
        
        // 1. Update the category itself
        const { error } = await supabase.from('service_categories')
            .update({ name })
            .eq('id', id)
            .eq('studio_id', studioId)
        
        if (error) {
            await ErrorService.logServiceError('PricingService', 'updateCategory', error, { id, studioId, name })
            throw error
        }

        // 2. CASCADING UPDATE: Sync denormalized category name in memberships/packages
        // This ensures UI consistency without complex joins
        await Promise.all([
            supabase.from('memberships')
                .update({ category: name })
                .eq('category_id', id)
                .eq('studio_id', studioId),
            supabase.from('packages')
                .update({ category: name })
                .eq('category_id', id)
                .eq('studio_id', studioId)
        ])
    }

    /**
     * Soft deletes a category and atomically resets all associated items to "General".
     */
    static async softDeleteCategory(id: string, studioId: string) {
        const supabase = await createClient()
        
        // 1. Soft delete the category
        const { error: catError } = await supabase.from('service_categories')
            .update({ is_deleted: true })
            .eq('id', id)
            .eq('studio_id', studioId)

        if (catError) {
            await ErrorService.logServiceError('PricingService', 'softDeleteCategory', catError, { id, studioId })
            throw catError
        }

        // 2. RELATIONAL HARDENING: Reset all memberships/packages to "General" category
        // This prevents "Ghost Categories" and UI orphans.
        await Promise.all([
            supabase.from('memberships')
                .update({ 
                    category: 'General',
                    category_id: null 
                })
                .eq('category_id', id)
                .eq('studio_id', studioId),
            supabase.from('packages')
                .update({ 
                    category: 'General',
                    category_id: null 
                })
                .eq('category_id', id)
                .eq('studio_id', studioId)
        ])
    }

    /**
     * Atomic reordering of categories via RPC.
     */
    static async reorderCategories(studioId: string, categoryIds: string[]) {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('reorder_categories_v2', {
            p_studio_id: studioId,
            p_category_ids: categoryIds
        })

        if (error || !data?.success) {
            await ErrorService.logServiceError('PricingService', 'reorderCategories', error || data?.error, { studioId, categoryIds })
            throw error || new Error(data?.error || 'Failed to reorder categories.')
        }
    }
}
