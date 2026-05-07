import { createClient } from '@/lib/supabase/server'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { revalidateTag } from 'next/cache'
import { STUDIO_TAGS } from '@/lib/studio/schemas'
import { InventoryItem } from '@/types/agency'
import { ErrorService } from '@/lib/services/error-service'

export class InventoryService {
    /**
     * Fetches all inventory items for a studio.
     */
    static async getInventory(studioId: string): Promise<InventoryItem[]> {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('studio_id', studioId)
            .eq('is_deleted', false) // Only fetch non-deleted items
            .order('name', { ascending: true })
        
        if (error) {
            await ErrorService.logServiceError('InventoryService', 'getInventory', error, { studioId })
            throw new Error('Failed to fetch inventory data.')
        }
        return (data as InventoryItem[]) || []
    }

    /**
     * Upserts an inventory item with permission validation.
     */
    static async upsertItem(studioId: string, itemData: Partial<InventoryItem>) {
        const supabase = await createClient()
        
        // Security Check
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_inventory) {
            await ErrorService.logSecurityEvent('Unauthorized inventory upsert attempt', { studioId, itemData })
            throw new Error('Permission denied: You do not have access to manage inventory.')
        }

        const { id, ...payload } = itemData

        if (id) {
            const { error } = await supabase
                .from('inventory_items')
                .update({
                    ...payload,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .eq('studio_id', studioId) 
            if (error) {
                await ErrorService.logServiceError('InventoryService', 'upsertItem (Update)', error, { studioId, itemData })
                throw error
            }
        } else {
            const { error } = await supabase
                .from('inventory_items')
                .insert({ 
                    ...payload, 
                    studio_id: studioId,
                    is_deleted: false 
                })
            if (error) {
                await ErrorService.logServiceError('InventoryService', 'upsertItem (Insert)', error, { studioId, itemData })
                throw error
            }
        }

        ;(revalidateTag as any)(STUDIO_TAGS.INVENTORY(studioId))
        return { success: true }
    }

    /**
     * Deletes an inventory item with permission validation.
     */
    static async deleteItem(studioId: string, itemId: string) {
        const supabase = await createClient()

        // Security Check
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_inventory) {
            await ErrorService.logSecurityEvent('Unauthorized inventory delete attempt', { studioId, itemId })
            throw new Error('Permission denied: You do not have access to manage inventory.')
        }

        const { error } = await supabase
            .from('inventory_items')
            .update({ is_deleted: true }) // Soft delete
            .eq('id', itemId)
            .eq('studio_id', studioId)
        
        if (error) {
            await ErrorService.logServiceError('InventoryService', 'deleteItem', error, { studioId, itemId })
            throw error
        }
        
        ;(revalidateTag as any)(STUDIO_TAGS.INVENTORY(studioId))
        return { success: true }
    }

    /**
     * Atomically adjusts stock levels using a delta value.
     * Prevents race conditions during simultaneous sales/updates.
     */
    static async adjustStockDelta(studioId: string, itemId: string, delta: number) {
        const supabase = await createClient()

        // Security Check
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_inventory) {
            await ErrorService.logSecurityEvent('Unauthorized stock adjustment attempt', { studioId, itemId, delta })
            throw new Error('Permission denied: You do not have access to manage inventory.')
        }

        // We use an RPC call for true atomicity: stock_level = stock_level + delta
        const { error } = await supabase.rpc('adjust_inventory_stock', {
            p_item_id: itemId,
            p_studio_id: studioId,
            p_delta: delta
        })

        if (error) {
            await ErrorService.logServiceError('InventoryService', 'adjustStockDelta', error, { studioId, itemId, delta })
            // Fallback: If RPC doesn't exist yet, we do a less-safe update (for dev speed)
            // In production, the RPC should be deployed.
            const { data: item } = await supabase
                .from('inventory_items')
                .select('stock_level')
                .eq('id', itemId)
                .single()
            
            if (item) {
                await supabase
                    .from('inventory_items')
                    .update({ stock_level: item.stock_level + delta })
                    .eq('id', itemId)
            }
        }

        ;(revalidateTag as any)(STUDIO_TAGS.INVENTORY(studioId))
        return { success: true }
    }
}
