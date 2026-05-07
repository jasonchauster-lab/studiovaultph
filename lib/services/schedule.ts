import { createClient } from '@/lib/supabase/server'
import { getCachedStudio } from '@/lib/studio/data'

export class ScheduleService {
    /**
     * Fetches all data required for the Studio Schedule page.
     * Parallelizes requests for optimal performance.
     */
    static async getScheduleContext(studioId: string, options: { 
        outletId?: string, 
        windowStart: string, 
        windowEnd: string 
    }) {
        const supabase = await createClient()

        const [
            slotsResult,
            outletsResult,
            servicesResult,
            staffResult,
            countsResult
        ] = await Promise.all([
            this.getSlots(studioId, options),
            supabase.from('outlets').select('*').eq('studio_id', studioId).order('name'),
            supabase.from('services').select('*').eq('studio_id', studioId).eq('is_deleted', false),
            supabase.from('studio_members').select('*, profile:profiles(*)').eq('studio_id', studioId),
            this.getPlanCounts(studioId)
        ])

        return {
            slots: slotsResult,
            outlets: outletsResult.data || [],
            services: servicesResult.data || [],
            staffMembers: staffResult.data || [],
            ...countsResult
        }
    }

    private static async getSlots(studioId: string, options: { outletId?: string, windowStart: string, windowEnd: string }) {
        const supabase = await createClient()
        let query = supabase
            .from('slots')
            .select(`
                *,
                bookings(
                    *,
                    client:profiles!client_id(full_name, avatar_url),
                    instructor:profiles!instructor_id(full_name, avatar_url)
                )
            `)
            .eq('studio_id', studioId)
            .gte('date', options.windowStart)
            .lte('date', options.windowEnd)

        if (options.outletId) {
            query = query.eq('outlet_id', options.outletId)
        }

        const { data } = await query
        return (data || []).map(slot => ({
            ...slot,
            bookings: (slot.bookings || []).map((b: any) => ({
                ...b,
                client: Array.isArray(b.client) ? b.client[0] : b.client,
                instructor: Array.isArray(b.instructor) ? b.instructor[0] : b.instructor
            }))
        }))
    }

    private static async getPlanCounts(studioId: string) {
        const supabase = await createClient()
        const [pk, mb] = await Promise.all([
            supabase.from('packages').select('id', { count: 'exact', head: true }).eq('studio_id', studioId).eq('is_deleted', false),
            supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('studio_id', studioId).eq('is_deleted', false)
        ])
        return {
            packagesCount: pk.count || 0,
            membershipsCount: mb.count || 0
        }
    }

    /**
     * Map staff members to a unified instructor list including the owner.
     */
    static getInstructorsList(studio: any, staffMembers: any[]) {
        const instructorMap = new Map()

        // Add Owner
        if (studio?.owner) {
            instructorMap.set(studio.owner.id, {
                id: studio.owner.id,
                full_name: studio.owner.full_name,
                avatar_url: studio.owner.avatar_url,
                role: 'owner'
            })
        }

        // Add Staff
        staffMembers?.forEach((m: any) => {
            if (m.profile) {
                instructorMap.set(m.profile.id, {
                    id: m.profile.id,
                    full_name: m.profile.full_name,
                    avatar_url: m.profile.avatar_url,
                    role: m.role
                })
            }
        })

        return Array.from(instructorMap.values())
    }
}
