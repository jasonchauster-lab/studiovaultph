import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logAuditAction } from '@/lib/studio/audit'

/**
 * Wallet Reconciliation Cron
 * Compares profiles.wallet_balance against the sum of wallet_transactions.
 * Flags discrepancies in the audit log.
 */
export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization')
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    const supabase = createAdminClient()
    
    // 1. Fetch all profiles with a non-zero balance
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, wallet_balance, full_name')
        .gt('wallet_balance', 0)

    if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const discrepancies = []
    const profileIds = profiles.map(p => p.id)

    // 2. Fetch ALL transactions for these profiles in a single batch
    // This resolves the N+1 bottleneck.
    const { data: allTxs, error: txError } = await supabase
        .from('wallet_transactions')
        .select('profile_id, amount, type')
        .in('profile_id', profileIds)

    if (txError) {
        return NextResponse.json({ error: txError.message }, { status: 500 })
    }

    // 3. Group and sum transactions in memory
    const calculatedBalances: Record<string, number> = {}
    allTxs?.forEach(tx => {
        const amount = Number(tx.amount)
        const current = calculatedBalances[tx.profile_id] || 0
        calculatedBalances[tx.profile_id] = tx.type === 'deposit' || tx.type === 'refund' 
            ? current + amount 
            : current - amount
    })

    // 4. Compare and flag discrepancies
    for (const profile of profiles) {
        const calculatedBalance = calculatedBalances[profile.id] || 0
        
        if (Math.abs(calculatedBalance - profile.wallet_balance) > 0.01) {
            discrepancies.push({
                profileId: profile.id,
                name: profile.full_name,
                stored: profile.wallet_balance,
                calculated: calculatedBalance
            })

            console.error(`[Wallet Reconciliation] Discrepancy found for ${profile.full_name} (${profile.id}): Stored=${profile.wallet_balance}, Calculated=${calculatedBalance}`)
        }
    }

    return NextResponse.json({ 
        processed: profiles.length,
        discrepanciesFound: discrepancies.length,
        details: discrepancies
    })
}
