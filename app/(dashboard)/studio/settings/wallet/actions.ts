'use server'

import { revalidatePath } from 'next/cache'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { WalletService } from '@/lib/services/wallet'
import { logAuditAction } from '@/lib/studio/audit'

interface ActionResponse {
    success: boolean
    error?: string
}

/**
 * Toggles the wallet feature for a studio.
 */
export async function toggleStudioWalletFeature(studioId: string, enabled: boolean): Promise<ActionResponse> {
    try {
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        if (!isOwner && !permissions.manage_store) {
            return { success: false, error: 'Permission denied.' }
        }

        await WalletService.toggleWalletFeature(studioId, enabled)

        revalidatePath('/studio/settings/wallet')
        revalidatePath('/studio/settings')
        return { success: true }
    } catch (err: any) {
        console.error('[toggleStudioWalletFeature] Action Error:', err)
        return { success: false, error: err.message || 'Failed to update setting' }
    }
}

/**
 * Adjusts a customer's studio-specific balance.
 */
export async function adjustStudioCustomerBalance(
    userId: string, 
    studioId: string, 
    amount: number, 
    type: 'add' | 'remove',
    reason: string
): Promise<ActionResponse> {
    try {
        const { user, isOwner, permissions } = await verifyStudioAccess(studioId)
        
        // Allow if owner OR has manage_customers (or a specific manage_finance if we had one)
        if (!isOwner && !permissions.manage_customers) {
            return { success: false, error: 'Permission denied.' }
        }

        await WalletService.adjustBalance({
            userId,
            studioId,
            amount,
            type,
            reason,
            actorId: user.id
        })

        // Audit Logging
        await logAuditAction({
            studioId,
            actorId: user.id,
            action: type === 'add' ? 'WALLET_CREDIT' : 'WALLET_DEBIT',
            entityType: 'customer',
            entityId: userId,
            metadata: { amount, reason, type }
        })

        revalidatePath(`/studio/customers/${userId}`)
        return { success: true }
    } catch (err: any) {
        console.error('[adjustStudioCustomerBalance] Action Error:', err)
        return { success: false, error: err.message || 'Failed to adjust balance' }
    }
}
