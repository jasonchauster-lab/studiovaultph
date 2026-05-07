import { createClient, createAdminClient } from '@/lib/supabase/server'

const XENDIT_API_URL = 'https://api.xendit.co'

export interface XenditInvoice {
    id: string
    external_id: string
    invoice_url: string
    status: 'PENDING' | 'PAID' | 'EXPIRED' | 'SETTLED'
    amount: number
    expiry_date: string
}

async function getXenditConfig(studioId: string) {
    const supabase = createAdminClient()
    
    // Get from secure configs
    const { data: secureConfig } = await supabase
        .from('studio_payment_configs')
        .select('xendit_api_key')
        .eq('id', studioId)
        .single()

    if (!secureConfig?.xendit_api_key) {
        throw new Error('Xendit API key not found for this studio. Please set it up in Payment Settings.')
    }

    return { apiKey: secureConfig.xendit_api_key }
}

export async function createXenditInvoice(params: {
    studioId: string
    externalId: string
    amount: number
    description: string
    payerEmail?: string
    successUrl: string
    failureUrl: string
}): Promise<XenditInvoice> {
    const { apiKey } = await getXenditConfig(params.studioId)
    
    // Xendit uses Basic Auth with the API key as the username and an empty password
    const authHeader = Buffer.from(`${apiKey}:`).toString('base64')

    const response = await fetch(`${XENDIT_API_URL}/v2/invoices`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            external_id: params.externalId,
            amount: params.amount,
            description: params.description,
            payer_email: params.payerEmail,
            should_send_email: true,
            success_redirect_url: params.successUrl,
            failure_redirect_url: params.failureUrl,
            currency: 'PHP',
            invoice_duration: 3600 // 1 hour
        })
    })

    if (!response.ok) {
        const error = await response.json()
        console.error('[Xendit] Create Invoice Error:', error)
        throw new Error(error.message || 'Failed to create Xendit invoice.')
    }

    return response.json()
}

export async function getXenditInvoice(studioId: string, invoiceId: string): Promise<XenditInvoice> {
    const { apiKey } = await getXenditConfig(studioId)
    const authHeader = Buffer.from(`${apiKey}:`).toString('base64')

    const response = await fetch(`${XENDIT_API_URL}/v2/invoices/${invoiceId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Basic ${authHeader}`
        }
    })

    if (!response.ok) {
        throw new Error('Failed to fetch Xendit invoice status.')
    }

    return response.json()
}

export async function createXenditRefund(params: {
    studioId: string
    paymentId: string // This is the Xendit payment ID or invoice ID
    amount: number
    reason: string
}) {
    const { apiKey } = await getXenditConfig(params.studioId)
    const authHeader = Buffer.from(`${apiKey}:`).toString('base64')

    // Xendit Refunds V2 API
    // Note: Refunds are handled via /v2/refunds or channel-specific endpoints
    // For Invoices, we typically refund the specific transaction
    const response = await fetch(`${XENDIT_API_URL}/refunds`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            invoice_id: params.paymentId,
            amount: params.amount,
            reason: params.reason
        })
    })

    if (!response.ok) {
        const error = await response.json()
        console.error('[Xendit] Refund Error:', error)
        
        // Handle specific permission errors
        if (response.status === 403 || error.error_code === 'PERMISSION_DENIED_ERROR') {
            throw new Error('REFUND_PERMISSION_DENIED')
        }
        
        throw new Error(error.message || 'Failed to process refund through Xendit.')
    }

    return response.json()
}
