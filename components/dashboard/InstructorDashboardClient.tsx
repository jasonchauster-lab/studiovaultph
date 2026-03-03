'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Slot } from '@/types';
import { Loader2, User, Calendar, Wallet, ArrowUpRight, MessageSquare, ChevronRight, MapPin, Box, X } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import ChatWindow from '@/components/dashboard/ChatWindow';
import MessageCountBadge from '@/components/dashboard/MessageCountBadge';
import { formatManilaDateStr, formatTo12Hour } from '@/lib/timezone';
import { useSearchParams } from 'next/navigation';
import CancelBookingModal from './CancelBookingModal';
import { cancelBookingByInstructor } from '@/app/(dashboard)/instructor/actions';
import InstructorScheduleCalendar from '@/components/instructor/InstructorScheduleCalendar';
import { getManilaTodayStr } from '@/lib/timezone';

export default function InstructorDashboardClient() {
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [availableBalance, setAvailableBalance] = useState<number | null>(null);
    const [hasPendingPayout, setHasPendingPayout] = useState(false);
    const [availability, setAvailability] = useState<any[]>([]);

    const [activeChat, setActiveChat] = useState<{ id: string, recipientId: string, name: string, isExpired: boolean } | null>(null);
    const [cancellingBooking, setCancellingBooking] = useState<any>(null);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);

            if (user) {
                // Fetch My Bookings (Where I am the instructor)
                const { data: bookingsData } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        price_breakdown,
                        slots (
                            date,
                            start_time,
                            end_time,
                            equipment,
                            studios (
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
                        ),
                        instructor:profiles!instructor_id (
                            full_name,
                            email,
                            avatar_url
                        )
                    `)
                    .eq('instructor_id', user.id)
                    .order('created_at', { ascending: false });

                if (bookingsData) setBookings(bookingsData);

                // Fetch Available Balance
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('available_balance')
                    .eq('id', user.id)
                    .single();
                if (profile) setAvailableBalance(profile.available_balance || 0);

                // Check for Pending Payouts
                const { data: pendingPayouts } = await supabase
                    .from('payout_requests')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('status', 'pending')
                    .limit(1);
                setHasPendingPayout(!!(pendingPayouts && pendingPayouts.length > 0));

                // Fetch Existing Availability
                const { data: availabilityData } = await supabase
                    .from('instructor_availability')
                    .select('*')
                    .eq('instructor_id', user.id)
                    .order('day_of_week', { ascending: true })
                    .order('start_time', { ascending: true });

                if (availabilityData) setAvailability(availabilityData);
            }

            setIsLoading(false);
        }

        fetchData();
    }, []);

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
            setBookings(prev => prev.filter(b => b.id !== cancellingBooking.id));
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
                            href="/customer/browse"
                            className="flex items-center gap-2 px-4 py-2 bg-white text-charcoal-900 border border-cream-200 rounded-lg hover:bg-cream-50 transition-colors shadow-sm font-bold"
                        >
                            <User className="w-4 h-4" />
                            <span>Switch to Client Mode</span>
                        </Link>
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
                    {/* Calendar Section */}
                    <div className="xl:col-span-2">
                        <InstructorScheduleCalendar availability={availability} currentDate={new Date(searchParams.get('date') || getManilaTodayStr())} />
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
                                    const upcomingSessions = bookings.filter(b => {
                                        const slot = b.slots;
                                        if (!slot?.date || !slot?.start_time) return false;
                                        const sessionStart = new Date(`${slot.date}T${slot.start_time}+08:00`);
                                        return b.status === 'approved' && sessionStart >= new Date();
                                    }).sort((a, b) => {
                                        const startA = new Date(`${a.slots.date}T${a.slots.start_time}+08:00`);
                                        const startB = new Date(`${b.slots.date}T${b.slots.start_time}+08:00`);
                                        return startA.getTime() - startB.getTime();
                                    }).slice(0, 5);

                                    if (isLoading) {
                                        return (
                                            <div className="py-12 flex justify-center">
                                                <Loader2 className="w-6 h-6 text-rose-gold animate-spin" />
                                            </div>
                                        );
                                    }

                                    if (upcomingSessions.length === 0) {
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
                                            {upcomingSessions.map(session => (
                                                <div key={session.id} className="p-4 border border-cream-200 bg-cream-50/50 rounded-xl hover:border-rose-gold/30 hover:bg-white transition-all shadow-sm group">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex flex-col gap-1 w-full">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full overflow-hidden border border-cream-200 bg-white shadow-sm shrink-0">
                                                                    <img
                                                                        src={session.slots.studios.logo_url || "/logo.png"}
                                                                        alt={session.slots.studios.name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <h3 className="text-sm font-bold text-charcoal-900 truncate">
                                                                            {session.slots.studios.name}
                                                                        </h3>
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
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full overflow-hidden bg-cream-200 shrink-0">
                                                                <img src={session.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.client?.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="text-xs text-charcoal-600 truncate flex-1">
                                                                Client: <span className="font-semibold text-charcoal-900">{session.client?.full_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-cream-200/50">
                                                        <div className="flex items-center gap-2">
                                                            <Box className="w-3.5 h-3.5 text-charcoal-400" />
                                                            <span className="font-semibold text-charcoal-700 truncate max-w-[120px]">
                                                                {Array.isArray(session.slots?.equipment) && session.slots.equipment.length > 0
                                                                    ? session.slots.equipment[0]
                                                                    : (session.price_breakdown?.equipment || 'Standard')
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
                                                                <span className="text-[10px] font-bold">Chat</span>
                                                                <MessageCountBadge bookingId={session.id} currentUserId={userId || ''} isOpen={activeChat?.id === session.id} />
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
        </div>
    );
}
