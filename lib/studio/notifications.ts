import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { NOTIFICATION_CATEGORIES } from './notification-events'
import StaffNotificationEmail from '@/components/emails/StaffNotificationEmail'
import React from 'react'

interface NotificationPayload {
    studioId: string
    category: string
    event: string
    title: string
    description: string
    link: string
    metadata?: any
}

/**
 * Dispatches notifications (Email and In-App) to all subscribed staff members.
 */
export async function dispatchNotification({
    studioId,
    category,
    event,
    title,
    description,
    link,
    metadata = {}
}: NotificationPayload) {
    const supabase = await createAdminClient()

    // 1. Fetch all enabled recipients for this studio
    const { data: recipients } = await supabase
        .from('staff_notification_recipients')
        .select(`
            id,
            profile_id,
            preferences,
            profile:profiles(id, full_name, email)
        `)
        .eq('studio_id', studioId)
        .eq('is_enabled', true)

    if (!recipients || recipients.length === 0) return

    // Fetch studio branding once for this dispatch
    const { getStudioBranding } = await import('./branding')
    const branding = await getStudioBranding(studioId)

    const notificationsToInsert: any[] = []
    const emailPromises: Promise<any>[] = []

    for (const recipient of recipients) {
        const prefs = recipient.preferences[category]?.[event] || []
        
        // A. In-App Notification
        if (prefs.includes('in_app')) {
            notificationsToInsert.push({
                recipient_id: recipient.profile_id,
                studio_id: studioId,
                type: category,
                title,
                description,
                data: { link, ...metadata },
                is_read: false
            })
        }

        // B. Email Notification
        const profile: any = Array.isArray(recipient.profile) ? recipient.profile[0] : recipient.profile
        if (prefs.includes('email') && profile?.email) {
            emailPromises.push(
                sendNotificationEmail(
                    profile.email, 
                    profile.full_name || 'Staff Member',
                    title, 
                    description, 
                    link,
                    branding
                )
            )
        }

    }
    
    // 2. Execute In-App Inserts
    if (notificationsToInsert.length > 0) {
        await supabase.from('notifications').insert(notificationsToInsert)
    }

    // 3. Execute Emails
    if (emailPromises.length > 0) {
        await Promise.allSettled(emailPromises)
    }
}

async function sendNotificationEmail(
    to: string, 
    recipientName: string, 
    title: string, 
    description: string, 
    link: string,
    branding?: any
) {
    try {
        const fullLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://studiovaultph.com'}${link}`
        
        console.log(`Sending notification email to ${to}: ${title}`)
        
        await sendEmail({ 
            to, 
            subject: title, 
            fromName: branding?.fromName,
            react: React.createElement(StaffNotificationEmail, {
                recipientName,
                title,
                description,
                actionLink: fullLink,
                studioName: branding?.name,
                studioLogo: branding?.logoUrl,
                primaryColor: branding?.primaryColor
            })
        })
    } catch (err) {
        console.error('Email dispatch error:', err)
    }
}

