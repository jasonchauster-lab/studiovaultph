'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import PackageExpiryEmail from '@/components/emails/PackageExpiryEmail'
import AbandonedBookingEmail from '@/components/emails/AbandonedBookingEmail'
import { format } from 'date-fns'
import { getStudioBranding } from '@/lib/studio/branding'

export async function processPackageExpiries() {
    const supabase = await createClient()
    
    // Days to check for (e.g. 7 days out, 3 days out)
    const intervals = [7, 3, 1]
    
    for (const days of intervals) {
        const { data: expiring, error } = await supabase.rpc('get_expiring_plans', { p_days: days })
        
        if (error) {
            console.error(`Error fetching expiring plans for ${days} days:`, error)
            continue
        }

        for (const plan of expiring) {
            // Fetch user profile and studio info
            const { data: userProfile } = await supabase.from('profiles').select('full_name, email').eq('id', plan.user_id).single()
            const { data: studio } = await supabase.from('studios').select('id, name, slug').eq('id', plan.studio_id).single()

            if (userProfile?.email && studio) {
                const branding = await getStudioBranding(studio.id);
                await sendEmail({
                    to: userProfile.email,
                    subject: `Reminder: Your package at ${studio.name} is expiring soon!`,
                    fromName: branding?.fromName,
                    react: PackageExpiryEmail({
                        clientName: userProfile.full_name || 'Valued Client',
                        packageName: plan.plan_name,
                        expiryDate: format(new Date(plan.expires_at), 'MMMM dd, yyyy'),
                        remainingCredits: plan.remaining_credits,
                        studioName: studio.name,
                        studioSlug: studio.slug,
                        studioLogo: branding?.logoUrl,
                        primaryColor: branding?.primaryColor
                    })
                })
            }
        }
    }
}

export async function processAbandonedBookings() {
    const supabase = await createClient()
    
    const { data: abandoned, error } = await supabase.rpc('get_abandoned_bookings')
    
    if (error) {
        console.error('Error fetching abandoned bookings:', error)
        return
    }

    for (const booking of abandoned) {
        // Fetch user profile and studio info
        const { data: userProfile } = await supabase.from('profiles').select('full_name, email').eq('id', booking.user_id).single()
        const { data: studio } = await supabase.from('studios').select('id, name').eq('id', booking.studio_id).single()

        if (userProfile?.email && studio) {
            const branding = await getStudioBranding(studio.id);
            await sendEmail({
                to: userProfile.email,
                subject: `Complete your booking at ${studio.name}`,
                fromName: branding?.fromName,
                react: AbandonedBookingEmail({
                    clientName: userProfile.full_name || 'Valued Client',
                    studioName: studio.name,
                    bookingUrl: `https://studiovaultph.com/customer/payment/${booking.booking_id}`,
                    studioLogo: branding?.logoUrl,
                    primaryColor: branding?.primaryColor
                })
            })

            // Mark as recovery notified
            await supabase.from('bookings').update({ 
                recovery_notified_at: new Date().toISOString() 
            }).eq('id', booking.booking_id)
        }
    }
}
