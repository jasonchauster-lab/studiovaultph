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
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-1">Instructor Dashboard</h1>
                        <p className="text-charcoal-600 font-medium">Manage your professional schedule and earnings.</p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            href="/instructor/profile"
                            className="flex items-center gap-2 px-4 py-2 bg-rose-gold text-white rounded-lg hover:brightness-110 transition-all shadow-sm font-bold"
                        >
                            <User className="w-4 h-4" />
                            <span className="hidden sm:inline">My Professional Profile</span>
                        </Link>
                    </div>
                </div>

                {/* Earnings Bar */}
                <div className="bg-charcoal-900 text-white p-6 rounded-2xl border border-charcoal-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-gold/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-rose-gold/10 transition-colors" />

                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 bg-white/5 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                            <Wallet className="w-7 h-7 text-rose-gold" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Available Balance</p>
                            <div className="flex items-center gap-4">
                                <p className="text-4xl font-bold tracking-tight">
                                    {availableBalance !== null ? `₱${availableBalance.toLocaleString()}` : '₱0'}
                                </p>
                                {availableBalance === null ? (
                                    <div className="px-2.5 py-1 bg-white/10 text-white/60 text-[10px] font-bold uppercase rounded border border-white/10 animate-pulse">
                                        Syncing...
                                    </div>
                                ) : hasPendingPayout ? (
                                    <div className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase rounded border border-amber-500/20">
                                        Payout Pending
                                    </div>
                                ) : (
                                    <div className="px-2.5 py-1 bg-rose-gold/20 text-rose-gold text-[10px] font-bold uppercase rounded border border-rose-gold/20">
                                        Verified
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
                        <Link
                            href="/instructor/earnings"
                            className="flex-1 md:flex-none text-center px-4 py-2.5 text-sm font-bold text-white/60 hover:text-white transition-colors"
                        >
                            History
                        </Link>
                        <Link
                            href="/instructor/payout"
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-8 py-3 bg-rose-gold text-white rounded-xl font-bold hover:brightness-110 transition-all shadow-lg shadow-rose-gold/20"
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            Request Payout
                        </Link>
                    </div>
                </div>

                {/* Dashboard Grid Container */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2">
                        <InstructorScheduleCalendar
                            availability={availability}
                            bookings={calendarBookings}
                            currentDate={new Date(searchParams.get('date') || getManilaTodayStr())}
                        />
                    </div>

                    {/* Upcoming Bookings Sidebar */}
                    <div className="space-y-6">
                        <div className="bg-white border border-cream-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="bg-charcoal-900 p-4 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-rose-gold" />
                                    Upcoming Bookings
                                </h2>
                                <span className="text-[10px] font-bold text-white/40 border border-white/10 px-2 py-0.5 rounded-full uppercase">Next 5 Sessions</span>
                            </div>
                            <div className="p-6">
                                {(() => {
                                    if (isLoading) {
                                        return (
                                            <div className="py-12 flex justify-center">
                                                <Loader2 className="w-6 h-6 text-rose-gold animate-spin" />
                                            </div>
                                        );
                                    }

                                    if (upcomingBookings.length === 0) {
                                        return (
                                            <div className="py-8 text-center bg-cream-50/50 rounded-xl border border-dashed border-cream-200 flex flex-col items-center justify-center">
                                                <Calendar className="w-8 h-8 text-charcoal-200 mx-auto mb-3" />
                                                <h3 className="text-sm font-bold text-charcoal-900 mb-1">No upcoming sessions</h3>
                                                <p className="text-xs text-charcoal-500 max-w-[200px] mx-auto">Your next 5 scheduled sessions will appear here.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4">
                                            {upcomingBookings.map(session => (
                                                <div key={session.id} className="p-4 border border-cream-200 bg-cream-50/50 rounded-xl hover:border-rose-gold/30 hover:bg-white transition-all shadow-sm group">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex flex-col gap-1 w-full">
                                                            <div className="flex items-center gap-3">
                                                                <Link href={`/studios/${session.slots.studios.id}`} className="w-10 h-10 rounded-full overflow-hidden border border-cream-200 bg-white shadow-sm shrink-0 hover:opacity-80 transition-opacity">
                                                                    <img
                                                                        src={session.slots.studios.logo_url || "/logo.png"}
                                                                        alt={session.slots.studios.name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </Link>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <Link href={`/studios/${session.slots.studios.id}`} className="text-sm font-bold text-charcoal-900 truncate hover:text-rose-gold transition-colors">
                                                                            {session.slots.studios.name}
                                                                        </Link>
                                                                        <span className="px-2 py-0.5 bg-green-100/50 text-green-700 text-[9px] font-bold uppercase rounded-md tracking-wider border border-green-200 shrink-0">
                                                                            Confirmed
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-[10px] text-charcoal-500 font-medium mt-0.5">
                                                                        <Calendar className="w-3 h-3 text-rose-gold" />
                                                                        <span>{formatManilaDateStr(session.slots.date)} at {formatTo12Hour(session.slots.start_time)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-3 border-t border-cream-200/50 space-y-2">
                                                        <div
                                                            className="flex items-center gap-2 cursor-pointer group"
                                                            onClick={() => setSelectedClient(session.client)}
                                                        >
                                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-cream-200 shrink-0 border border-cream-200 group-hover:border-rose-gold transition-colors">
                                                                <img src={session.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.client?.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="text-xs text-charcoal-600 truncate flex-1 group-hover:text-charcoal-900 transition-colors">
                                                                Client: <span className="font-semibold text-charcoal-900 group-hover:text-rose-gold transition-colors">{session.client?.full_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-cream-200/50">
                                                        <div className="flex items-center gap-2">
                                                            <Box className="w-3.5 h-3.5 text-charcoal-400" />
                                                            <span className="font-semibold text-charcoal-700 truncate max-w-[120px]">
                                                                {Array.isArray(session.slots?.equipment) && session.slots.equipment.length > 0
                                                                    ? `${session.slots.equipment[0]} (${session.quantity || 1})`
                                                                    : (`${session.price_breakdown?.equipment || 'Standard'} (${session.quantity || 1})`)
                                                                }
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
                                                                className="px-2 py-1.5 bg-white text-charcoal-600 border border-cream-200 rounded-lg hover:bg-rose-gold hover:text-white hover:border-rose-gold transition-all flex items-center gap-1 shadow-sm relative group/btn"
                                                                title="Message Client"
                                                            >
                                                                <MessageSquare className="w-3 h-3" />
                                                                <span className="text-[10px] font-bold">Client</span>
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
                                                                className="px-2 py-1.5 bg-white text-charcoal-600 border border-cream-200 rounded-lg hover:bg-charcoal-900 hover:text-white hover:border-charcoal-900 transition-all flex items-center gap-1 shadow-sm relative group/btn2"
                                                                title="Message Studio"
                                                            >
                                                                <MessageSquare className="w-3 h-3" />
                                                                <span className="text-[10px] font-bold">Studio</span>
                                                                <MessageCountBadge bookingId={session.id} currentUserId={userId || ''} partnerId={session.slots.studios.owner_id} isOpen={activeChat?.id === session.id && activeChat?.recipientId === session.slots.studios.owner_id} />
                                                            </button>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setCancellingBooking(session);
                                                                }}
                                                                className="text-[10px] font-bold text-red-600 hover:text-red-700 px-2 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-all flex items-center gap-1 shadow-sm"
                                                                title="Cancel"
                                                            >
                                                                <X className="w-3 h-3" />
                                                                <span>Cancel</span>
                                                            </button>
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
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedClient(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden p-6 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 text-charcoal-400 hover:text-charcoal-900"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center mt-2 mb-6 text-center">
                            <div className="w-20 h-20 rounded-full overflow-hidden mb-3 border border-cream-200">
                                <img src={selectedClient.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedClient.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-xl font-bold text-charcoal-900">{selectedClient.full_name}</h3>
                            <p className="text-sm text-charcoal-500">{selectedClient.email}</p>
                        </div>
                        {selectedClient.medical_conditions ? (
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <h4 className="text-sm font-bold text-red-800 mb-1 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Medical Conditions</h4>
                                <p className="text-sm text-red-700 whitespace-pre-wrap">{selectedClient.medical_conditions}</p>
                            </div>
                        ) : (
                            <div className="bg-cream-50 p-4 rounded-xl border border-cream-100/50">
                                <h4 className="text-sm font-bold text-charcoal-700 mb-1">Medical Conditions</h4>
                                <p className="text-sm text-charcoal-500">None reported.</p>
                            </div>
                        )}
                        <button onClick={() => setSelectedClient(null)} className="w-full mt-6 py-2.5 bg-cream-100 text-charcoal-900 rounded-xl font-bold hover:bg-cream-200 transition-colors">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}
