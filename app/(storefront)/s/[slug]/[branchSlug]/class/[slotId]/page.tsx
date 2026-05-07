import { getStorefrontSlot } from '@/lib/studio/website'
import { getActivePlans } from '@/app/(dashboard)/customer/pricing-actions'
import { createClient } from '@/lib/supabase/server'
import { getStudioBrandingBySlug } from '@/lib/studio/branding'
import ClassPageClient from '@/components/storefront/ClassPageClient'
import { notFound } from 'next/navigation'

export default async function ClassPage({
    params
}: {
    params: Promise<{ slug: string; branchSlug: string; slotId: string }>
}) {
    const { slug, branchSlug, slotId } = await params
    
    // 1. Fetch Slot Details
    const slot = await getStorefrontSlot(slotId)
    if (!slot) return notFound()

    const supabase = await createClient()

    // 2. Fetch Studio Branding and Policies
    const studioBranding = await getStudioBrandingBySlug(slug)
    
    const { data: refundPolicy } = await supabase
        .from('studio_policies')
        .select('*')
        .eq('studio_id', slot.studio_id)
        .eq('type', 'refund')
        .eq('status', 'Active')
        .maybeSingle()

    // 3. Fetch User and Plans
    const { data: { user } } = await supabase.auth.getUser()
    
    let userPlans: any[] = []
    if (user) {
        userPlans = await getActivePlans(slot.studio_id)
    }

    return (
        <ClassPageClient 
            slot={slot}
            slug={slug}
            branchSlug={branchSlug}
            userPlans={userPlans}
            isLoggedIn={!!user}
            studioBranding={studioBranding}
            refundPolicy={refundPolicy}
        />
    )
}
