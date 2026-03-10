'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Slot } from '@/types';
import { Loader2, User, Calendar, Wallet, ArrowUpRight, MessageSquare, ChevronRight, MapPin, Box, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import ChatWindow from '@/components/dashboard/ChatWindow';
import MessageCountBadge from '@/components/dashboard/MessageCountBadge';
import { formatManilaDateStr, formatTo12Hour, getManilaTodayStr, toManilaDateStr } from '@/lib/timezone';
import { useSearchParams } from 'next/navigation';
import CancelBookingModal from './CancelBookingModal';
import { cancelBookingByInstructor } from '@/app/(dashboard)/instructor/actions';
import InstructorScheduleCalendar from '@/components/instructor/InstructorScheduleCalendar';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import InstructorStatCards from './InstructorStatCards';

export default function InstructorDashboardClient() {
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [calendarBookings, setCalendarBookings] = useState<any[]>([]);
    const [upcomingBookings, setUpcomingBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [availableBalance, setAvailableBalance] = useState<number | null>(null);
    const [hasPendingPayout, setHasPendingPayout] = useState(false);
    const [availability, setAvailability] = useState<any[]>([]);

    // Analytics states
    const [totalSessionsTaught, setTotalSessionsTaught] = useState(0);
    const [pendingEarnings, setPendingEarnings] = useState(0);

    const [activeChat, setActiveChat] = useState<{ id: string, recipientId: string, name: string, isExpired: boolean } | null>(null);
    const [cancellingBooking, setCancellingBooking] = useState<any>(null);
    const [selectedClient, setSelectedClient] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);

            if (user) {
                // 1. Fetch Sidebar "Upcoming" (Global)
                const todayStr = getManilaTodayStr();
                const nowTimeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

                const { data: sidebarData } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        price_breakdown,
                        slots!inner (
                            date,
                            start_time,
                            end_time,
                            equipment,
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
                            medical_conditions
                        )
                    `)
                    .eq('instructor_id', user.id)
                    .eq('status', 'approved')
                    .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`, { foreignTable: 'slots' })
                    .order('slots(date)', { ascending: true })
                    .order('slots(start_time)', { ascending: true })
                    .limit(5);

                if (sidebarData) setUpcomingBookings(sidebarData);

                // 2. Determine visible week for dynamic calendar fetching
                const dateParam = searchParams.get('date') || todayStr;
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
                        price_breakdown,
                        slots!inner (
                            id,
                            date,
                            start_time,
                            end_time,
                            equipment,
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
                            medical_conditions
                        )
                    `)
                    .eq('instructor_id', user.id)
                    .gte('slots.date', startDateStr)
                    .lte('slots.date', endDateStr);

                if (calendarData) setCalendarBookings(calendarData);

                // 4. Fetch Available Balance (Static)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('available_balance')
                    .eq('id', user.id)
                    .single();
                if (profile) setAvailableBalance(profile.available_balance || 0);

                // 5. Check for Pending Payouts (Static)
                const { data: pendingPayouts } = await supabase
                    .from('payout_requests')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('status', 'pending')
                    .limit(1);
                setHasPendingPayout(!!(pendingPayouts && pendingPayouts.length > 0));

                // 6. Fetch Existing Availability for this week (Specific or Recurring)
                const { data: availabilityData } = await supabase
                    .from('instructor_availability')
                    .select('*')
                    .eq('instructor_id', user.id)
                    .or(`date.is.null,and(date.gte.${startDateStr},date.lte.${endDateStr})`)
                    .order('day_of_week', { ascending: true })
                    .order('start_time', { ascending: true });

                if (availabilityData) setAvailability(availabilityData);

                // 7. Fetch Total Sessions Taught (Historical)
                const { count: sessionCount } = await supabase
                    .from('bookings')
                    .select('*', { count: 'exact', head: true })
                    .eq('instructor_id', user.id)
                    .in('status', ['approved', 'completed']);
                setTotalSessionsTaught(sessionCount || 0);

                // 8. Fetch Pending Earnings (Total upcoming approved)
                const { data: upcomingApproved } = await supabase
                    .from('bookings')
                    .select('price_breakdown, slots!inner(id)')
                    .eq('instructor_id', user.id)
                    .eq('status', 'approved')
                    .or(`date.gt.${todayStr},and(date.eq.${todayStr},start_time.gte.${nowTimeStr})`, { foreignTable: 'slots' });

                const pending = upcomingApproved?.reduce((sum, b) => {
                    const fee = (b.price_breakdown as any)?.instructor_fee || 0;
                    return sum + fee;
                }, 0) || 0;
                setPendingEarnings(pending);
            }

            setIsLoading(false);
        }

        fetchData();
    }, [searchParams.get('date')]);

    const isChatExpired = (booking: any) => {
        const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots;
        if (!slot?.end_time || !slot?.date) return false;
        const endTime = new Date(`${slot.date}T${slot.end_time}+08:00`);
        const expirationTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000);
        return new Date() > expirationTime;
    };

    const handleCancelConfirm = async (reason: string) => {
        if (!cancellingBooking) return { error: 'No booking selected' };
        const result = await cancelBookingByInstructor(cancellingBooking.id, reason);
        if (result.success) {
            setCalendarBookings(prev => prev.filter(b => b.id !== cancellingBooking.id));
            setUpcomingBookings(prev => prev.filter(b => b.id !== cancellingBooking.id));
        }
        return result;
    };

    return (
        <div className="space-y-16 pb-20">
            {/* Sticky Header */}
            <div className="sticky-header-antigravity -mx-8 lg:-mx-12 mb-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
                    <div>
                        <h1 className="text-5xl font-serif text-charcoal tracking-tighter mb-3">Instructor Dashboard</h1>
                        <p className="text-[10px] font-bold text-slate uppercase tracking-[0.4em]">Manage your professional schedule and earnings with grounded precision.</p>
                    </div>


                </div>
            </div>

            {/* Analytics Cards */}
            <InstructorStatCards
                stats={{
                    balance: availableBalance || 0,
                    upcomingSessions: calendarBookings.filter(b => b.status === 'approved').length,
                    totalHours: totalSessionsTaught,
                    pendingEarnings: pendingEarnings
                }}
                hasPendingPayout={hasPendingPayout}
            />

            {/* Dashboard Grid Container */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-2">
                    <InstructorScheduleCalendar
                        availability={availability}
                        bookings={calendarBookings}
                        currentUserId={userId || ''}
                        currentDate={new Date(searchParams.get('date') || getManilaTodayStr())}
                    />
                </div>

                {/* Upcoming Bookings Sidebar */}
                <div className="space-y-10">
                    <div className="earth-card overflow-hidden">
                        <div className="bg-white p-6 border-b border-border-grey flex items-center justify-between">
                            <h2 className="text-[10px] font-black text-slate uppercase tracking-[0.3em] flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-forest" />
                                Upcoming Bookings
                            </h2>
                            <span className="text-[8px] font-black text-forest/60 border border-forest/20 px-3 py-1 rounded-full uppercase tracking-[0.2em]">Next 5 Sessions</span>
                        </div>
                        <div className="p-6">
                            {(() => {
                                if (isLoading) {
                                    return (
                                        <div className="py-12 flex justify-center">
                                            <Loader2 className="w-6 h-6 text-forest animate-spin" />
                                        </div>
                                    );
                                }

                                if (upcomingBookings.length === 0) {
                                    return (
                                        <div className="py-24 text-center bg-off-white rounded-lg border-2 border-dashed border-border-grey flex flex-col items-center justify-center">
                                            <Calendar className="w-12 h-12 text-slate/20 mx-auto mb-6" />
                                            <h3 className="text-[10px] font-black text-slate uppercase tracking-[0.4em] mb-1">Quiet Week</h3>
                                            <p className="text-[9px] text-slate/40 font-black uppercase tracking-[0.2em] max-w-[200px] mx-auto">Your upcoming scheduled sessions will appear here.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-6">
                                        {upcomingBookings.map(session => (
                                            <div key={session.id} className="p-6 border border-border-grey bg-white rounded-lg hover:bg-off-white transition-all duration-300 shadow-tight group relative">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className="flex flex-col gap-1 w-full">
                                                        <div className="flex items-center gap-4">
                                                            <Link href={`/studios/${session.slots.studios.id}`} className="w-12 h-12 rounded-[12px] overflow-hidden border border-white bg-white shadow-sm shrink-0 hover:scale-105 transition-transform duration-700">
                                                                <img
                                                                    src={session.slots.studios.logo_url || "/logo.png"}
                                                                    alt={session.slots.studios.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </Link>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <Link href={`/studios/${session.slots.studios.id}`} className="text-[11px] font-black text-charcoal uppercase tracking-[0.2em] truncate hover:text-forest transition-colors">
                                                                        {session.slots.studios.name}
                                                                    </Link>
                                                                    <span className="status-pill-earth status-pill-green shrink-0">
                                                                        BOOKED
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-slate font-black uppercase tracking-[0.1em] mt-1.5">
                                                                    <Calendar className="w-3.5 h-3.5 text-forest/40" />
                                                                    <span>{formatManilaDateStr(session.slots.date)} • {formatTo12Hour(session.slots.start_time)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-white/60 space-y-4">
                                                    <div
                                                        className="flex items-center gap-3 cursor-pointer group/client"
                                                        onClick={() => setSelectedClient(session.client)}
                                                    >
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-border-grey shadow-tight group-hover/client:scale-110 transition-transform duration-300">
                                                            <img src={session.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.client?.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="text-[10px] text-slate uppercase tracking-[0.2em] truncate flex-1 group-hover/client:text-forest transition-colors">
                                                            CLIENT: <span className="font-black text-charcoal">{session.client?.full_name}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between text-[10px] pt-1">
                                                        <div className="flex items-center gap-3">
                                                            <Box className="w-4 h-4 text-forest/40" />
                                                            <span className="font-black text-slate truncate max-w-[120px] uppercase tracking-[0.2em]">
                                                                {Array.isArray(session.slots?.equipment) && session.slots.equipment.length > 0
                                                                    ? `${session.slots.equipment[0]}`
                                                                    : (`${session.price_breakdown?.equipment || 'Standard'}`)
                                                                } ({session.quantity || 1})
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setActiveChat({
                                                                        id: session.id,
                                                                        recipientId: session.client_id,
                                                                        name: session.client.full_name,
                                                                        isExpired: isChatExpired(session)
                                                                    })
                                                                }}
                                                                className="w-9 h-9 bg-white text-forest border border-border-grey rounded-full hover:bg-forest hover:text-white transition-all duration-300 flex items-center justify-center shadow-tight relative group/btn"
                                                                title="Message Client"
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                                <MessageCountBadge bookingId={session.id} currentUserId={userId || ''} partnerId={session.client_id} isOpen={activeChat?.id === session.id && activeChat?.recipientId === session.client_id} />
                                                            </button>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setActiveChat({
                                                                        id: session.id,
                                                                        recipientId: session.slots.studios.owner_id,
                                                                        name: session.slots.studios.name,
                                                                        isExpired: isChatExpired(session)
                                                                    })
                                                                }}
                                                                className="w-9 h-9 bg-white text-charcoal border border-border-grey rounded-full hover:bg-forest hover:text-white transition-all duration-300 flex items-center justify-center shadow-tight relative group/btn2"
                                                                title="Message Studio"
                                                            >
                                                                <MessageSquare className="w-3.5 h-3.5" />
                                                                <MessageCountBadge bookingId={session.id} currentUserId={userId || ''} partnerId={session.slots.studios.owner_id} isOpen={activeChat?.id === session.id && activeChat?.recipientId === session.slots.studios.owner_id} />
                                                            </button>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setCancellingBooking(session);
                                                                }}
                                                                className="w-9 h-9 bg-white text-red-600 border border-border-grey rounded-full hover:bg-red-600 hover:text-white transition-all duration-300 flex items-center justify-center shadow-tight"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals & Chat */}
            {activeChat && (
                <ChatWindow
                    bookingId={activeChat.id}
                    recipientId={activeChat.recipientId}
                    recipientName={activeChat.name}
                    onClose={() => setActiveChat(null)}
                    currentUserId={userId || ''}
                    isExpired={activeChat.isExpired}
                    isOpen={true}
                />
            )}

            {cancellingBooking && (
                <CancelBookingModal
                    isOpen={true}
                    onClose={() => setCancellingBooking(null)}
                    onConfirm={handleCancelConfirm}
                    title="Cancel Session"
                    description="Are you sure you want to cancel this session? The client and studio owner will be notified."
                />
            )}

            {selectedClient && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal/40 animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                    <div className="earth-card w-full max-w-sm overflow-hidden p-10 relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-8 right-8 text-slate/20 hover:text-charcoal transition-colors p-2 bg-white rounded-lg border border-border-grey shadow-tight"><X className="w-5 h-5" /></button>

                        <div className="flex flex-col items-center mt-6 mb-10 text-center relative z-10">
                            <div className="w-28 h-28 rounded-full overflow-hidden mb-6 border-4 border-white shadow-tight scale-110 relative">
                                <img src={selectedClient.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-3xl font-serif text-charcoal tracking-tighter">{selectedClient.full_name}</h3>
                            <p className="text-[10px] font-black text-slate uppercase tracking-[0.3em] mt-2">{selectedClient.email}</p>
                        </div>

                        {selectedClient.medical_conditions ? (
                            <div className="bg-red-50 p-8 rounded-lg border border-red-200 relative z-10">
                                <h4 className="text-[10px] font-black text-red-800 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                    <AlertCircle className="w-4 h-4" />
                                    Medical Conditions
                                </h4>
                                <p className="text-xs text-red-900 leading-relaxed font-medium italic">{selectedClient.medical_conditions}</p>
                            </div>
                        ) : (
                            <div className="bg-green-50 p-8 rounded-lg border border-green-200 relative z-10">
                                <h4 className="text-[10px] font-black text-forest uppercase tracking-[0.3em] mb-2">Health Status</h4>
                                <p className="text-[11px] text-forest/60 font-black uppercase tracking-[0.1em]">Clear / No conditions reported.</p>
                            </div>
                        )}

                        <button
                            onClick={() => setSelectedClient(null)}
                            className="w-full mt-10 py-5 bg-charcoal text-white rounded-lg text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-tight active:scale-95 z-10 relative"
                        >
                            CLOSE RECORD
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
