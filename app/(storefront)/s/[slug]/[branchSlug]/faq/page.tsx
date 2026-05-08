import { getStudioBySlug, getStorefrontData } from '@/lib/studio/website'
import { getStudioReferralConfig } from '@/lib/actions/referral'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'
import StorefrontFAQ from '@/components/storefront/StorefrontFAQ'
import MobileActionBar from '@/components/storefront/MobileActionBar'
import WhatsAppFAB from '@/components/storefront/WhatsAppFAB'
import BackToTopFAB from '@/components/storefront/BackToTopFAB'

export default async function BranchFaqPage(props: {
    params: Promise<{ slug: string, branchSlug: string }>
}) {
    const { slug, branchSlug } = await props.params
    const studio = await getStudioBySlug(slug)

    if (!studio) notFound()
    
    const supabase = await createClient()
    const { data: outlet } = await supabase
        .from('outlets')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('slug', branchSlug)
        .eq('is_active', true)
        .eq('status', 'published')
        .single()
    
    if (!outlet) notFound()

    const { data } = await supabase.auth.getUser();
    const user = data?.user
    
    let profile = null
    let avatarUrl = ''
    let membership = null

    if (user) {
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        
        profile = profileData
        avatarUrl = profileData?.avatar_url || ''

        const { data: membershipData } = await supabase
            .from('customer_memberships')
            .select('*')
            .eq('user_id', user.id)
            .eq('studio_id', studio.id)
            .maybeSingle()
        
        membership = membershipData
    }

    const referralConfig = await getStudioReferralConfig(studio.id)

    const studioConfig = studio.website_config || {}
    const outletConfig = outlet.website_config || {}

    const config = {
        ...studioConfig, 
        ...outletConfig,
    }

    const theme = config.theme || { primaryColor: '#2D3282' }

    // Resolve FAQ data with inheritance from Master (Studio)
    const masterFaqs = studio.website_config?.faq || []
    const branchFaqs = outlet.website_config?.faq || []
    
    // If branch has no FAQs, inherit from master
    const finalFaqs = branchFaqs.length > 0 ? branchFaqs : masterFaqs

    const faqSectionConfig = {
        id: 'faq-standalone',
        type: 'faq',
        enabled: true,
        content: {
            title: 'Frequently Asked Questions',
            subtitle: 'Everything you need to know about our studio and sessions.',
            faqs: finalFaqs,
            layout: 'simple' as const
        }
    }

    return (
        <div 
            className="flex flex-col min-h-screen transition-colors duration-500"
            style={{ 
                '--primary-brand': theme.primaryColor,
                '--secondary-brand': theme.secondaryColor || '#FFFFFF',
                '--accent-brand': theme.accentColor || theme.primaryColor,
                '--button-color': theme.buttonColor || theme.primaryColor || '#2D3282',
                '--button-radius': theme.buttonRadius || '9999px',
                '--section-padding': theme.sectionPadding || '5rem',
                '--card-shadow': theme.cardShadow || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                '--font-heading': theme.headingFont ? `var(--font-${theme.headingFont})` : 'var(--font-serif)',
                '--font-body': theme.bodyFont ? `var(--font-${theme.bodyFont})` : 'var(--font-sans)',
                backgroundColor: theme.backgroundColor || '#ffffff',
                color: theme.textColor || '#1b1c19'
            } as any}
        >
            <StorefrontHeader 
                studioName={studio.name} 
                logoUrl={config.header?.logoUrl} 
                theme={theme} 
                config={config} 
                profile={profile}
                studioMembership={membership}
                avatarUrl={avatarUrl}
                currentBranchName={outlet.name}
                hasMultipleBranches={(studio.outlets || []).filter((o: any) => o.is_active && (o.status === 'published' || !o.status)).length > 1}
                referralConfig={referralConfig}
            />

            <main className="flex-1 pt-32 pb-20">
                <StorefrontFAQ 
                    config={faqSectionConfig}
                    theme={theme}
                />
            </main>

            <StorefrontFooter studio={studio} config={config} theme={theme} />

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
