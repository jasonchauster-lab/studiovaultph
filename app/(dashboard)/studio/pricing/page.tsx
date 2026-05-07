import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getCachedStudio } from '@/lib/studio/data'
import { PricingService } from '@/lib/services/pricing'
import dynamic from 'next/dynamic'

const PricingPageClient = dynamic(() => import('./PricingPageClient'), {
    loading: () => <div className="p-10 space-y-10 animate-pulse">
        <div className="h-20 bg-zinc-100 rounded-3xl w-1/2" />
        <div className="h-[600px] bg-white border border-zinc-100 rounded-[3rem] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-50/50 to-transparent animate-shimmer" />
        </div>
    </div>
})

export default async function PricingPlansPage() {
    const studio = await getCachedStudio()
    if (!studio) notFound()

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    try {
        const { memberships, packages, services, categories, outlets } = await PricingService.getPricingData(studio.id)
        
        return (
            <PricingPageClient 
                memberships={memberships} 
                packages={packages} 
                services={services}
                categories={categories}
                outlets={outlets}
                studioId={studio.id}
            />
        )
    } catch (error) {
        console.error('[PricingPlansPage] Error loading data:', error)
        // Fallback to empty data if service fails
        return (
            <PricingPageClient 
                memberships={[]} 
                packages={[]} 
                services={[]}
                categories={[]}
                outlets={[]}
                studioId={studio.id}
            />
        )
    }
}
