'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Slot } from '@/types';
import { Loader2, User, Calendar, Wallet, ArrowUpRight, MessageSquare, ChevronRight, MapPin, Box, X } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import ChatWindow from '@/components/dashboard/ChatWindow';
import MessageCountBadge from '@/components/dashboard/MessageCountBadge';
import { useSearchParams } from 'next/navigation';
import CancelBookingModal from './CancelBookingModal';
import { cancelBookingByInstructor } from '@/app/(dashboard)/instructor/actions';

export default function InstructorDashboardClient() {
    const searchParams = useSearchParams();
    const supabase = createClient();

    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [availableBalance, setAvailableBalance] = useState<number | null>(null);
    const [hasPendingPayout, setHasPendingPayout] = useState(false);

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
            }

            setIsLoading(false);
        }

        fetchData();
    }, []);

    const isChatExpired = (booking: any) => {
        if (!booking.slots?.end_time) return false;
        const endTime = new Date(booking.slots.end_time);
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
                <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cream-50 rounded-2xl flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-charcoal-900" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-charcoal-500 uppercase tracking-widest mb-0.5">Available Balance</p>
                            <div className="flex items-center gap-3">
                                <p className="text-3xl font-bold text-charcoal-900">
                                    {availableBalance !== null ? `₱${availableBalance.toLocaleString()}` : '₱0'}
                                </p>
                                {availableBalance === null ? (
                                    <div className="px-2 py-1 bg-cream-100 text-charcoal-600 text-[10px] font-bold uppercase rounded tracking-wider border border-cream-200 animate-pulse">
                                        Loading...
                                    </div>
                                ) : hasPendingPayout ? (
                                    <div className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase rounded tracking-wider border border-amber-200">
                                        Payout Pending
                                    </div>
                                ) : (
                                    <div className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded tracking-wider border border-green-200">
                                        Active
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Link
                            href="/instructor/earnings"
                            className="flex-1 md:flex-none text-center px-4 py-2 text-sm font-bold text-charcoal-600 hover:text-charcoal-900 transition-colors"
                        >
                            View Earnings Stats
                        </Link>
                        <Link
                            href="/instructor/payout"
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-6 py-2 bg-charcoal-900 text-white rounded-xl font-bold hover:bg-charcoal-800 transition-colors shadow-sm"
                        >
                            <ArrowUpRight className="w-4 h-4 text-rose-gold" />
                            Request Payout
                        </Link>
                    </div>
                </div>

                {/* My Schedule Full Width List */}
                <div className="bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-cream-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-cream-50 rounded-xl flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-charcoal-900" />
                            </div>
                            <h2 className="text-xl font-serif text-charcoal-900">My Schedule</h2>
                        </div>
                        <Link
                            href="/instructor/schedule"
                            className="text-sm font-bold text-rose-gold hover:underline"
                        >
                            Manage Complete Schedule
                        </Link>
                    </div>

                    {(() => {
                        const upcomingSessions = bookings.filter(b =>
                            b.status === 'approved' && b.slots?.start_time && new Date(b.slots.start_time) >= new Date()
                        ).sort((a, b) => new Date(a.slots.start_time).getTime() - new Date(b.slots.start_time).getTime()).slice(0, 5);

                        if (isLoading) {
                            return (
                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="w-8 h-8 text-rose-gold animate-spin" />
                                    <p className="text-charcoal-500 text-sm">Loading your schedule...</p>
                                </div>
                            );
                        }

                        if (upcomingSessions.length === 0) {
                            return (
                                <div className="py-20 text-center bg-cream-50/30">
                                    <Calendar className="w-12 h-12 text-charcoal-200 mx-auto mb-4" />
                                    <h3 className="text-lg font-serif text-charcoal-900 mb-1">No upcoming sessions</h3>
                                    <p className="text-charcoal-500 text-sm max-w-xs mx-auto">Your upcoming bookings will appear here. Set your availability to get started.</p>
                                    <Link href="/instructor/schedule" className="inline-block mt-6 px-6 py-2 bg-white border border-cream-200 rounded-lg text-sm font-bold hover:bg-cream-50 transition-colors">
                                        Set Availability
                                    </Link>
                                </div>
                            );
                        }

                        return (
                            <div className="divide-y divide-cream-100">
                                {upcomingSessions.map(session => (
                                    <div key={session.id} className="p-6 hover:bg-cream-50/50 transition-colors group">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                            {/* Studio & Time Info */}
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-cream-200 bg-white shrink-0 shadow-sm">
                                                    <img
                                                        src={session.slots.studios.logo_url || "/logo.png"}
                                                        alt={session.slots.studios.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <h3 className="text-lg font-bold text-charcoal-900 group-hover:text-rose-gold transition-colors leading-tight">
                                                        {session.slots.studios.name}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-charcoal-500 font-medium">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {new Date(session.slots.start_time).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-charcoal-500 font-medium">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            {session.slots.studios.location}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Details & Status */}
                                            <div className="flex flex-wrap items-center gap-6 lg:gap-12">
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">Time Slot</p>
                                                    <p className="text-sm font-bold text-charcoal-700">
                                                        {new Date(session.slots.start_time).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>

                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">Equipment</p>
                                                    <div className="flex items-center gap-2">
                                                        <Box className="w-4 h-4 text-charcoal-400" />
                                                        <p className="text-sm font-bold text-charcoal-700">
                                                            {session.price_breakdown?.equipment || 'Standard'}
                                                            <span className="ml-1.5 px-1.5 py-0.5 bg-cream-100 text-charcoal-500 text-[10px] rounded">x{session.price_breakdown?.quantity || 1}</span>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-1 min-w-[100px]">
                                                    <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">Status</p>
                                                    <div className="flex">
                                                        <div className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wider border border-green-200">
                                                            Confirmed
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setActiveChat({
                                                            id: session.id,
                                                            recipientId: session.slots.studios.owner_id,
                                                            name: session.slots.studios.name,
                                                            isExpired: isChatExpired(session)
                                                        })}
                                                        className="p-2.5 bg-cream-50 text-charcoal-600 rounded-xl hover:bg-rose-gold hover:text-white transition-all shadow-sm border border-cream-200 relative flex items-center gap-2"
                                                        title="Message Studio"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                        <span className="text-xs font-bold lg:hidden">Message Studio</span>
                                                        <MessageCountBadge bookingId={session.id} currentUserId={userId || ''} isOpen={activeChat?.id === session.id} />
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveChat({
                                                            id: session.id,
                                                            recipientId: session.client_id,
                                                            name: session.client.full_name,
                                                            isExpired: isChatExpired(session)
                                                        })}
                                                        className="p-2.5 bg-white text-charcoal-600 rounded-xl hover:bg-charcoal-900 hover:text-white transition-all shadow-sm border border-charcoal-200/50 relative flex items-center gap-2"
                                                        title="Message Client"
                                                    >
                                                        <User className="w-4 h-4" />
                                                        <span className="text-xs font-bold lg:hidden">Message Client</span>
                                                        <MessageCountBadge bookingId={session.id} currentUserId={userId || ''} isOpen={activeChat?.id === session.id} />
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
