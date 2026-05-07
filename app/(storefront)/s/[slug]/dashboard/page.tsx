import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getStudioBySlug } from '@/lib/studio/website'
import { getStudentReferralStats, getStudioReferralConfig } from '@/lib/actions/referral'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import DashboardClient from './DashboardClient'
import { getManilaTodayStr } from '@/lib/timezone'

export default async function StudioCustomerDashboard(props: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect(`/s/${slug}?login=true`)

    const studio = await getStudioBySlug(slug)
    if (!studio) notFound()

    const admin = (await import('@/lib/supabase/server')).createAdminClient()
    const today = getManilaTodayStr()
    
    const [
        { data: profile },
        { data: activePlans },
        { data: upcomingBookings },
        { data: pastBookings },
        referralStats,
        referralConfig,
        { data: studioMembership },
        { data: walletTransactions }
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('customer_plans')
            .select('*, packages(name), memberships(name)')
            .eq('user_id', user.id)
            .eq('studio_id', studio.id)
            .eq('status', 'active'),
        admin.from('bookings')
            .select('*, slots(*, instructor:instructor_id(full_name), service:service_id(name, difficulty))')
            .eq('client_id', user.id)
            .eq('studio_id', studio.id)
            .gte('booking_date', today)
            .order('booking_date', { ascending: true }),
        admin.from('bookings')
            .select('*, slots(*, instructor:instructor_id(full_name), service:service_id(name, difficulty))')
            .eq('client_id', user.id)
            .eq('studio_id', studio.id)
            .lt('booking_date', today)
            .order('booking_date', { ascending: false })
            .limit(10),
        getStudentReferralStats(user.id, studio.id),
        getStudioReferralConfig(studio.id),
        supabase.from('customer_memberships')
            .select('*')
            .eq('user_id', user.id)
            .eq('studio_id', studio.id)
            .maybeSingle(),
        supabase.from('studio_wallet_transactions')
            .select('*')
            .eq('user_id', user.id)
            .eq('studio_id', studio.id)
            .order('created_at', { ascending: false })
    ])

    const theme = studio.website_config?.theme || { primaryColor: '#2D3282' }

    return (
        <div className="min-h-screen flex flex-col bg-[#faf9f6]">
            <StorefrontHeader 
                studioName={studio.name}
                logoUrl={studio.website_config?.header?.logoUrl}
                theme={theme}
                config={studio.website_config || {}}
                profile={profile}
                avatarUrl={profile?.avatar_url}
                referralConfig={referralConfig}
                studioMembership={studioMembership}
            />

            <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-24">
                <React.Suspense fallback={<div className="flex-1 animate-pulse bg-zinc-100 rounded-[2rem] h-[600px]" />}>
                    <DashboardClient 
                        studio={studio}
                        profile={profile}
                        activePlans={activePlans || []}
                        bookings={upcomingBookings || []}
                        pastBookings={pastBookings || []}
                        referralStats={referralStats}
                        referralConfig={referralConfig}
                        studioMembership={studioMembership}
                        walletTransactions={walletTransactions || []}
                        theme={theme}
                    />
                </React.Suspense>
            </main>

            <StorefrontFooter studio={studio} config={studio.website_config || {}} theme={theme} />
        </div>
    )
}
