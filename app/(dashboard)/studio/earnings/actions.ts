'use server'

import { createClient } from '@/lib/supabase/server'
import { getManilaTodayStr } from '@/lib/timezone'
import { revalidatePath } from 'next/cache'

export async function getEarningsData(studioId: string, startDate?: string, endDate?: string) {
    const supabase = await createClient()

    try {
        const { data, error } = await supabase.rpc('get_studio_earnings_v2', {
            p_studio_id: studioId,
            p_start_date: startDate || null,
            p_end_date: endDate || null
        })

        if (error) {
            console.error('[getEarningsData] RPC error:', error)
            return { error: `Earnings data error: ${error.message}` }
        }

        // Parse numeric strings back to numbers if needed (though jsonb should handle it)
        const summary = data.summary
        if (summary) {
            summary.totalEarnings = Number(summary.totalEarnings || 0)
            summary.totalCompensation = Number(summary.totalCompensation || 0)
            summary.totalPenalty = Number(summary.totalPenalty || 0)
            summary.netEarnings = Number(summary.netEarnings || 0)
            summary.totalPaidOut = Number(summary.totalPaidOut || 0)
            summary.pendingPayouts = Number(summary.pendingPayouts || 0)
            summary.availableBalance = Number(summary.availableBalance || 0)
            summary.pendingBalance = Number(summary.pendingBalance || 0)
        }

        // Map RPC field names to what TransactionHistory component expects
        const mappedTransactions = (data.transactions || []).map((tx: any) => ({
            date: tx.tx_date || tx.date,
            booking_date: tx.tx_date || tx.date,
            type: tx.type,
            client: tx.client,
            instructor: tx.instructor,
            total_amount: Number(tx.amount ?? 0),
            details: tx.details,
            status: tx.status,
            session_date: tx.session_date,
            session_time: tx.session_time,
        }))

        return {
            bookings: data.bookings || [],
            payouts: data.payouts || [],
            transactions: mappedTransactions,
            summary: summary
        }
    } catch (err: any) {
        console.error('[getEarningsData] Global Crash:', err)
        return { error: `Critical system error: ${err.message || 'Unknown error'}` }
    }
}

export async function requestPayout(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const studioId = formData.get('studioId') as string
    const amount = parseFloat(formData.get('amount') as string)
    const paymentMethod = formData.get('paymentMethod') as string
    const accountName = formData.get('accountName') as string
    const accountNumber = formData.get('accountNumber') as string
    const bankName = formData.get('bankName') as string

    if (!studioId || !amount || !paymentMethod || !accountName || !accountNumber) {
        return { error: 'All fields are required' }
    }

    if (amount <= 0) {
        return { error: 'Invalid amount' }
    }

    // Check approval status and document expiry
    const { data: studio } = await supabase
        .from('studios')
        .select('payout_approval_status, bir_certificate_expiry, mayors_permit_expiry, payout_lock, owner_id')
        .eq('id', studioId).single()

    if (studio?.payout_approval_status !== 'approved') {
        return { error: 'Your payout application is pending or has not been approved yet.' }
    }

    if (studio?.payout_lock) {
        return { error: 'Withdrawals are currently locked for your studio.' }
    }

    const today = getManilaTodayStr()
    if ((studio?.bir_certificate_expiry && studio.bir_certificate_expiry < today)
        || (studio?.mayors_permit_expiry && studio.mayors_permit_expiry < today)) {
        return { error: 'One or more of your mandatory documents have expired.' }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // PERFORM ATOMIC DEDUCTION AND RECORD CREATION
    const { data: result, error: rpcError } = await supabase.rpc('request_payout_atomic_v2', {
        p_user_id: user.id,
        p_amount: amount,
        p_method: paymentMethod,
        p_account_name: accountName,
        p_account_number: accountNumber,
        p_bank_name: paymentMethod === 'bank_transfer' ? bankName : undefined,
        p_studio_id: studioId
    })

    if (rpcError || !result?.success) {
        return { error: rpcError?.message || result?.error || 'Failed to process payout request.' }
    }

    revalidatePath('/studio/earnings')
    return { success: true, message: 'Payout request submitted successfully!' }
}

export async function submitPayoutApplication(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const mayorsPermit = formData.get('mayorsPermit') as File
    const secretaryCertificate = formData.get('secretaryCertificate') as File
    const mayorsPermitExpiry = formData.get('mayorsPermitExpiry') as string

    if (!studioId || !mayorsPermit || !secretaryCertificate) {
        return { error: 'All documents are required.' }
    }

    const timestamp = Date.now()
    let permitPath = null
    let certPath = null

    // Upload Mayor's Permit
    if (mayorsPermit && mayorsPermit.size > 0) {
        const ext = mayorsPermit.name.split('.').pop()
        permitPath = `studios/${user.id}/mayors_permit_${timestamp}.${ext}`
        const { error: uploadError } = await supabase.storage.from('certifications').upload(permitPath, mayorsPermit)
        if (uploadError) {
            console.error('Mayors permit upload error:', uploadError)
            return { error: 'Failed to upload Mayor\'s Permit.' }
        }
    }

    // Upload Secretary's Certificate
    if (secretaryCertificate && secretaryCertificate.size > 0) {
        const ext = secretaryCertificate.name.split('.').pop()
        certPath = `studios/${user.id}/secretary_cert_${timestamp}.${ext}`
        const { error: uploadError } = await supabase.storage.from('certifications').upload(certPath, secretaryCertificate)
        if (uploadError) {
            console.error('Secretary certificate upload error:', uploadError)
            return { error: 'Failed to upload Secretary\'s Certificate.' }
        }
    }

    const { error: updateError } = await supabase
        .from('studios')
        .update({
            payout_approval_status: 'pending',
            mayors_permit_url: permitPath,
            secretary_certificate_url: certPath,
            mayors_permit_expiry: mayorsPermitExpiry
        })
        .eq('id', studioId)

    if (updateError) {
        console.error('Failed to update studio status:', updateError)
        return { error: 'Failed to submit application. Please try again later.' }
    }

    revalidatePath('/studio/earnings')
    return { success: true, message: 'Application submitted successfully! It is now pending admin approval.' }
}
