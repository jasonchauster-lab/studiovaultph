'use client';

import { useEffect, useState } from 'react';
import { Loader2, Calendar, Box, X, AlertCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import ChatWindow from '@/components/dashboard/ChatWindow';
import MessageCountBadge from '@/components/dashboard/MessageCountBadge';
import { formatManilaDateStr, formatTo12Hour, getManilaTodayStr } from '@/lib/timezone';
import CancelBookingModal from './CancelBookingModal';
import { cancelBookingByInstructor } from '@/app/(dashboard)/instructor/actions';
import InstructorScheduleCalendar from '@/components/instructor/InstructorScheduleCalendar';
import InstructorStatCards from './InstructorStatCards';
import MobileScheduleCalendar from '@/components/dashboard/MobileScheduleCalendar';

interface InstructorDashboardClientProps {
    userId: string;
    initialCalendarBookings: any[];
    initialUpcomingBookings: any[];
    availableBalance: number;
    hasPendingPayout: boolean;
    availability: any[];
    totalSessionsTaught: number;
    pendingEarnings: number;
    currentDateStr: string;
}

export default function InstructorDashboardClient({
    userId,
    initialCalendarBookings,
    initialUpcomingBookings,
    availableBalance,
    hasPendingPayout,
    availability,
    totalSessionsTaught,
    pendingEarnings,
    currentDateStr
}: InstructorDashboardClientProps) {
    const [calendarBookings, setCalendarBookings] = useState<any[]>(initialCalendarBookings);
    const [upcomingBookings, setUpcomingBookings] = useState<any[]>(initialUpcomingBookings);
    const [isLoading, setIsLoading] = useState(false); // No longer loading initially

    // Sync state when props change (e.g., when user navigates to a new week)
    useEffect(() => {
        setCalendarBookings(initialCalendarBookings);
        setUpcomingBookings(initialUpcomingBookings);
    }, [initialCalendarBookings, initialUpcomingBookings]);

    const [activeChat, setActiveChat] = useState<{ id: string, recipientId: string, name: string, isExpired: boolean } | null>(null);
    const [cancellingBooking, setCancellingBooking] = useState<any>(null);
    const [selectedClient, setSelectedClient] = useState<any>(null);


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
                    {/* Desktop Calendar */}
                    <div className="hidden lg:block border border-border-grey rounded-xl overflow-hidden bg-white">
                        <InstructorScheduleCalendar
                            availability={availability}
                            bookings={calendarBookings}
                            currentUserId={userId || ''}
                            currentDate={new Date(currentDateStr || getManilaTodayStr())}
                        />
                    </div>

                    {/* Mobile Schedule View */}
                    <div className="lg:hidden">
                        <MobileScheduleCalendar
                            currentDate={new Date(currentDateStr || getManilaTodayStr())}
                            initialSessions={[
                                ...availability.map(a => ({
                                    id: a.id,
                                    start_time: a.start_time,
                                    end_time: a.end_time,
                                    date: a.date || getManilaTodayStr(),
                                    type: `Availability: ${a.location_area?.split(' - ').pop() || a.location_area}`,
                                    location: a.location_area,
                                    is_booked: false
                                })),
                                ...calendarBookings.map(b => ({
                                    id: b.id,
                                    start_time: b.slots.start_time,
                                    end_time: b.slots.end_time,
                                    date: b.slots.date,
                                    type: `Booking: ${b.slots.studios.name}`,
                                    location: b.slots.studios.location,
                                    is_booked: b.status === 'approved'
                                }))
                            ]}
                        />
                    </div>
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
                                                            <Link href={`/studios/${session.slots.studios.id}`} aria-label={`View studio details for ${session.slots.studios.name}`} className="w-12 h-12 rounded-[12px] overflow-hidden border border-white bg-white shadow-sm shrink-0 hover:scale-105 transition-transform duration-700">
                                                                <img
                                                                    src={session.slots.studios.logo_url || "/logo.png"}
                                                                    alt=""
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
                                                    <button
                                                        className="flex items-center gap-3 cursor-pointer group/client w-full text-left focus:outline-none focus:ring-1 focus:ring-forest rounded-lg p-1 -m-1"
                                                        onClick={() => setSelectedClient(session.client)}
                                                        aria-label={`View health record for ${session.client?.full_name}`}
                                                    >
                                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-border-grey shadow-tight group-hover/client:scale-110 transition-transform duration-300">
                                                            <img alt="" src={session.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.client?.full_name || 'C')}&background=F5F2EB&color=2C3230`} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="text-[10px] text-slate uppercase tracking-[0.2em] truncate flex-1 group-hover/client:text-forest transition-colors">
                                                            CLIENT: <span className="font-black text-charcoal">{session.client?.full_name}</span>
                                                        </div>
                                                    </button>

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
                                                                aria-label={`Message client ${session.client.full_name}`}
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
                                                                aria-label={`Message studio ${session.slots.studios.name}`}
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
                                                                title="Cancel Session"
                                                                aria-label="Cancel session"
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
