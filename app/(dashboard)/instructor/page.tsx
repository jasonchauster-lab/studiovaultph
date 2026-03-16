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

    try {
        const [
            certsResult,
            { data: sidebarData, error: sidebarError },
            { data: calendarData, error: calendarError },
            { data: profile, error: profileError },
            { data: pendingPayouts },
            { data: availabilityData, error: availabilityError },
            { count: sessionCount },
            { data: upcomingApproved, error: earningsError },
        ] = await Promise.all([
            // 0. Verification check (run in parallel with data fetches)
            supabase
                .from('certifications')
                .select('verified')
                .eq('instructor_id', user.id)
                .limit(1),
            // 1. Sidebar "Upcoming" (Global)
            supabase
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
                .limit(5),
            // 2. Calendar Bookings (Range bound)
            supabase
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
                .lte('slots.date', endDateStr),
            // 3. Available Balance
            supabase
                .from('profiles')
                .select('id, available_balance, teaching_equipment, rates')
                .eq('id', user.id)
                .maybeSingle(),
            // 4. Pending Payouts
            supabase
                .from('payout_requests')
                .select('id')
                .eq('user_id', user.id)
                .eq('status', 'pending')
                .limit(1),
            // 5. Availability for this week
            supabase
                .from('instructor_availability')
                .select('*')
                .eq('instructor_id', user.id)
                .or(`date.is.null,and(date.gte.${startDateStr},date.lte.${endDateStr})`)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true }),
            // 6. Total Sessions Taught
            supabase
                .from('bookings')
                .select('id', { count: 'exact', head: true })
                .eq('instructor_id', user.id)
                .in('status', ['approved', 'completed']),
            // 7. Pending Earnings
            supabase
                .from('bookings')
                .select('price_breakdown, slots!inner(id, date, start_time)')
                .eq('instructor_id', user.id)
                .eq('status', 'approved')
                .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`, { foreignTable: 'slots' }),
        ]);

        // Check verification status (result fetched in parallel above)
        const cert = certsResult.data && certsResult.data.length > 0 ? certsResult.data[0] : null
        if (!cert || !cert.verified) {
            console.log(`[Dashboard] User ${user.email} (${user.id}) is not verified or has no certs. Redirecting to onboarding.`);
            redirect('/instructor/onboarding')
        }

        if (sidebarError) console.error('[Dashboard] Sidebar fetch error:', sidebarError);
        if (calendarError) console.error('[Dashboard] Calendar fetch error:', calendarError);
        if (profileError) console.error('Profile fetch error:', profileError);
        if (availabilityError) console.error('[Dashboard] Availability fetch error:', availabilityError);
        if (earningsError) console.error('[Dashboard] Earnings fetch error:', earningsError);

        const hasPendingPayout = !!(pendingPayouts && pendingPayouts.length > 0);

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
                instructorProfile={profile || { id: user.id, teaching_equipment: [], rates: {} }}
            />
        )
    } catch (error) {
        console.error('CRITICAL: Dashboard Data Fetching Error:', error);
        throw error; // Re-throw to be caught by error.tsx
    }
}

