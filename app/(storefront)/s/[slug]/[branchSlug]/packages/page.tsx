import { getStudioBySlug } from '@/lib/studio/website'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StorefrontHeader from '@/components/storefront/StorefrontHeader'
import PricingSection from '@/components/storefront/PricingSection'
import StorefrontFooter from '@/components/storefront/StorefrontFooter'

export default async function BranchPackagesPage(props: {
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
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        profile = profileData
        avatarUrl = profileData?.avatar_url || ''
    }

    // 3. Fetch all active packages and categories
    const [
        { data: rawPackages }, 
        { data: categories }
    ] = await Promise.all([
        supabase.from('packages').select('*').eq('studio_id', studio.id).eq('is_private', false).order('price', { ascending: true }),
        supabase.from('service_categories').select('*').eq('studio_id', studio.id).order('display_order', { ascending: true })
    ])

    // Filter by branch scoping
    const packages = (rawPackages || []).filter(p => 
        !p.applicable_outlet_ids || 
        p.applicable_outlet_ids.length === 0 || 
        p.applicable_outlet_ids.includes(outlet.id)
    )

    const config = studio.website_config || {
        theme: { primaryColor: '#2D3282' },
        header: { logoPosition: 'left', sticky: true }
    }
    const theme = config.theme || { primaryColor: '#2D3282' }

    // Group by category
    const allCategories = categories || []
    const allPlans = (packages || []).map(p => ({ ...p, type: 'package' }))

    const groupedData = allCategories.map(cat => ({
        id: cat.id,
        title: cat.name,
        description: allPlans.find(p => p.category_id === cat.id)?.description || '',
        items: allPlans.filter(p => p.category_id === cat.id)
    })).filter(group => group.items.length > 0)

    // Add "General" group for items without category
    const uncategorizedItems = allPlans.filter(p => !p.category_id)
    if (uncategorizedItems.length > 0) {
        groupedData.push({
            id: 'general',
            title: 'General Packages',
            description: 'Individual class bundles and special program packs.',
            items: uncategorizedItems
        })
    }

    return (
        <div 
            className="flex flex-col min-h-screen"
            style={{ 
                '--primary-brand': theme.primaryColor,
                '--secondary-brand': theme.secondaryColor || '#FFFFFF',
                '--accent-brand': theme.accentColor || theme.primaryColor,
                backgroundColor: theme.background || '#f5e8de'
            } as any}
        >
            <StorefrontHeader 
                studioName={studio.name} 
                logoUrl={config.header?.logoUrl} 
                theme={theme} 
                config={config} 
                profile={profile}
                avatarUrl={avatarUrl}
                activePage="packages"
                currentBranchName={outlet.name}
                hasMultipleBranches={(studio.outlets || []).filter((o: any) => o.is_active && (o.status === 'published' || !o.status)).length > 1}
            />

            <main className="flex-1 pt-32 pb-24 px-6 md:px-12 max-w-7xl mx-auto w-full">
                <div className="mb-20 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900/5 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-900/40">
                         {outlet.name} Pricing
                    </div>
                    <h1 className="text-4xl md:text-6xl font-serif font-black text-charcoal-900 tracking-tight">
                        Session Packages
                    </h1>
                    <p className="text-zinc-500 max-w-2xl leading-relaxed">
                        Flexible bundles for your practice. Buy session packs and use them whenever you like within their validity period.
                    </p>
                </div>

                <div className="space-y-12">
                    {groupedData.length > 0 ? (
                        groupedData.map((group) => (
                            <PricingSection 
                                key={group.id}
                                title={group.title}
                                description={group.description}
                                items={group.items}
                                studioId={studio.id}
                                studioLocation={outlet.address}
                            />
                        ))
                    ) : (
                        <div className="py-20 text-center bg-zinc-900/5 rounded-[3rem] border border-dashed border-zinc-200">
                             <p className="text-zinc-400 italic">No packages available for this location yet.</p>
                        </div>
                    )}
                </div>
            </main>

            <StorefrontFooter studio={studio} config={config} theme={theme} />
        </div>
    )
}
