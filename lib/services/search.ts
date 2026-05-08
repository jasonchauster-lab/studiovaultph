import { createClient } from '@/lib/supabase/server'
import { verifyStudioAccess } from '@/lib/studio/auth'

export type SearchResult = {
    id: string
    title: string
    description: string
    category: 'Customers' | 'Products' | 'Sessions' | 'Pricing'
    link: string
    metadata?: any
}

export class SearchService {
    /**
     * Executes a parallelized search across core studio modules.
     * Enforces permission boundaries per category.
     */
    static async globalSearch(query: string, studioId: string): Promise<SearchResult[]> {
        if (!query || query.length < 2) return []

        const supabase = await createClient()
        const { isOwner, permissions } = await verifyStudioAccess(studioId)
        
        const searchTasks: Promise<SearchResult[]>[] = []

        // 1. Search Customers (Requires view_crm)
        if (isOwner || permissions.view_crm) {
            searchTasks.push(this.searchCustomers(supabase, studioId, query))
        }

        // 2. Search Inventory (Requires view_inventory - assuming view_inventory exists or is implied)
        if (isOwner || permissions.manage_inventory) {
            searchTasks.push(this.searchInventory(supabase, studioId, query))
        }

        // 3. Search Schedule (Requires view_schedule)
        if (isOwner || permissions.view_schedule || permissions.manage_schedule) {
            searchTasks.push(this.searchSchedule(supabase, studioId, query))
        }

        // 4. Search Pricing (Requires view_pricing)
        if (isOwner || permissions.manage_pricing) {
            searchTasks.push(this.searchPricing(supabase, studioId, query))
        }

        const results = await Promise.all(searchTasks)
        return results.flat()
    }

    private static async searchCustomers(supabase: any, studioId: string, query: string): Promise<SearchResult[]> {
        const { data } = await supabase
            .from('customer_stats_view')
            .select('profile_id, full_name, email')
            .eq('studio_id', studioId)
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(5)

        return (data || []).map((c: any) => ({
            id: c.profile_id,
            title: c.full_name,
            description: c.email,
            category: 'Customers',
            link: `/studio/customers/${c.profile_id}`
        }))
    }

    private static async searchInventory(supabase: any, studioId: string, query: string): Promise<SearchResult[]> {
        const { data } = await supabase
            .from('inventory_items')
            .select('id, name, sku, category')
            .eq('studio_id', studioId)
            .eq('is_deleted', false)
            .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
            .limit(5)

        return (data || []).map((i: any) => ({
            id: i.id,
            title: i.name,
            description: `${i.category || 'General'} • ${i.sku || 'No SKU'}`,
            category: 'Products',
            link: `/studio/inventory?search=${encodeURIComponent(i.name)}`
        }))
    }

    private static async searchSchedule(supabase: any, studioId: string, query: string): Promise<SearchResult[]> {
        const { data } = await supabase
            .from('slots')
            .select('id, display_name, session_type, date, start_time')
            .eq('studio_id', studioId)
            .eq('is_deleted', false)
            .or(`display_name.ilike.%${query}%,session_type.ilike.%${query}%`)
            .limit(5)

        return (data || []).map((s: any) => ({
            id: s.id,
            title: s.display_name || s.session_type,
            description: `${s.date} • ${s.start_time.slice(0, 5)}`,
            category: 'Sessions',
            link: `/studio/schedule?date=${s.date}`
        }))
    }

    private static async searchPricing(supabase: any, studioId: string, query: string): Promise<SearchResult[]> {
        const [pkg, mem] = await Promise.all([
            supabase.from('packages').select('id, name').eq('studio_id', studioId).eq('is_deleted', false).ilike('name', `%${query}%`).limit(3),
            supabase.from('memberships').select('id, name').eq('studio_id', studioId).eq('is_deleted', false).ilike('name', `%${query}%`).limit(3)
        ])

        const pkgResults = (pkg.data || []).map((p: any) => ({
            id: p.id,
            title: p.name,
            description: 'Class Package',
            category: 'Pricing',
            link: `/studio/pricing?tab=packages&id=${p.id}`
        }))

        const memResults = (mem.data || []).map((m: any) => ({
            id: m.id,
            title: m.name,
            description: 'Subscription Membership',
            category: 'Pricing',
            link: `/studio/pricing?tab=memberships&id=${m.id}`
        }))

        return [...pkgResults, ...memResults] as SearchResult[]
    }
}
