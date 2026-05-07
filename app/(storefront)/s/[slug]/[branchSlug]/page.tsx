import { getStudioBySlug, getStorefrontData, getAllBranchSlugs } from '@/lib/studio/website'
import { getStudioReferralConfig } from '@/lib/actions/referral'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import StorefrontSections from '@/components/storefront/StorefrontSections'
import MobileActionBar from '@/components/storefront/MobileActionBar'
import WhatsAppFAB from '@/components/storefront/WhatsAppFAB'
import BackToTopFAB from '@/components/storefront/BackToTopFAB'
import { clsx } from 'clsx'

export const revalidate = 60 // Revalidate every minute during active development

export async function generateStaticParams() {
    return await getAllBranchSlugs()
}

export default async function BranchStorefrontPage(props: {
    params: Promise<{ slug: string, branchSlug: string }>
}) {
    const { slug, branchSlug } = await props.params
    const supabase = await createClient()

    // 1. Fetch Studio (Core dependency)
    const studio = await getStudioBySlug(slug)
    if (!studio) return <div className="p-20 bg-zinc-900 text-white font-mono">DEBUG: Studio not found for slug: {slug}</div>
    
    // 2. Resolve the specific branch from already fetched studio.outlets
    const outlet = (studio.outlets as any[])?.find((o: any) => 
        o.slug === branchSlug && 
        o.is_active && 
        (o.status === 'published' || !o.status)
    )
    if (!outlet) return <div className="p-20 bg-zinc-900 text-white font-mono">DEBUG: Branch not found or not published. Slug: {branchSlug}. Outlets: {JSON.stringify(studio.outlets)}</div>

    // 3. Parallel Fetch all other branch-dependent data
    const [
        { data: { user } },
        storefrontData,
        referralConfig,
        { data: membershipsData },
        { data: packagesData }
    ] = await Promise.all([
        supabase.auth.getUser(),
        getStorefrontData(studio.id, studio.owner_id, outlet.id),
        getStudioReferralConfig(studio.id),
        supabase.from('memberships').select('id, name, description, price, type, duration_value, duration_unit, sessions_count, applicable_outlet_ids, is_private').eq('studio_id', studio.id).eq('is_private', false).order('price', { ascending: true }),
        supabase.from('packages').select('id, name, description, price, sessions_count, validity_value, validity_unit, applicable_outlet_ids, is_private').eq('studio_id', studio.id).eq('is_private', false).order('price', { ascending: true })
    ])

    const { slots, instructors, reviews } = storefrontData

    // 4. Fetch User Profile and specific memberships if user is logged in
    let profile = null
    let avatarUrl = ''
    let referralRewards: any[] = []
    let customerMembership = null

    if (user) {
        const [
            { data: profileData },
            { data: membershipData },
            { data: rewards }
        ] = await Promise.all([
            supabase.from('profiles').select('id, full_name, avatar_url, email').eq('id', user.id).single(),
            supabase.from('customer_memberships').select('*').eq('user_id', user.id).eq('studio_id', studio.id).maybeSingle(),
            supabase.from('referral_rewards').select('id, reward_type, reward_value, status').eq('user_id', user.id).eq('studio_id', studio.id).eq('status', 'pending')
        ])

        profile = profileData
        avatarUrl = profileData?.avatar_url || ''
        customerMembership = membershipData
        referralRewards = rewards || []
    }
    
    // 5. Data already filtered by outlet at the DB level (Phase 5)
    const branchSlots = slots

    const memberships = membershipsData?.filter(m => 
        !m.applicable_outlet_ids || 
        m.applicable_outlet_ids.length === 0 || 
        m.applicable_outlet_ids.includes(outlet.id)
    ) || []

    const packages = packagesData?.filter(p => 
        !p.applicable_outlet_ids || 
        p.applicable_outlet_ids.length === 0 || 
        p.applicable_outlet_ids.includes(outlet.id)
    ) || []

    // 6. Merge Hybrid Config: Branding from Studio, Content from Outlet
    const studioConfig = studio.website_config || {}
    const outletConfig = outlet.website_config || {}

    const config = {
        ...studioConfig, 
        ...outletConfig, 
    }

    let sections = []
    if (config.pages && (config.pages['home'] || config.pages['Home'])) {
        sections = (config.pages['home'] || config.pages['Home']).sections || []
    } else {
        sections = config.sections || studioConfig.sections || []
    }

    const theme = config.theme || { primaryColor: '#2D3282' }

    // 7. SEO: Structured Data (JSON-LD)
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: studio.name,
        image: config.header?.logoUrl || studio.logo_url,
        address: {
            '@type': 'PostalAddress',
            streetAddress: outlet.address,
            addressLocality: outlet.name,
            addressCountry: 'PH' // Assuming PH based on project context
        },
        url: `https://studiovaultph.com/s/${slug}/${branchSlug}`,
        telephone: studio.whatsapp_number || '',
        priceRange: '₱₱',
    }

    return (
        <div 
            className={clsx("flex flex-col min-h-screen transition-colors duration-500")}
            style={{ 
                '--primary-brand': theme.primaryColor,
                '--secondary-brand': theme.secondaryColor || '#FFFFFF',
                '--accent-brand': theme.accentColor || theme.primaryColor,
                '--button-color': theme.buttonColor || theme.primaryColor || '#2D3282',
                '--button-radius': theme.buttonRadius || '9999px',
                '--section-padding': theme.sectionPadding || '5rem',
                '--card-shadow': theme.cardShadow || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                '--font-heading': theme.headingFont || 'var(--font-serif)',
                '--font-body': theme.bodyFont || 'var(--font-sans)',
                '--global-text': theme.textColor || '#1b1c19',
                '--global-bg': theme.backgroundColor || '#ffffff',
                backgroundColor: 'var(--global-bg)',
                color: 'var(--global-text)'
            } as any}
        >
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <StorefrontHeader 
                studioName={studio.name} 
                logoUrl={config.header?.logoUrl} 
                theme={theme} 
                config={{
                    header: config.header,
                    navigation: config.navigation,
                    pages: config.pages,
                    features: config.features,
                    legal: config.legal
                }} 
                profile={profile ? { 
                    id: profile.id, 
                    full_name: profile.full_name, 
                    avatar_url: profile.avatar_url 
                } : null}
                studioMembership={customerMembership ? {
                    available_balance: customerMembership.available_balance
                } : null}
                avatarUrl={avatarUrl}
                currentBranchName={outlet.name}
                hasMultipleBranches={(studio.outlets || []).filter((o: any) => o.is_active && (o.status === 'published' || !o.status)).length > 1}
                referralConfig={referralConfig}
            />

            <main id="main-content" className="flex-1">
                <StorefrontSections 
                    sections={sections}
                    studio={{
                        id: studio.id,
                        name: studio.name,
                        slug: studio.slug,
                        bio: studio.bio,
                        logo_url: studio.logo_url,
                        banner_url: studio.banner_url,
                        service_rates: studio.service_rates,
                        hourly_rate: studio.hourly_rate,
                        enable_manual_payments: studio.enable_manual_payments,
                        manual_payment_instructions: studio.manual_payment_instructions
                    }}
                    outlet={{
                        id: outlet.id,
                        name: outlet.name,
                        slug: outlet.slug,
                        address: outlet.address,
                        hero_image_url: outlet.hero_image_url
                    }}
                    theme={theme}
                    data={{
                        memberships,
                        packages,
                        slots: branchSlots,
                        instructors,
                        blogs: studio.website_config?.blogs || [],
                        referralRewards,
                        profile,
                        reviews,
                        enableXendit: studio.enable_xendit || false,
                        enableManualPayments: studio.enable_manual_payments,
                        manualPaymentInstructions: studio.manual_payment_instructions
                    }}
                />
            </main>

            <StorefrontFooter 
                studio={{ name: studio.name, logo_url: studio.logo_url, bio: studio.bio }} 
                config={{ footer: config.footer, navigation: config.navigation }} 
                theme={theme} 
            />

            <MobileActionBar />
            
            {(() => {
                const branchOverride = config.branchOverrides?.[outlet.id]?.floatingWidgets
                const globalConfig = config.floatingWidgets
                
                const whatsappEnabled = branchOverride?.whatsapp?.enabled ?? globalConfig?.whatsapp?.enabled ?? studio.show_whatsapp_button
                const whatsappNumber = branchOverride?.whatsapp?.number || globalConfig?.whatsapp?.number || studio.whatsapp_number
                
                const backToTopEnabled = branchOverride?.backToTop?.enabled ?? globalConfig?.backToTop?.enabled ?? false

                return (
                    <>
                        {whatsappEnabled && <WhatsAppFAB phoneNumber={whatsappNumber} />}
                        {backToTopEnabled && <BackToTopFAB />}
                    </>
                )
            })()}
        </div>
    )
}
