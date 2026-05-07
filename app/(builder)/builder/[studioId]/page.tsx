import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import StudioWebsiteBuilder from '@/components/studio/StudioWebsiteBuilder'
import { headers } from 'next/headers'

export default async function BuilderPage(props: {
    params: Promise<{ studioId: string }>
}) {
    const { studioId } = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Ensure the user owns the studio
    const { data: studio } = await supabase
        .from('studios')
        .select('*')
        .eq('id', studioId)
        .eq('owner_id', user.id)
        .maybeSingle()

    if (!studio) {
        // Double check secondary ownership or permassions if needed
        notFound()
    }

    // Fetch real pricing plans
    const [
        { data: memberships, error: mErr },
        { data: packages, error: pErr }
    ] = await Promise.all([
        supabase
            .from('memberships')
            .select('*')
            .eq('studio_id', studioId)
            .eq('is_private', false)
            .order('price', { ascending: true }),
        supabase
            .from('packages')
            .select('*')
            .eq('studio_id', studioId)
            .eq('is_private', false)
            .order('price', { ascending: true })
    ])

    if (mErr) console.error('[BuilderPage] Error fetching memberships:', mErr)
    if (pErr) console.error('[BuilderPage] Error fetching packages:', pErr)

    const headersList = await headers()
    const origin = `${headersList.get('x-forwarded-proto') ?? 'http'}://${headersList.get('host') ?? 'localhost:3000'}`

    return (
        <div className="h-screen w-screen overflow-hidden">
            <StudioWebsiteBuilder 
                studio={studio} 
                origin={origin} 
                isFullscreen={true} 
                memberships={memberships || []} 
                packages={packages || []} 
            />
        </div>
    )
}
