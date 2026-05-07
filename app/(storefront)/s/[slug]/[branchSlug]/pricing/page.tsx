import { getStudioBySlug, getStorefrontData } from '@/lib/studio/website'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import StorefrontSections from '@/components/storefront/StorefrontSections'

export default async function BranchPricingPage(props: {
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

    // 2. Fetch user and profile
    const { data: { user } } = await supabase.auth.getUser()
    let profile = null
    let avatarUrl = ''
    if (user) {
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        profile = profileData
        avatarUrl = profileData?.avatar_url || ''
    }

    // 3. Fetch branch-scoped data
    const { instructors } = await getStorefrontData(studio.id, studio.owner_id)
    const blogs = studio.website_config?.blogs || []

    // 4. Fetch real pricing plans (Scoped)
    const { data: rowMemberships } = await supabase
        .from('memberships')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('is_private', false)
        .order('price', { ascending: true })

    const memberships = rowMemberships?.filter(m => 
        !m.applicable_outlet_ids || 
        m.applicable_outlet_ids.length === 0 || 
        m.applicable_outlet_ids.includes(outlet.id)
    ) || []

    const { data: rowPackages } = await supabase
        .from('packages')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('is_private', false)
        .order('price', { ascending: true })

    const packages = rowPackages?.filter(p => 
        !p.applicable_outlet_ids || 
        p.applicable_outlet_ids.length === 0 || 
        p.applicable_outlet_ids.includes(outlet.id)
    ) || []

    // 5. Merge Hybrid Config
    const studioConfig = studio.website_config || {}
    const outletConfig = outlet.website_config || {}
    const config = { ...studioConfig, ...outletConfig }
    const theme = config.theme || { primaryColor: '#2D3282' }

    // 6. Resolve Sections for Pricing Page
    const dedicatedPricingSections =
        (config.pages && (config.pages['memberships'] || config.pages['Pricing']))
            ? ((config.pages['memberships'] || config.pages['Pricing']).sections || [])
            : []

    const homePricingSections =
        (config.pages?.home?.sections || []).filter((section: any) =>
            ['memberships', 'packages', 'cta'].includes(section.type)
        )

    const hasUsableDedicatedPricingSections = dedicatedPricingSections.some((section: any) => section?.enabled !== false)
    const hasUsableHomePricingSections = homePricingSections.some((section: any) => section?.enabled !== false)

    const sections = hasUsableDedicatedPricingSections
        ? dedicatedPricingSections
        : hasUsableHomePricingSections
            ? homePricingSections
            : [
                {
                    id: 'pricing-memberships',
                    type: 'memberships',
                    enabled: true,
                    content: { title: 'Membership Plans', subtitle: 'Choose a plan that fits your practice' }
                },
                {
                    id: 'pricing-packages',
                    type: 'packages',
                    enabled: true,
                    content: { title: 'Session Packages', subtitle: 'Bundles for flexibility' }
                }
            ]

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
                activePage="pricing"
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
                        memberships,
                        packages,
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
