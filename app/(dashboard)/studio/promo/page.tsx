import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PromoPageClient from './PromoPageClient'
import { getCachedStudio } from '@/lib/studio/data'

export default async function PromoCodesPage() {
    const studio = await getCachedStudio()
    if (!studio) notFound()

    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) redirect('/login')

    // Fetch existing promo codes
    const { data: promoCodes } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('studio_id', studio.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

    // Fetch memberships and packages for selection
    const [
        { data: memberships }, 
        { data: packages }
    ] = await Promise.all([
        supabase.from('memberships').select('id, name').eq('studio_id', studio.id).eq('is_deleted', false),
        supabase.from('packages').select('id, name').eq('studio_id', studio.id).eq('is_deleted', false)
    ])

    return (
        <PromoPageClient 
            promoCodes={promoCodes || []} 
            pricingItems={[
                ...(memberships || []).map(m => ({ ...m, type: 'membership' })),
                ...(packages || []).map(p => ({ ...p, type: 'package' }))
            ]}
            studioId={studio.id}
        />
    )
}
