'use server'

import { InventoryService } from '@/lib/services/inventory'
import { ErrorService } from '@/lib/services/error-service'

export async function getInventory(studioId: string) {
    return InventoryService.getInventory(studioId)
}

export async function upsertInventoryItem(data: any) {
    try {
        const { studio_id, ...itemData } = data
        return await InventoryService.upsertItem(studio_id, itemData)
    } catch (err: any) {
        await ErrorService.logServiceError('InventoryActions', 'upsertInventoryItem', err, { data })
        return { error: err.message }
    }
}

export async function deleteInventoryItem(studioId: string, itemId: string) {
    try {
        return await InventoryService.deleteItem(studioId, itemId)
    } catch (err: any) {
        await ErrorService.logServiceError('InventoryActions', 'deleteInventoryItem', err, { studioId, itemId })
        return { error: err.message }
    }
}
