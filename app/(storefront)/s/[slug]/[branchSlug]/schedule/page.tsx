import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import StorefrontSections from '@/components/storefront/StorefrontSections'
import { getStudioBySlug, getStorefrontData } from '@/lib/studio/website'

export default async function BranchSchedulePage(props: {
    params: Promise<{ slug: string, branchSlug: string }>
}) {
    const { slug, branchSlug } = await props.params
    const studio = await getStudioBySlug(slug)
    if (!studio) notFound()

    const supabase = await createClient()

    // 1. Resolve the specific branch
    const { data: outlet } = await supabase
        .from('outlets')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('slug', branchSlug)
        .eq('is_active', true)
        .eq('status', 'published')
        .single()
    
    if (!outlet) notFound()

    // 2. Resolve Profile
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    let profile = null
    let avatarUrl = ''
    if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        profile = profileData
        avatarUrl = profileData?.avatar_url || ''
    }

    // 3. Fetch branch-scoped data
    const { slots, instructors } = await getStorefrontData(studio.id, studio.owner_id)
    const blogs = studio.website_config?.blogs || []
    const branchSlots = slots.filter(s => s.outlet_id === outlet.id)

    // 4. Resolve CMS Config
    const studioConfig = studio.website_config || {}
    const outletConfig = outlet.website_config || {}
    const config = { ...studioConfig, ...outletConfig }
    const theme = config.theme || { primaryColor: '#2D3282' }

    // 5. Resolve Sections for Schedule Page
    let sections = []
    if (config.pages && (config.pages['schedule'] || config.pages['Schedule'])) {
        sections = (config.pages['schedule'] || config.pages['Schedule']).sections || []
    } else {
        // Fallback or Initial state
        sections = [
            {
                id: 'schedule-core',
                type: 'timetable',
                enabled: true,
                content: { title: 'Class Schedule', subtitle: `Explore sessions at our ${outlet.name} branch` }
            },
            {
                id: 'booking-core',
                type: 'booking',
                enabled: true
            }
        ]
    }

    return (
        <div 
            className="flex flex-col min-h-screen"
            style={{ 
                '--primary-brand': theme.primaryColor,
                '--button-color': theme.buttonColor || theme.primaryColor || '#2D3282',
                '--button-radius': theme.buttonRadius || '9999px',
                '--section-padding': theme.sectionPadding || '5rem',
                '--card-shadow': theme.cardShadow || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                '--font-heading': theme.headingFont ? theme.headingFont : 'var(--font-serif)',
                '--font-body': theme.bodyFont ? theme.bodyFont : 'var(--font-sans)',
                '--global-text': theme.textColor || '#1b1c19',
                '--global-bg': theme.backgroundColor || '#ffffff',
                backgroundColor: 'var(--global-bg)',
                color: 'var(--global-text)'
            } as any}
        >
            <StorefrontHeader 
                studioName={studio.name} 
                logoUrl={config.header?.logoUrl || studio.logo_url} 
                theme={theme}
                config={config}
                profile={profile}
                avatarUrl={avatarUrl}
                activePage="schedule"
                currentBranchName={outlet.name}
                hasMultipleBranches={(studio.outlets || []).filter((o: any) => o.is_active && (o.status === 'published' || !o.status)).length > 1}
            />

            <main className="flex-1">
                <StorefrontSections 
                    sections={sections}
                    studio={studio}
                    outlet={outlet}
                    theme={theme}
                    data={{
                        slots: branchSlots,
                        instructors,
                        blogs
                    }}
                />
            </main>

            <StorefrontFooter 
                studio={studio} 
                config={config} 
                theme={theme} 
            />
        </div>
    )
}

