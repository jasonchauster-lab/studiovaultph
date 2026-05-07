import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BusinessInfoForm from '@/components/management/BusinessInfoForm'
import { getCachedStudio, getCachedOutlets } from '@/lib/studio/data'

export default async function BusinessInfoPage(props: { searchParams: Promise<{ outletId?: string }> }) {
    const searchParams = await props.searchParams
    
    // 1. Fetch Studio & Outlets (Memoized)
    const studio = await getCachedStudio()
    
    if (!studio) {
        return <div className="p-12 text-zinc-400 font-medium tracking-tight">Studio not found. Please contact support.</div>
    }

    const outlets = await getCachedOutlets(studio.id)


    // 3. Determine Selected Outlet
    const selectedOutletId = searchParams.outletId || outlets[0]?.id

    return (
        <div className="max-w-5xl mx-auto py-10 px-6">
            <BusinessInfoForm 
                studio={studio} 
                outlets={outlets} 
                initialSelectedOutletId={selectedOutletId}
            />
        </div>
    )
}
