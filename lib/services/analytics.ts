import { createClient } from '@/lib/supabase/server'

export class AnalyticsService {
    /**
     * Fetches advanced analytics data for a studio and optionally an outlet.
     * Uses the 'get_advanced_analytics' RPC for optimized aggregation.
     */
    static async getAdvancedAnalytics(studioId: string, outletId?: string) {
        const supabase = await createClient()
        const { data, error } = await supabase.rpc('get_advanced_analytics', { 
            p_studio_id: studioId, 
            p_outlet_id: outletId 
        })
        
        if (error) {
            console.error('[AnalyticsService.getAdvancedAnalytics] RPC Error:', { studioId, outletId, error })
            throw error
        }
        
        return data
    }

    /**
     * Potential future expansion: Fetch granular daily metrics
     */
    static async getDailyMetrics(studioId: string, startDate: string, endDate: string) {
        const supabase = await createClient()
        // Placeholder for future metrics implementation
        return []
    }
}
