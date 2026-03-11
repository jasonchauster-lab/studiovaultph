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

    // Check verification status
    const { data: certs } = await supabase
        .from('certifications')
        .select('verified')
        .eq('instructor_id', user.id)
        .limit(1)

    const cert = certs && certs.length > 0 ? certs[0] : null

    // If not verified (or no cert at all), redirect to onboarding
    if (!cert || !cert.verified) {
        redirect('/instructor/onboarding')
    }

    const params = await searchParams

    // --- DATA FETCHING ---
    const todayStr = getManilaTodayStr();
    // Use local time for standard formatting to compare with DB
    const nowTimeStr = toManilaTimeString(new Date());

    try {
        // 1. Fetch Sidebar "Upcoming" (Global)
        const { data: sidebarData } = await supabase
            .from('bookings')
            .select(`
                *,
                created_at,
                updated_at,
                price_breakdown,
                slots!inner (
                    date,
                    start_time,
                    end_time,
                    equipment,
                    quantity,
                    studios (
                        id,
                        name,
                        location,
                        logo_url,
                        owner_id
                    )
                ),
                client:profiles!client_id (
                    full_name,
                    email,
                    avatar_url,
                    bio,
                    medical_conditions,
                    other_medical_condition,
                    date_of_birth
                )
            `)
            .eq('instructor_id', user.id)
            .eq('status', 'approved')
            .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`, { foreignTable: 'slots' })
            .order('date', { foreignTable: 'slots', ascending: true })
            .order('start_time', { foreignTable: 'slots', ascending: true })
            .limit(5);

        // 2. Determine visible week
        const dateParam = params.date || todayStr;
        const currentDate = new Date(dateParam + "T00:00:00+08:00");
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        const startDateStr = format(weekStart, 'yyyy-MM-dd');
        const endDateStr = format(weekEnd, 'yyyy-MM-dd');

        // 3. Fetch Calendar Bookings (Range bound)
        const { data: calendarData } = await supabase
            .from('bookings')
            .select(`
                *,
                created_at,
                updated_at,
                price_breakdown,
                slots!inner (
                    id,
                    date,
                    start_time,
                    end_time,
                    equipment,
                    quantity,
                    studios (
                        id,
                        name,
                        location,
                        logo_url,
                        owner_id
                    )
                ),
                client:profiles!client_id (
                    full_name,
                    email,
                    avatar_url,
                    bio,
                    medical_conditions,
                    other_medical_condition,
                    date_of_birth
                )
            `)
            .eq('instructor_id', user.id)
            .gte('slots.date', startDateStr)
            .lte('slots.date', endDateStr);

        // 4. Fetch Available Balance (Static)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, available_balance, teaching_equipment, rates')
            .eq('id', user.id)
            .maybeSingle(); // Use maybeSingle to avoid error if not found

        if (profileError) console.error('Profile fetch error:', profileError);

        // 5. Check for Pending Payouts (Static)
        const { data: pendingPayouts } = await supabase
            .from('payout_requests')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .limit(1);
        const hasPendingPayout = !!(pendingPayouts && pendingPayouts.length > 0);

        // 6. Fetch Existing Availability for this week
        const { data: availabilityData } = await supabase
            .from('instructor_availability')
            .select('*')
            .eq('instructor_id', user.id)
            .or(`date.is.null,and(date.gte.${startDateStr},date.lte.${endDateStr})`)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });

        // 7. Fetch Total Sessions Taught (Historical)
        const { count: sessionCount } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('instructor_id', user.id)
            .in('status', ['approved', 'completed']);

        // 8. Fetch Pending Earnings
        const { data: upcomingApproved } = await supabase
            .from('bookings')
            .select('price_breakdown, slots!inner(id, date, start_time)')
            .eq('instructor_id', user.id)
            .eq('status', 'approved')
            .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`, { foreignTable: 'slots' });

        const pendingEarnings = upcomingApproved?.reduce((sum, b) => {
            const fee = (b.price_breakdown as any)?.instructor_fee || 0;
            return sum + fee;
        }, 0) || 0;

        return (
            <InstructorDashboardClient
                userId={user.id}
                initialCalendarBookings={calendarData || []}
                initialUpcomingBookings={sidebarData || []}
                availableBalance={profile?.available_balance || 0}
                hasPendingPayout={hasPendingPayout}
                availability={availabilityData || []}
                totalSessionsTaught={sessionCount || 0}
                pendingEarnings={pendingEarnings}
                currentDateStr={dateParam}
                instructorProfile={profile}
            />
        )
    } catch (error) {
        console.error('CRITICAL: Dashboard Data Fetching Error:', error);
        throw error; // Re-throw to be caught by error.tsx
    }
}

