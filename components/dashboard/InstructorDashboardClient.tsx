'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Slot, LocationArea } from '@/types';
import StudioAvailabilityGroup from '@/components/dashboard/StudioAvailabilityGroup';
import { Filter, Search, Loader2, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import ChatWindow from '@/components/dashboard/ChatWindow';
import MessageCountBadge from '@/components/dashboard/MessageCountBadge';

import { useSearchParams } from 'next/navigation';

export default function InstructorDashboardClient() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') === 'bookings' ? 'bookings' : 'browse';

    const [slots, setSlots] = useState<Slot[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterArea, setFilterArea] = useState<LocationArea | 'All'>('All');
    const [activeTab, setActiveTab] = useState<'browse' | 'bookings'>(initialTab);
    const [activeChat, setActiveChat] = useState<{ id: string, name: string, isExpired: boolean } | null>(null);
    const supabase = createClient();
    const [userId, setUserId] = useState<string>('');

    // Sync activeTab with URL search params
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'bookings') {
            setActiveTab('bookings');
        } else {
            setActiveTab('browse');
        }
    }, [searchParams]);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);

            // Fetch Available Slots
            const { data: slotsData } = await supabase
                .from('slots')
                .select(`
          *,
          studios!inner (
            id,
            name,
            location,
            hourly_rate,
            verified,
            logo_url,
            space_photos_urls
          )
        `)
                .eq('is_available', true)
                .eq('studios.verified', true)
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true });

            if (slotsData) setSlots(slotsData as unknown as Slot[]);

            // Fetch My Bookings (Where I am the instructor)
            if (user) {
                const { data: bookingsData } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        slots (
                            start_time,
                            end_time,
                            studios (
                                name,
                                location,
                                logo_url
                            )
                        ),
                        client:profiles!client_id (
                            full_name,
                            email,
                            avatar_url
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
            }

            setIsLoading(false);
        }

        fetchData();
    }, []);

    const filteredSlots = slots.filter(slot =>
        filterArea === 'All' || slot.studios?.location === filterArea
    );

    // Chat Expiration Logic
    const isChatExpired = (booking: any) => {
        const endTime = new Date(booking.slots.end_time)
        const expirationTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000)
        return new Date() > expirationTime
    }

    // Reuse ChatWindow import dynamically or just import it at top?
    // We need to import ChatWindow at the top.

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-1">Instructor Dashboard</h1>
                        <p className="text-charcoal-600 font-medium">Find spaces or manage your bookings.</p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            href="/instructor/schedule"
                            className="flex items-center gap-2 px-4 py-2 bg-white text-charcoal-900 border border-cream-200 rounded-lg hover:bg-cream-50 transition-colors shadow-sm"
                        >
                            <Calendar className="w-4 h-4" />
                            <span className="hidden sm:inline">Manage Schedule</span>
                        </Link>
                        <Link
                            href="/instructor/profile"
                            className="flex items-center gap-2 px-4 py-2 bg-rose-gold text-white rounded-lg hover:brightness-110 transition-all shadow-sm font-bold"
                        >
                            <User className="w-4 h-4" />
                            <span className="hidden sm:inline">My Profile</span>
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-cream-200">
                    <button
                        onClick={() => setActiveTab('browse')}
                        className={clsx(
                            "pb-3 px-1 font-medium text-sm transition-colors relative",
                            activeTab === 'browse' ? "text-charcoal-900" : "text-charcoal-500 hover:text-charcoal-700"
                        )}
                    >
                        Browse Studios
                        {activeTab === 'browse' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-charcoal-900 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={clsx(
                            "pb-3 px-1 font-medium text-sm transition-colors relative",
                            activeTab === 'bookings' ? "text-charcoal-900" : "text-charcoal-500 hover:text-charcoal-700"
                        )}
                    >
                        My Bookings
                        {activeTab === 'bookings' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-charcoal-900 rounded-t-full" />}
                    </button>
                </div>

                {activeTab === 'browse' ? (
                    <>
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-cream-200 shadow-sm">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-charcoal-500" />
                                <span className="text-sm font-medium text-charcoal-700">Filter by Area:</span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {['All', 'Makati', 'BGC', 'Alabang', 'Ortigas', 'Quezon City', 'Mandaluyong', 'Paranaque'].map((area) => (
                                    <button
                                        key={area}
                                        onClick={() => setFilterArea(area as LocationArea | 'All')}
                                        className={clsx(
                                            "px-4 py-1.5 rounded-full text-sm font-bold transition-all",
                                            filterArea === area
                                                ? "bg-rose-gold text-white shadow-md"
                                                : "bg-cream-100 text-charcoal-600 hover:bg-cream-200"
                                        )}
                                    >
                                        {area}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Grid */}
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 text-charcoal-400 animate-spin" />
                            </div>
                        ) : filteredSlots.length === 0 ? (
                            <div className="text-center py-20 bg-cream-100/50 rounded-xl border border-dashed border-cream-300">
                                <Search className="w-10 h-10 text-charcoal-300 mx-auto mb-3" />
                                <h3 className="text-lg font-medium text-charcoal-800">No slots found</h3>
                                <p className="text-charcoal-500">Try adjusting your filters or check back later.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {(() => {
                                    // Group slots by Studio + Date
                                    const groups: Record<string, { studio: any, date: string, slots: Slot[] }> = {};

                                    filteredSlots.forEach(slot => {
                                        if (!slot.studios) return;
                                        const dateStr = slot.start_time.split('T')[0];
                                        const key = `${slot.studio_id}-${dateStr}`;

                                        if (!groups[key]) {
                                            groups[key] = {
                                                studio: slot.studios,
                                                date: dateStr,
                                                slots: []
                                            };
                                        }
                                        groups[key].slots.push(slot);
                                    });

                                    return Object.values(groups).map((group) => (
                                        <StudioAvailabilityGroup
                                            key={`${group.studio.id}-${group.date}`}
                                            studio={group.studio}
                                            date={new Date(group.date)}
                                            slots={group.slots}
                                        />
                                    ));
                                })()}
                            </div>
                        )}
                    </>
                ) : (
                    /* BOOKINGS TAB */
                    <div className="space-y-8">
                        {/* Upcoming Confirmed Bookings Section */}
                        {(() => {
                            const upcoming = bookings.filter(b =>
                                ['approved', 'confirmed'].includes(b.status) && new Date(b.slots.start_time) >= new Date()
                            ).sort((a, b) => new Date(a.slots.start_time).getTime() - new Date(b.slots.start_time).getTime());

                            if (upcoming.length === 0) return null;

                            return (
                                <div className="space-y-4">
                                    <h2 className="text-xl font-serif font-bold text-charcoal-900 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-gold animate-pulse" />
                                        Upcoming Confirmed Sessions
                                    </h2>
                                    <div className="grid grid-cols-1 gap-4">
                                        {upcoming.map(booking => (
                                            <div key={booking.id} className="bg-white p-6 rounded-xl border-2 border-green-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-cream-50 border border-cream-200 flex-shrink-0">
                                                        <img
                                                            src={booking.slots.studios.logo_url || "/logo.png"}
                                                            alt={booking.slots.studios.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-bold text-charcoal-900 text-lg">{booking.slots.studios.name}</h3>
                                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wider">Confirmed</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal-600">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="w-4 h-4 text-charcoal-400" />
                                                                <span>{new Date(booking.slots.start_time).toLocaleDateString()} at {new Date(booking.slots.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 font-medium text-charcoal-900">
                                                                <span>{booking.price_breakdown?.quantity || 1} x {booking.price_breakdown?.equipment || booking.equipment || 'Session'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="w-5 h-5 rounded-full overflow-hidden border border-cream-200">
                                                                <img
                                                                    src={booking.client?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.client?.full_name || 'Guest'}`}
                                                                    alt={booking.client?.full_name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                            <span className="text-xs text-charcoal-500">
                                                                Client: <span className="font-medium">{booking.client?.full_name || 'Guest'}</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            const isRental = booking.client_id === booking.instructor_id;
                                                            const recipientName = isRental
                                                                ? booking.slots?.studios?.name
                                                                : booking.client?.full_name || 'Client';
                                                            setActiveChat({
                                                                id: booking.id,
                                                                name: recipientName || 'Messenger',
                                                                isExpired: isChatExpired(booking)
                                                            });
                                                        }}
                                                        className="px-4 py-2 bg-rose-gold text-white rounded-lg hover:brightness-110 transition-all text-sm font-bold flex items-center gap-2 relative shadow-sm"
                                                    >
                                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                                        {booking.client_id === booking.instructor_id ? 'Chat with Studio' : 'Chat with Client'}
                                                        <MessageCountBadge bookingId={booking.id} currentUserId={userId} isOpen={activeChat?.id === booking.id} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="space-y-4">
                            <h2 className="text-xl font-serif font-bold text-charcoal-900">
                                Session History
                            </h2>
                            {bookings.filter(b => b.status === 'approved' && new Date(b.slots.start_time) < new Date()).length === 0 ? (
                                <div className="text-center py-12 bg-cream-100/50 rounded-xl border border-dashed border-cream-300">
                                    <p className="text-charcoal-500">No session history found.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {bookings
                                        .filter(b => b.status === 'approved' && new Date(b.slots.start_time) < new Date())
                                        .map(booking => (
                                            <div key={booking.id} className="bg-white/60 p-4 rounded-lg border border-cream-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium text-charcoal-900">{booking.slots.studios.name}</h4>
                                                        <span className={clsx(
                                                            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                                                            booking.status === 'approved' ? "bg-gray-100 text-gray-600" :
                                                                booking.status === 'rejected' ? "bg-red-50 text-red-600" : "bg-yellow-50 text-yellow-600"
                                                        )}>
                                                            {new Date(booking.slots.start_time) < new Date() && booking.status === 'approved' ? 'Completed' : booking.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-charcoal-500 mt-0.5">
                                                        {new Date(booking.slots.start_time).toLocaleDateString()} — {booking.price_breakdown?.quantity || 1} x {booking.price_breakdown?.equipment || booking.equipment || 'Session'}
                                                    </p>
                                                </div>
                                                {booking.status === 'approved' && (
                                                    <button
                                                        onClick={() => {
                                                            const isRental = booking.client_id === booking.instructor_id;
                                                            const recipientName = isRental
                                                                ? booking.slots?.studios?.name
                                                                : booking.client?.full_name || 'Client';
                                                            setActiveChat({
                                                                id: booking.id,
                                                                name: recipientName || 'Messenger',
                                                                isExpired: isChatExpired(booking)
                                                            });
                                                        }}
                                                        className="text-xs font-medium text-charcoal-600 hover:text-charcoal-900 underline relative"
                                                    >
                                                        View Chat
                                                        <MessageCountBadge bookingId={booking.id} currentUserId={userId} isOpen={activeChat?.id === booking.id} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {activeChat && (
                <ChatWindow
                    bookingId={activeChat.id}
                    currentUserId={userId}
                    recipientName={activeChat.name}
                    isOpen={!!activeChat}
                    onClose={() => setActiveChat(null)}
                    isExpired={activeChat.isExpired}
                />
            )}
        </div>
    );
}
