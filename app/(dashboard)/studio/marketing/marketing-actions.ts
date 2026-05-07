'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { sendEmail } from '@/lib/email'
import { sanitizeHtml } from '@/lib/utils/security'
import React from 'react'

/**
 * Sends a marketing campaign to a segment of customers
 */
export async function sendMarketingCampaignAction(payload: {
    studioId: string
    title: string
    subject: string
    content: string
    segment: 'all' | 'new' | 'inactive'
}) {
    const { studioId, title, subject, content, segment } = payload
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // 1. Security Check
    const { isOwner, permissions } = await verifyStudioAccess(studioId)
    if (!isOwner && !permissions?.manage_marketing) {
        return { error: 'Permission denied: manage_marketing required' }
    }

    // 2. Check Quota
    const { data: studio, error: studioError } = await supabase
        .from('studios')
        .select('name, subscription_tier, monthly_marketing_sent, marketing_limit_reset_at')
        .eq('id', studioId)
        .single()

    if (studioError || !studio) return { error: 'Studio not found' }

    const tier = studio.subscription_tier || 'starter'
    const limits: Record<string, number> = {
        'starter': 0,
        'team': 2000,
        'pro': 2000, // Syncing with user request names
        'premium': 5000,
        'business': 5000
    }

    const maxEmails = limits[tier] || 0
    if (maxEmails === 0) {
        return { error: 'Marketing emails are not available on the Starter plan. Please upgrade to Team.' }
    }

    // Reset quota if month has passed
    const now = new Date()
    const resetDate = new Date(studio.marketing_limit_reset_at)
    let currentSent = studio.monthly_marketing_sent

    if (now > resetDate) {
        currentSent = 0
        const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
        await supabase
            .from('studios')
            .update({ 
                monthly_marketing_sent: 0, 
                marketing_limit_reset_at: nextReset.toISOString() 
            })
            .eq('id', studioId)
    }

    // 3. Fetch Recipients based on Segment
    const adminSupabase = createAdminClient()
    let query = adminSupabase
        .from('studio_customers')
        .select(`
            profile_id,
            marketing_opt_in,
            profiles:profile_id (email, full_name)
        `)
        .eq('studio_id', studioId)
        .eq('marketing_opt_in', true)

    if (segment === 'new') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        query = query.gte('created_at', thirtyDaysAgo)
    }

    const { data: recipients, error: recpError } = await query
    if (recpError) return { error: 'Failed to fetch recipients' }

    const validRecipients = (recipients || [])
        .map((r: any) => r.profiles)
        .filter((p: any) => p && p.email)

    if (validRecipients.length === 0) {
        return { error: 'No eligible recipients found for this segment.' }
    }

    if (currentSent + validRecipients.length > maxEmails) {
        return { error: `Quota exceeded. You have ${maxEmails - currentSent} emails left this month, but this campaign targets ${validRecipients.length} customers.` }
    }

    // 4. Batch Sending (Chunk size of 50)
    const CHUNK_SIZE = 50
    let successCount = 0
    let failCount = 0

    // Sanitize content before sending to prevent Stored XSS
    const sanitizedHtmlContent = sanitizeHtml(content.replace(/\n/g, '<br/>'))

    for (let i = 0; i < validRecipients.length; i += CHUNK_SIZE) {
        const chunk = validRecipients.slice(i, i + CHUNK_SIZE)
        
        await Promise.all(chunk.map(async (recipient) => {
            const res = await sendEmail({
                to: recipient.email,
                subject: subject,
                react: React.createElement('div', { 
                    style: { fontFamily: 'sans-serif', padding: '20px', color: '#333' } 
                }, [
                    React.createElement('h1', { key: 'h1' }, `Hi ${recipient.full_name},`),
                    React.createElement('div', { 
                        key: 'content',
                        dangerouslySetInnerHTML: { __html: sanitizedHtmlContent } 
                    }),
                    React.createElement('hr', { key: 'hr', style: { margin: '20px 0' } }),
                    React.createElement('p', { key: 'footer', style: { fontSize: '10px', color: '#999' } }, [
                        `Sent by ${studio.name} via StudioVault. `,
                        React.createElement('a', { key: 'unsubscribe', href: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://studiovault.co'}/customer/profile` }, 'Unsubscribe')
                    ])
                ])
            })
            if (res.success) successCount++
            else failCount++
        }))

        // Small delay between chunks to avoid rate limits
        if (i + CHUNK_SIZE < validRecipients.length) {
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    // 5. Update Studio Quota
    await supabase
        .from('studios')
        .update({ monthly_marketing_sent: currentSent + successCount })
        .eq('id', studioId)

    // 6. Log Campaign
    await supabase
        .from('marketing_campaigns')
        .insert({
            studio_id: studioId,
            title,
            subject,
            content,
            segment,
            recipient_count: successCount,
            status: failCount === 0 ? 'sent' : 'partial_success',
            created_by: user.id
        })

    revalidatePath('/studio/marketing/email')
    return { success: true, sent: successCount, failed: failCount }
}

export async function getMarketingStatsAction(studioId: string) {
    const supabase = await createClient()
    const { data: studio } = await supabase
        .from('studios')
        .select('subscription_tier, monthly_marketing_sent, marketing_limit_reset_at')
        .eq('id', studioId)
        .single()

    const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false })

    return { studio, campaigns }
}
