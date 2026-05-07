import { createClient } from '@/lib/supabase/server'
import { ErrorService } from '@/lib/services/error-service'

export class WalletService {
    /**
     * Toggles the wallet feature for a studio by updating its website_config.
     */
    static async toggleWalletFeature(studioId: string, enabled: boolean) {
        const supabase = await createClient()
        
        // 1. Fetch current config
        const { data: studio, error: fetchError } = await supabase
            .from('studios')
            .select('website_config')
            .eq('id', studioId)
            .single()

        if (fetchError || !studio) {
            await ErrorService.logServiceError('WalletService', 'toggleWalletFeature', fetchError || 'Studio not found', { studioId })
            throw new Error('Studio not found.')
        }

        const config = studio.website_config || {}
        const features = config.features || {}
        
        const updatedConfig = {
            ...config,
            features: {
                ...features,
                wallet_enabled: enabled
            }
        }

        const { error: updateError } = await supabase
            .from('studios')
            .update({ website_config: updatedConfig })
            .eq('id', studioId)

        if (updateError) {
            await ErrorService.logServiceError('WalletService', 'toggleWalletFeature', updateError, { studioId, enabled })
            throw new Error('Failed to update wallet setting.')
        }
    }

    /**
     * Adjusts a customer's studio-specific balance and logs a transaction.
     */
    static async adjustBalance(params: {
        userId: string
        studioId: string
        amount: number
        type: 'add' | 'remove'
        reason: string
        actorId: string // The admin/staff performing the action
    }) {
        const { userId, studioId, amount, type, reason, actorId } = params
        const supabase = await createClient()

        // 1. Atomic balance update and transaction logging via unified RPC
        const { error } = await supabase.rpc('adjust_studio_wallet_balance', {
            p_user_id: userId,
            p_studio_id: studioId,
            p_amount: Math.abs(amount),
            p_type: type,
            p_description: reason || (type === 'add' ? 'Manual credit' : 'Manual deduction'),
            p_actor_id: actorId
        })

        if (error) {
            await ErrorService.logServiceError('WalletService', 'adjustBalance', error, params)
            throw new Error('Failed to adjust balance. Atomic operation aborted.')
        }
    }

    /**
     * Fetches transaction history for a customer at a specific studio.
     */
    static async getTransactionHistory(userId: string, studioId: string) {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('studio_wallet_transactions')
            .select('*')
            .eq('user_id', userId)
            .eq('studio_id', studioId)
            .order('created_at', { ascending: false })

        if (error) {
            await ErrorService.logServiceError('WalletService', 'getTransactionHistory', error, { userId, studioId })
            throw new Error('Failed to fetch transaction history.')
        }

        return data
    }
}
