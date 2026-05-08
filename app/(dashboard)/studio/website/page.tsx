import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import StudioWebsiteBuilder from '@/components/studio/StudioWebsiteBuilder'
import StudioCmaOptIn from '@/components/studio/StudioCmaOptIn'
import BranchPageSelector from '@/components/dashboard/BranchPageSelector'
import Link from 'next/link'
import { ArrowLeft, Globe } from 'lucide-react'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function StudioWebsitePage(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const outletId = typeof searchParams.outletId === 'string' ? searchParams.outletId : undefined
    
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) {
        redirect('/login')
    }

    // 1. Fetch Studio
    const { data: studio, error } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)
        .single()

    if (error || !studio) {
        return <div className="p-8 text-charcoal-500 text-center">Studio not found. Please complete your registration.</div>
    }

    // 2. Fetch all outlets
    const { data: outlets = [] } = await supabase
        .from('outlets')
        .select('*')
        .eq('studio_id', studio.id)
        .order('created_at', { ascending: true })

    // Check if CMA is enabled
    if (!studio.is_cma_enabled) {
        return <StudioCmaOptIn studioId={studio.id} />
    }

    // Force selection of a branch (Strictly Branch Specific model)
    const branchList = outlets || []
    if (!outletId && branchList.length > 0) {
        redirect(`/studio/website?outletId=${branchList[0].id}`)
    }

    const headersList = await headers()
    const origin = `${headersList.get('x-forwarded-proto') ?? 'http'}://${headersList.get('host') ?? 'localhost:3000'}`

    // 3. Fetch real pricing plans (Scoped)
    const { data: rowMemberships } = await supabase
        .from('memberships')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('is_private', false)
        .order('price', { ascending: true })

    const memberships = rowMemberships?.filter(m => 
        !m.applicable_outlet_ids || 
        (Array.isArray(m.applicable_outlet_ids) && m.applicable_outlet_ids.length === 0) || 
        (outletId && Array.isArray(m.applicable_outlet_ids) && m.applicable_outlet_ids.includes(outletId))
    ) || []


    const { data: rowPackages } = await supabase
        .from('packages')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('is_private', false)
        .order('price', { ascending: true })

    const packages = rowPackages?.filter(p => 
        !p.applicable_outlet_ids || 
        (Array.isArray(p.applicable_outlet_ids) && p.applicable_outlet_ids.length === 0) || 
        (outletId && Array.isArray(p.applicable_outlet_ids) && p.applicable_outlet_ids.includes(outletId))
    ) || []


    return (
        <div className="min-h-screen p-8 lg:p-12 bg-cream-50/30">
            <div className="max-w-7xl mx-auto space-y-12">
                <div>
                    <Link
                        href="/studio/online-store"
                        className="inline-flex items-center gap-3 text-[10px] font-black text-zinc-400 hover:text-[#2D3282] uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO ONLINE STORE
                    </Link>
                    
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-zinc-100 shadow-sm mb-6">
                            <Globe className="w-4 h-4 text-[#2D3282]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Website Builder</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tightest leading-tight">
                            Live <span className="text-zinc-300">Editor</span>
                        </h1>
                        
                        {/* Centered Branch Selector */}
                        <BranchPageSelector 
                            outlets={outlets || []} 
                            currentOutletId={outletId}
                            isGlobalAllowed={false}
                        />
                    </div>
                </div>

                <div className="animate-in fade-in duration-700">
                    <StudioWebsiteBuilder 
                        studio={studio} 
                        outlets={outlets || []} 
                        outletId={outletId} 
                        origin={origin} 
                        memberships={memberships}
                        packages={packages}
                    />
                </div>
            </div>
        </div>
    )
}
