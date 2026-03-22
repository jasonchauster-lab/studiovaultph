import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InstructorDashboardClient from '@/components/dashboard/InstructorDashboardClient'
import { getManilaTodayStr, toManilaTimeString } from '@/lib/timezone'
import { startOfWeek, endOfWeek, format } from 'date-fns'

export default async function InstructorDashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const params = await searchParams

    // --- DATA FETCHING ---
    const todayStr = getManilaTodayStr();
    // Use local time for standard formatting to compare with DB
    const nowTimeStr = toManilaTimeString(new Date());

    // Determine visible week (computed before try so all queries run in parallel)
    const dateParam = params.date || todayStr;
    const currentDate = new Date(dateParam + "T00:00:00Z");
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const startDateStr = format(weekStart, 'yyyy-MM-dd');
    const endDateStr = format(weekEnd, 'yyyy-MM-dd');

    // 3. Unified fetch for all dashboard data via optimized RPC
    const { data: dashboardData, error } = await supabase.rpc('get_instructor_dashboard_stats_v2', {
        p_instructor_id: user.id,
        p_today: todayStr,
        p_now_time: nowTimeStr,
        p_week_start: startDateStr,
        p_week_end: endDateStr
    });

    if (error) {
        console.error('[Dashboard] RPC Error:', error);
        // Fallback or error state could be handled here
    }

    // Check verification status
    if (!dashboardData?.is_verified) {
        redirect('/instructor/onboarding');
    }

    return (
        <InstructorDashboardClient
            userId={user.id}
            initialCalendarBookings={dashboardData?.calendar_bookings || []}
            initialUpcomingBookings={dashboardData?.upcoming_bookings || []}
            availableBalance={dashboardData?.balance || 0}
            hasPendingPayout={dashboardData?.has_pending_payout || false}
            availability={dashboardData?.availability || []}
            totalSessionsTaught={dashboardData?.total_sessions || 0}
            pendingEarnings={dashboardData?.pending_earnings || 0}
            currentDateStr={dateParam}
            instructorProfile={dashboardData?.profile || { id: user.id, teaching_equipment: [], rates: {} }}
        />
    )
}

