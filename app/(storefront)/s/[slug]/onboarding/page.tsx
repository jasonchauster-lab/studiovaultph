import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getStudioBySlug } from '@/lib/studio/website'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import CustomerOnboardingForm from '@/components/customer/CustomerOnboardingForm'

export default async function StorefrontOnboardingPage(props: {
    params: Promise<{ slug: string }>
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { slug } = await props.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/s/${slug}/login`)
    }

    const studio = await getStudioBySlug(slug)
    if (!studio) notFound()

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // If profile is already complete, check if waiver is needed, otherwise redirect to dashboard
    if (profile?.contact_number && profile?.first_name) {
        // Check if waiver is already signed
        const { data: existingConsent } = await supabase
            .from('waiver_consents')
            .select('id')
            .eq('user_id', user.id)
            .eq('studio_id', studio.id)
            .limit(1)
            .maybeSingle()

        if (existingConsent) {
            redirect(`/s/${slug}/dashboard`)
        } else {
            redirect(`/s/${slug}/onboarding/waiver`)
        }
    }

    return (
        <div className="min-h-screen bg-off-white flex flex-col">
            <StorefrontHeader 
                studioName={studio.name} 
                config={studio.website_config}
                theme={studio.website_config?.theme || { primaryColor: '#2D3282' }}
            />

            <main className="flex-1 pt-32 pb-20 px-4">
                <div className="max-w-xl mx-auto space-y-8 text-center mb-12">
                    <h1 className="text-4xl font-serif font-bold text-charcoal tracking-tight">
                        Complete your <span className="text-burgundy italic">profile.</span>
                    </h1>
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">
                        Welcome to {studio.name}. Just a few more details to get you started.
                    </p>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-ambient border border-border-grey/50 p-8 md:p-14 max-w-2xl mx-auto">
                    <CustomerOnboardingForm profile={profile} studio={studio} />
                </div>
            </main>

            <StorefrontFooter 
                studio={studio} 
                config={studio.website_config}
            />
        </div>
    )
}
