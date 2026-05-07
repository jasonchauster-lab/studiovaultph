'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import { verifyStudioAccess } from '@/lib/studio/auth'

export async function getPayrollData(studioId: string, startDate?: string, endDate?: string) {
    const supabase = await createClient()
    
    // Permission Check: Owner or staff with view_payroll permission
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { isOwner, permissions } = await verifyStudioAccess(studioId)
    if (!isOwner && !permissions?.view_payroll) {
        throw new Error('Permission denied: view_payroll required')
    }

    const start = startDate || format(startOfMonth(new Date()), 'yyyy-MM-dd')
    const end = endDate || format(endOfMonth(new Date()), 'yyyy-MM-dd')

    // 1. Fetch members and studio info (Using Admin to bypass RLS for consistent reporting)
    const adminSupabase = createAdminClient()
    const [{ data: members, error: membersError }, { data: studio }] = await Promise.all([
        adminSupabase
            .from('studio_members')
            .select(`
                profile_id,
                base_pay_rate,
                commission_type,
                commission_value,
                commission_threshold
            `)
            .eq('studio_id', studioId),
        adminSupabase
            .from('studios')
            .select('owner_id')
            .eq('id', studioId)
            .single()
    ])

    if (membersError) throw membersError

    // Combine studio_members with owner to ensure all instructors show up
    const allMemberConfigs = [...(members || [])]
    if (studio?.owner_id && !allMemberConfigs.find(m => m.profile_id === studio.owner_id)) {
        allMemberConfigs.push({
            profile_id: studio.owner_id,
            base_pay_rate: 0,
            commission_type: 'none',
            commission_value: 0,
            commission_threshold: 0
        })
    }

    // 2. Fetch Profiles separately to avoid RLS join issues
    const profileIds = allMemberConfigs.map(m => m.profile_id).filter(Boolean)
    if (profileIds.length === 0) return []

    const { data: profiles, error: profilesError } = await adminSupabase
        .from('profiles')
        .select('id, full_name')
        .in('id', profileIds)

    if (profilesError) throw profilesError
    const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p
        return acc
    }, {})

    const payroll = await Promise.all(allMemberConfigs.map(async (member: any) => {
        try {
            const profile = profilesMap[member.profile_id]
            if (!profile) return null

            // 3. Fetch attended bookings for this instructor
            // We join with slots to get the session date, as booking_date is only for home sessions
            const { data: bookings, error: bookingsError } = await adminSupabase
                .from('bookings')
                .select(`
                    id, 
                    quantity, 
                    status, 
                    slot_id, 
                    total_price,
                    booking_date,
                    slots!left(date)
                `)
                .eq('instructor_id', profile.id)
                .eq('studio_id', studioId)
                .eq('status', 'completed')

            if (bookingsError) {
                console.error(`[getPayrollData] Error fetching bookings for ${profile.full_name}:`, JSON.stringify(bookingsError))
                return {
                    instructorId: profile.id,
                    instructorName: profile.full_name,
                    totalClasses: 0,
                    totalStudents: 0,
                    totalEarnings: 0,
                    basePayRate: member.base_pay_rate || 0,
                    commissionType: member.commission_type || 'none',
                    commissionValue: member.commission_value || 0,
                    commissionThreshold: member.commission_threshold || 0
                }
            }

            // Filter bookings by date in JS to handle both slot-based and home sessions
            const filteredBookings = (bookings || []).filter(b => {
                const sessionDate = (b.slots as any)?.date || b.booking_date
                if (!sessionDate) return false
                return sessionDate >= start && sessionDate <= end
            })

            // Group bookings by slot_id to calculate per-session pay and threshold-based commission
            const slots: Record<string, { students: number, revenue: number }> = {}
            filteredBookings.forEach(b => {
                const slotKey = b.slot_id || `home-${b.id}`
                if (!slots[slotKey]) slots[slotKey] = { students: 0, revenue: 0 }
                slots[slotKey].students += (b.quantity || 1)
                slots[slotKey].revenue += (b.total_price || 0)
            })

            let totalEarnings = 0
            const slotList = Object.values(slots)
            
            slotList.forEach(s => {
                // 1. Base Pay per session
                totalEarnings += (member.base_pay_rate || 0)

                // 2. Commission (only if threshold is met)
                if (s.students >= (member.commission_threshold || 0)) {
                    if (member.commission_type === 'flat') {
                        totalEarnings += s.students * (member.commission_value || 0)
                    } else if (member.commission_type === 'percentage') {
                        totalEarnings += s.revenue * ((member.commission_value || 0) / 100)
                    }
                }
            })

            return {
                instructorId: profile.id,
                instructorName: profile.full_name,
                totalClasses: slotList.length,
                totalStudents: filteredBookings.reduce((sum, b) => sum + (b.quantity || 1), 0),
                totalEarnings,
                basePayRate: member.base_pay_rate || 0,
                commissionType: member.commission_type || 'none',
                commissionValue: member.commission_value || 0,
                commissionThreshold: member.commission_threshold || 0
            }
        } catch (err) {
            console.error(`[getPayrollData] Critical error for member ${member.profile_id}:`, err)
            return null
        }
    }))

    return payroll.filter(p => p !== null)
}

export async function updateInstructorPayrollConfig(
    studioId: string, 
    profileId: string, 
    config: { 
        basePayRate: number, 
        commissionType: string, 
        commissionValue: number, 
        commissionThreshold: number 
    }
) {
    // Security Check: Only owners or staff with view_payroll (or manage_staff) can update this
    const { isOwner, permissions } = await verifyStudioAccess(studioId)
    if (!isOwner && !permissions?.view_payroll) {
        throw new Error('Permission denied: view_payroll required')
    }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('studio_members')
        .upsert({ 
            studio_id: studioId,
            profile_id: profileId,
            base_pay_rate: config.basePayRate, 
            commission_type: config.commissionType,
            commission_value: config.commissionValue,
            commission_threshold: config.commissionThreshold,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'studio_id,profile_id'
        })
    
    if (error) throw error
    return { success: true }
}
