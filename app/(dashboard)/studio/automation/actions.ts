'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import PackageExpiryEmail from '@/components/emails/PackageExpiryEmail'
import AbandonedBookingEmail from '@/components/emails/AbandonedBookingEmail'
import { format } from 'date-fns'
import { getStudioBranding } from '@/lib/studio/branding'

export async function processPackageExpiries() {
    const supabase = await createClient()
    const intervals = [7, 3, 1]
    
    for (const days of intervals) {
        const { data: expiring, error } = await supabase.rpc('get_expiring_plans', { p_days: days })
        if (error || !expiring?.length) continue

        // Bulk fetch profiles and studios
        const userIds = [...new Set(expiring.map((p: any) => p.user_id))]
        const studioIds = [...new Set(expiring.map((p: any) => p.studio_id))]

        const [{ data: profiles }, { data: studios }] = await Promise.all([
            supabase.from('profiles').select('id, full_name, email').in('id', userIds),
            supabase.from('studios').select('id, name, slug').in('id', studioIds)
        ])

        const profileMap = new Map(profiles?.map(p => [p.id, p]))
        const studioMap = new Map(studios?.map(s => [s.id, s]))
        const brandingCache = new Map()

        for (const plan of expiring) {
            const userProfile = profileMap.get(plan.user_id)
            const studio = studioMap.get(plan.studio_id)

            if (userProfile?.email && studio) {
                if (!brandingCache.has(studio.id)) {
                    brandingCache.set(studio.id, await getStudioBranding(studio.id))
                }
                const branding = brandingCache.get(studio.id)

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
    if (error || !abandoned?.length) return

    // Bulk fetch profiles and studios
    const userIds = [...new Set(abandoned.map((b: any) => b.user_id))]
    const studioIds = [...new Set(abandoned.map((b: any) => b.studio_id))]

    const [{ data: profiles }, { data: studios }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').in('id', userIds),
        supabase.from('studios').select('id, name, slug').in('id', studioIds)
    ])

    const profileMap = new Map(profiles?.map(p => [p.id, p]))
    const studioMap = new Map(studios?.map(s => [s.id, s]))
    const brandingCache = new Map()

    for (const booking of abandoned) {
        const userProfile = profileMap.get(booking.user_id)
        const studio = studioMap.get(booking.studio_id)

        if (userProfile?.email && studio) {
            if (!brandingCache.has(studio.id)) {
                brandingCache.set(studio.id, await getStudioBranding(studio.id))
            }
            const branding = brandingCache.get(studio.id)

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

            await supabase.from('bookings').update({ 
                recovery_notified_at: new Date().toISOString() 
            }).eq('id', booking.booking_id)
        }
    }
}
