'use server'

import { createClient } from '@/lib/supabase/server'

export async function getAdvancedAnalyticsAction(studioId: string, outletId?: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_advanced_analytics', { 
        p_studio_id: studioId, 
        p_outlet_id: outletId 
    })
    
    if (error) throw error
    return data
}
