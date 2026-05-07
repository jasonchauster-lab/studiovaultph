'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { verifyStudioAccess } from '@/lib/studio/auth'

export interface OnboardingStatus {
    identity: boolean        // Business Profile (Name + Industry)
    infrastructure: boolean  // At least 1 branch
    equipment: boolean       // At least 1 equipment
    team: boolean            // At least 1 instructor (other than owner)
    pricing: boolean         // At least 1 pricing item/package
    website: boolean         // Website config updated
    waiver: boolean          // Waiver form setup
    finance: boolean         // Tax settings
    payouts: boolean         // Bank/GCash details
    operations: boolean      // At least 1 class scheduled
    isPublic: boolean        // Marketplace toggle
    progress: number         // 0-100
}

export async function getStudioOnboardingStatusAction(studioId: string): Promise<OnboardingStatus> {
    const supabase = await createClient()

    await verifyStudioAccess(studioId)

    // 1. Fetch Studio Core Data (Using Admin to bypass RLS since we already verified access above)
    // We use a separate query for payment configs to avoid .single() failing if the config doesn't exist yet.
    const adminSupabase = createAdminClient()
    let studio = null
    let paymentConfig = null

    try {
        const { data: studioRes, error: studioError } = await adminSupabase
            .from('studios')
            .select('id, name, business_industry, inventory, website_config, is_public, manual_payment_methods')
            .eq('id', studioId)
            .maybeSingle()
        
        if (studioError) {
            console.error('[getStudioOnboardingStatusAction] Studio error:', studioError.message || studioError.code || studioError);
        }
        studio = studioRes

        const { data: payRes } = await adminSupabase
            .from('studio_payment_configs')
            .select('xendit_api_key')
            .eq('studio_id', studioId)
            .maybeSingle()
        paymentConfig = payRes
    } catch (err) {
        console.error('[getStudioOnboardingStatusAction] Critical fetch failure:', err)
    }

    if (!studio) {
        // Safe fallback
        return {
            identity: false, infrastructure: false, equipment: false, team: false, pricing: false,
            website: false, waiver: false, finance: false, payouts: false, operations: false,
            isPublic: false, progress: 0
        }
    }

    // 2. Fetch Multi-table Dependencies
    const [
        { data: outletsData },
        { count: pricingItemsCount },
        { count: staffCount },
        { count: slotsCount },
        { count: packagesCount },
        { count: taxesCount },
        { count: waiverTemplatesCount }
    ] = await Promise.all([
        supabase.from('outlets').select('address').eq('studio_id', studioId),
        supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('studio_id', studioId),
        supabase.from('studio_members').select('id', { count: 'exact', head: true }).eq('studio_id', studioId),
        supabase.from('slots').select('id', { count: 'exact', head: true }).eq('studio_id', studioId),
        supabase.from('packages').select('id', { count: 'exact', head: true }).eq('studio_id', studioId),
        supabase.from('studio_taxes').select('id', { count: 'exact', head: true }).eq('studio_id', studioId),
        supabase.from('waiver_templates').select('id', { count: 'exact', head: true }).eq('studio_id', studioId)
    ])

    const hasAddress = outletsData?.some(o => o.address && o.address.length > 5)

    // 3. Define Completion Criteria
    const status = {
        identity: !!(studio.name && studio.business_industry),
        infrastructure: !!hasAddress,
        equipment: !!(studio.inventory && Object.keys(studio.inventory).length > 0),
        team: (staffCount || 0) > 0,
        pricing: (pricingItemsCount || 0) > 0 || (packagesCount || 0) > 0,
        website: !!(studio.website_config && (studio.website_config as any).is_published),
        waiver: (waiverTemplatesCount || 0) > 0,
        finance: (taxesCount || 0) > 0,
        payouts: !!(studio.manual_payment_methods?.length > 0 || (paymentConfig as any)?.xendit_api_key),
        operations: (slotsCount || 0) > 0,
        isPublic: !!studio.is_public
    }

    // 4. Calculate Progress (Exclude isPublic from the 10 core tasks)
    const taskValues = [
        status.identity, status.infrastructure, status.equipment, status.team, 
        status.pricing, status.website, status.waiver, status.finance, 
        status.payouts, status.operations
    ]
    const completedCount = taskValues.filter(v => v === true).length
    const progress = Math.round((completedCount / taskValues.length) * 100)

    return {
        ...status,
        progress
    }
}
