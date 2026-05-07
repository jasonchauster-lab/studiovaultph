import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getStudioBySlug } from '@/lib/studio/website'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import WaiverSignForm from '@/components/customer/WaiverSignForm'

export default async function WaiverSigningPage(props: {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { slug } = await props.params
    const searchParams = await props.searchParams
    const isPreview = searchParams.preview === 'true'
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect(`/s/${slug}?login=true`)

    const studio = await getStudioBySlug(slug)
    if (!studio) notFound()

    // 1. Fetch Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // 2. Fetch Active Waiver Template (Use admin client to bypass RLS for customers)
    const adminSupabase = createAdminClient()
    const { data: template } = await adminSupabase
        .from('waiver_templates')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('status', 'Active')
        .limit(1)
        .maybeSingle()

    // 3. Check if ALREADY signed for THIS studio
    const { data: existingConsent } = await supabase
        .from('waiver_consents')
        .select('id')
        .eq('user_id', user.id)
        .eq('studio_id', studio.id)
        .limit(1)
        .maybeSingle()

    // If already signed, don't show the page, redirect to dashboard (unless PREVIEW mode)
    if (existingConsent && !isPreview) {
        redirect(`/s/${slug}/dashboard`)
    }

    return (
        <div className="min-h-screen bg-off-white flex flex-col">
            <StorefrontHeader 
                studioName={studio.name} 
                config={studio.website_config}
                theme={studio.website_config?.theme || { primaryColor: '#2D3282' }}
            />

            <main className="flex-1 pt-32 pb-20 px-4">
                <WaiverSignForm 
                    studio={studio} 
                    template={template} 
                    profile={profile} 
                />
            </main>

            <StorefrontFooter 
                studio={studio} 
                config={studio.website_config}
            />
        </div>
    )
}
