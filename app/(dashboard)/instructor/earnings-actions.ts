'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getInstructorEarnings(startDate?: string, endDate?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { data, error } = await supabase.rpc('get_instructor_earnings_v3', {
        p_instructor_id: user.id,
        p_start_date: startDate || null,
        p_end_date: endDate || null
    })

    if (error) {
        console.error('Error fetching instructor earnings via RPC:', error)
        return { error: `Earnings Fetch Error: ${error.message}` }
    }

    return {
        ...data,
        totalEarned: Number(data.totalEarned || 0),
        totalWithdrawn: Number(data.totalWithdrawn || 0),
        pendingPayouts: Number(data.pendingPayouts || 0),
        availableBalance: Number(data.availableBalance || 0),
        pendingBalance: Number(data.pendingBalance || 0),
        totalCompensation: Number(data.totalCompensation || 0),
        totalPenalty: Number(data.totalPenalty || 0),
        netEarnings: Number(data.netEarnings || 0),
        recentTransactions: (data.recentTransactions || []).map((tx: any) => ({
            date: tx.tx_date || tx.date,
            type: tx.type,
            client: tx.client,
            total_amount: Number(tx.amount ?? tx.total_amount ?? 0),
            details: tx.details,
            status: tx.status,
            session_date: tx.session_date,
            session_time: tx.session_time,
        })),
        payouts: data.payouts || []
    };
}

export async function requestPayout(amount: number, method: string, details: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { availableBalance, error: balanceError } = await getInstructorEarnings();

    if (balanceError || availableBalance === undefined) {
        return { error: 'Failed to verify balance.' }
    }

    if (availableBalance < 0) {
        return { error: 'Your account carries a negative balance. Payouts are restricted until the debt is settled.' }
    }

    if (amount <= 0) {
        return { error: 'Invalid amount.' }
    }

    if (amount > availableBalance) {
        return { error: `Insufficient funds. Available: ₱${availableBalance}` }
    }

    const { data: result, error: rpcError } = await supabase.rpc('request_payout_atomic_v2', {
        p_user_id: user.id,
        p_amount: amount,
        p_method: method,
        p_account_name: details.accountName,
        p_account_number: details.accountNumber,
        p_bank_name: method === 'bank' ? details.bankName : undefined,
        p_studio_id: null
    });

    if (rpcError || !result?.success) {
        console.error('Payout RPC error:', rpcError || result?.error);
        return { error: rpcError?.message || result?.error || 'Failed to process payout request.' };
    }

    revalidatePath('/instructor/earnings')
    revalidatePath('/instructor/payout')
    return { success: true }
}

export async function getPayoutHistory() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const { data: payouts, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching payout history:', error);
        return { error: 'Failed to fetch history' }
    }

    return { payouts }
}
