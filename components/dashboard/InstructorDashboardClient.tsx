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
                    .select('price_breakdown')
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
        <div className="space-y-12 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-serif font-bold text-charcoal tracking-tight mb-2">Instructor Dashboard</h1>
                    <p className="text-charcoal/50 font-medium tracking-wide">Manage your professional schedule and earnings in style.</p>
                </div>

                <div className="flex gap-4">
                    <Link
                        href="/instructor/profile"
                        className="btn-antigravity flex items-center justify-center gap-2 px-8 py-3 text-[11px] uppercase tracking-widest"
                    >
                        <User className="w-4 h-4" />
                        Professional Profile
                    </Link>
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
                        currentDate={new Date(searchParams.get('date') || getManilaTodayStr())}
                    />
                </div>

                {/* Upcoming Bookings Sidebar */}
                <div className="space-y-8">
                    <div className="glass-card overflow-hidden">
                        <div className="bg-sage p-5 flex items-center justify-between">
                            <h2 className="text-[11px] font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Upcoming Bookings
                            </h2>
                            <span className="text-[9px] font-bold text-white/60 border border-white/20 px-3 py-1 rounded-full uppercase tracking-tighter">Next 5 Sessions</span>
                        </div>
                        <div className="p-6">
                            {(() => {
                                if (isLoading) {
                                    return (
                                        <div className="py-12 flex justify-center">
                                            <Loader2 className="w-6 h-6 text-sage animate-spin" />
                                        </div>
                                    );
                                }

                                if (upcomingBookings.length === 0) {
                                    return (
                                        <div className="py-12 text-center bg-alabaster/50 rounded-2xl border border-dashed border-sage/20 flex flex-col items-center justify-center">
                                            <Calendar className="w-10 h-10 text-sage/20 mx-auto mb-4" />
                                            <h3 className="text-sm font-bold text-charcoal mb-1">Quiet Week</h3>
                                            <p className="text-xs text-charcoal/40 max-w-[200px] mx-auto">Your upcoming scheduled sessions will appear here.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4">
                                        {upcomingBookings.map(session => (
                                            <div key={session.id} className="p-4 border border-white/40 bg-white/30 rounded-2xl hover:bg-white/60 transition-all shadow-sm group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex flex-col gap-1 w-full">
                                                        <div className="flex items-center gap-3">
                                                            <Link href={`/studios/${session.slots.studios.id}`} className="w-10 h-10 rounded-full overflow-hidden border border-white bg-white shadow-sm shrink-0 hover:scale-105 transition-transform">
                                                                <img
                                                                    src={session.slots.studios.logo_url || "/logo.png"}
                                                                    alt={session.slots.studios.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </Link>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-1">
                                                                    <Link href={`/studios/${session.slots.studios.id}`} className="text-sm font-bold text-charcoal truncate hover:text-sage transition-colors">
                                                                        {session.slots.studios.name}
                                                                    </Link>
                                                                    <span className="px-2 py-0.5 bg-sage/10 text-sage text-[8px] font-bold uppercase rounded-md tracking-widest border border-sage/20 shrink-0">
                                                                        Confirmed
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-[10px] text-charcoal/50 font-bold uppercase tracking-tighter mt-1">
                                                                    <Calendar className="w-3 h-3 text-sage" />
                                                                    <span>{formatManilaDateStr(session.slots.date)} • {formatTo12Hour(session.slots.start_time)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-white/40 space-y-3">
                                                    <div
                                                        className="flex items-center gap-2 cursor-pointer group/client"
                                                        onClick={() => setSelectedClient(session.client)}
                                                    >
                                                        <div className="w-7 h-7 rounded-full overflow-hidden bg-white shrink-0 border border-white shadow-sm group-hover/client:scale-110 transition-transform">
                                                            <img src={session.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.client?.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="text-[11px] text-charcoal/60 truncate flex-1 group-hover/client:text-sage transition-colors tracking-wide">
                                                            Client: <span className="font-bold text-charcoal">{session.client?.full_name}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between text-[10px] pt-1">
                                                        <div className="flex items-center gap-2">
                                                            <Box className="w-3.5 h-3.5 text-sage" />
                                                            <span className="font-bold text-charcoal/80 truncate max-w-[100px] uppercase tracking-tighter">
                                                                {Array.isArray(session.slots?.equipment) && session.slots.equipment.length > 0
                                                                    ? `${session.slots.equipment[0]}`
                                                                    : (`${session.price_breakdown?.equipment || 'Standard'}`)
                                                                } ({session.quantity || 1})
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-2">
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
                                                                className="w-7 h-7 bg-white/50 text-sage border border-white/40 rounded-full hover:bg-sage hover:text-white transition-all flex items-center justify-center shadow-sm relative group/btn"
                                                                title="Message Client"
                                                            >
                                                                <MessageSquare className="w-3 h-3" />
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
                                                                className="w-7 h-7 bg-white/50 text-charcoal/60 border border-white/40 rounded-full hover:bg-gold hover:text-charcoal transition-all flex items-center justify-center shadow-sm relative group/btn2"
                                                                title="Message Studio"
                                                            >
                                                                <MessageSquare className="w-3 h-3" />
                                                                <MessageCountBadge bookingId={session.id} currentUserId={userId || ''} partnerId={session.slots.studios.owner_id} isOpen={activeChat?.id === session.id && activeChat?.recipientId === session.slots.studios.owner_id} />
                                                            </button>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setCancellingBooking(session);
                                                                }}
                                                                className="w-7 h-7 bg-white/50 text-red-400 border border-white/40 rounded-full hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-3 h-3" />
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
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal/20 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                    <div className="glass-card w-full max-w-sm overflow-hidden p-8 relative animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 text-charcoal/20 hover:text-charcoal transition-colors"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center mt-4 mb-8 text-center">
                            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white shadow-cloud scale-110">
                                <img src={selectedClient.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-charcoal tracking-tight">{selectedClient.full_name}</h3>
                            <p className="text-xs text-charcoal/40 font-bold uppercase tracking-widest mt-1">{selectedClient.email}</p>
                        </div>
                        {selectedClient.medical_conditions ? (
                            <div className="bg-red-50/50 p-5 rounded-3xl border border-red-100/50">
                                <h4 className="text-[10px] font-bold text-red-800 uppercase tracking-widest mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Medical Conditions</h4>
                                <p className="text-xs text-red-700/80 leading-relaxed font-medium">{selectedClient.medical_conditions}</p>
                            </div>
                        ) : (
                            <div className="bg-sage/5 p-5 rounded-3xl border border-white/40">
                                <h4 className="text-[10px] font-bold text-sage uppercase tracking-widest mb-1">Health Status</h4>
                                <p className="text-xs text-charcoal/40 font-medium">Clear / No conditions reported.</p>
                            </div>
                        )}
                        <button onClick={() => setSelectedClient(null)} className="w-full mt-8 py-3.5 bg-white text-charcoal border border-white/40 rounded-[20px] text-[11px] font-bold uppercase tracking-widest hover:bg-alabaster transition-all shadow-sm">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
