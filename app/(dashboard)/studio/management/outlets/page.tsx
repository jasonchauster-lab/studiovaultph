import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import OutletManagementView from '@/components/management/OutletManagementView'
import { getCachedStudio, getCachedOutlets } from '@/lib/studio/data'

export default async function OutletsManagementPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Fetch Studio & Outlets (Memoized)
    const studio = await getCachedStudio()
    
    if (!studio) {
        return <div className="p-8 text-charcoal/60">Studio not found.</div>
    }

    const outlets = await getCachedOutlets(studio.id)


    return (
        <div className="max-w-6xl mx-auto py-10 px-6">
            <OutletManagementView 
                studioId={studio.id}
                initialOutlets={outlets || []}
            />
        </div>
    )
}
