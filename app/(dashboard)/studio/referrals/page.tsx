import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReferralsPageClient from './ReferralsPageClient'
import { getStudioReferralConfig, getStudioReferralStats } from '@/lib/actions/referral'

export default async function ReferralsPage(props: {
    searchParams: Promise<{ outletId?: string }>
}) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) redirect('/login')

    const searchParams = await props.searchParams
    const outletId = searchParams.outletId

    // 1. Get studio owned by user
    const { data: studio } = await supabase
        .from('studios')
        .select('id, name')
        .eq('owner_id', user.id)
        .single()

    if (!studio) redirect('/studio/onboarding')

    // 2. Fetch config and stats
    const [config, stats, { data: memberships }, { data: packages }] = await Promise.all([
        getStudioReferralConfig(studio.id),
        getStudioReferralStats(studio.id),
        supabase.from('memberships').select('id, name, price').eq('studio_id', studio.id),
        supabase.from('packages').select('id, name, price').eq('studio_id', studio.id)
    ])

    return (
        <ReferralsPageClient 
            studio={studio}
            initialConfig={config}
            stats={stats}
            memberships={memberships || []}
            packages={packages || []}
            outletId={outletId}
        />
    )
}
