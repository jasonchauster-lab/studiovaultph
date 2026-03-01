'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Slot } from '@/types';
import StudioAvailabilityGroup from '@/components/dashboard/StudioAvailabilityGroup';
import { Filter, Search, Loader2, User, Calendar, X, Wallet, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import ChatWindow from '@/components/dashboard/ChatWindow';
import MessageCountBadge from '@/components/dashboard/MessageCountBadge';
import LocationFilterDropdown, { FILTER_CITIES, LOCATION_GROUPS, shortLabel, activeCityPrefix } from '@/components/shared/LocationFilterDropdown';
import { useSearchParams } from 'next/navigation';
import CancelBookingModal from './CancelBookingModal';
import { cancelBookingByInstructor } from '@/app/(dashboard)/instructor/actions';

export default function InstructorDashboardClient() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'home';

    const [slots, setSlots] = useState<Slot[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterArea, setFilterArea] = useState<string>('all');
    const [locSearch, setLocSearch] = useState('');
    const [showLocDropdown, setShowLocDropdown] = useState(false);
    const locSearchRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'home' | 'browse' | 'bookings'>(initialTab as any);
    const [activeChat, setActiveChat] = useState<{ id: string, recipientId: string, name: string, isExpired: boolean } | null>(null);
    const [cancellingBooking, setCancellingBooking] = useState<any>(null);
    const supabase = createClient();
    const [userId, setUserId] = useState<string>('');
    const [availableBalance, setAvailableBalance] = useState<number | null>(null);
    const [hasPendingPayout, setHasPendingPayout] = useState(false);

    // Sync activeTab with URL search params
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'bookings') {
            setActiveTab('bookings');
        } else if (tab === 'browse') {
            setActiveTab('browse');
        } else {
            setActiveTab('home');
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
            pricing,
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
                        price_breakdown,
                        slots (
                            start_time,
                            end_time,
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

                // Fetch Available Balance & Pending Payout Status
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('available_balance')
                    .eq('id', user.id)
                    .single();
                if (profile) setAvailableBalance(profile.available_balance || 0);

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

    const filteredSlots = slots.filter(slot => {
        if (filterArea === 'all' || filterArea === 'All') return true
        const loc = slot.studios?.location || ''
        // Specific sub-location: exact match
        if (filterArea.includes(' - ')) return loc === filterArea
        // Broad city prefix: startsWith match
        return loc === filterArea || loc.startsWith(filterArea + ' - ')
    });

    // Derive available locations from loaded slots for smart filtering
    const availableLocations = [...new Set(
        slots.map(s => s.studios?.location).filter(Boolean) as string[]
    )];

    // Sub-locations to show in the search dropdown
    const lowerLocSearch = locSearch.toLowerCase()
    const activePrefix = activeCityPrefix(filterArea)
    const locSearchResults = locSearch
        ? LOCATION_GROUPS
            .filter(g => activePrefix === 'all' || g.prefix === activePrefix)
            .flatMap(g => g.locations.map(loc => ({ city: g.city, loc })))
            .filter(({ city, loc }) =>
                loc.toLowerCase().includes(lowerLocSearch) ||
                city.toLowerCase().includes(lowerLocSearch)
            )
        : []

    // Close search dropdown on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (locSearchRef.current && !locSearchRef.current.contains(e.target as Node)) {
                setShowLocDropdown(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Chat Expiration Logic
    const isChatExpired = (booking: any) => {
        const endTime = new Date(booking.slots.end_time)
        const expirationTime = new Date(endTime.getTime() + 12 * 60 * 60 * 1000)
        return new Date() > expirationTime
    }

    const handleCancelConfirm = async (reason: string) => {
        if (!cancellingBooking) return { error: 'No booking selected' }
        const result = await cancelBookingByInstructor(cancellingBooking.id, reason)
        if (result.success) {
            setBookings(prev => prev.filter(b => b.id !== cancellingBooking.id))
        }
        return result
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
                        <p className="text-charcoal-600 font-medium">Manage your professional schedule and earnings.</p>
                    </div>

                    <div className="flex gap-2">
                        <Link
                            href="/customer"
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

                {/* Tabs */}
                <div className="flex gap-4 border-b border-cream-200">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={clsx(
                            "pb-3 px-1 font-medium text-sm transition-colors relative",
                            activeTab === 'home' ? "text-charcoal-900" : "text-charcoal-500 hover:text-charcoal-700"
                        )}
                    >
                        Home
                        {activeTab === 'home' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-charcoal-900 rounded-t-full" />}
                    </button>
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

                {activeTab === 'home' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* My Schedule Summary Card */}
                        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-6">
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
                                    Manage Schedule
                                </Link>
                            </div>

                            {(() => {
                                const upcomingSessions = bookings.filter(b =>
                                    b.status === 'approved' && new Date(b.slots.start_time) >= new Date()
                                ).sort((a, b) => new Date(a.slots.start_time).getTime() - new Date(b.slots.start_time).getTime()).slice(0, 3);

                                if (upcomingSessions.length === 0) {
                                    return (
                                        <div className="py-8 text-center bg-cream-50/50 rounded-xl border border-dashed border-cream-200">
                                            <p className="text-charcoal-500 text-sm">No upcoming sessions.</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4">
                                        {upcomingSessions.map(session => (
                                            <div key={session.id} className="flex items-center justify-between p-3 bg-cream-50/50 rounded-xl border border-cream-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-cream-200 bg-white">
                                                        <img
                                                            src={session.slots.studios.logo_url || "/logo.png"}
                                                            alt={session.slots.studios.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-charcoal-900">{session.slots.studios.name}</p>
                                                        <p className="text-[10px] text-charcoal-500 uppercase tracking-wider font-bold">
                                                            {new Date(session.slots.start_time).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })} at {new Date(session.slots.start_time).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wider">
                                                    Confirmed
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Earnings Summary Card */}
                        <div className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-cream-50 rounded-xl flex items-center justify-center">
                                        <Wallet className="w-5 h-5 text-charcoal-900" />
                                    </div>
                                    <h2 className="text-xl font-serif text-charcoal-900">Earnings Summary</h2>
                                </div>
                                <Link
                                    href="/instructor/earnings"
                                    className="text-sm font-bold text-rose-gold hover:underline"
                                >
                                    View Detailed Stats
                                </Link>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div>
                                    <p className="text-xs font-bold text-charcoal-500 uppercase tracking-widest mb-1">Available Balance</p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-4xl font-bold text-charcoal-900">
                                            {availableBalance !== null ? `₱${availableBalance.toLocaleString()}` : '₱0'}
                                        </p>
                                        {availableBalance === null ? (
                                            <div className="px-2 py-1 bg-cream-100 text-charcoal-600 text-[10px] font-bold uppercase rounded tracking-wider border border-cream-200 animate-pulse">
                                                Loading Balance...
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

                                <div className="pt-4 border-t border-cream-100">
                                    <Link
                                        href="/instructor/payout"
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-charcoal-900 text-white rounded-xl font-bold hover:bg-charcoal-800 transition-colors shadow-sm"
                                    >
                                        <ArrowUpRight className="w-4 h-4 text-rose-gold" />
                                        Request Payout
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'browse' ? (
                    <>
                        {/* Filters */}
                        <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-cream-200 shadow-sm space-y-3">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-charcoal-500" />
                                <span className="text-sm font-medium text-charcoal-700">Filter by Location</span>
                                {filterArea !== 'all' && filterArea !== 'All' && (
                                    <button onClick={() => { setFilterArea('all'); setLocSearch('') }} className="ml-auto flex items-center gap-1 text-xs text-charcoal-500 hover:text-charcoal-900">
                                        <X className="w-3 h-3" /> Clear
                                    </button>
                                )}
                            </div>

                            {/* City pills */}
                            <div className="flex gap-2 flex-wrap">
                                {FILTER_CITIES.map(({ label, prefix }) => {
                                    const isActive = activeCityPrefix(filterArea) === prefix
                                    return (
                                        <button
                                            key={prefix}
                                            onClick={() => { setFilterArea(prefix); setLocSearch(''); setShowLocDropdown(false) }}
                                            className={clsx(
                                                'px-4 py-1.5 rounded-full text-sm font-bold transition-all border',
                                                isActive
                                                    ? 'bg-rose-gold text-white border-rose-gold shadow-md'
                                                    : 'bg-cream-100 text-charcoal-600 border-transparent hover:bg-cream-200'
                                            )}
                                        >
                                            {label}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Search bar with sub-location dropdown */}
                            <div ref={locSearchRef} className="relative">
                                <div className="flex items-center gap-2 border border-charcoal-300/50 hover:border-charcoal-500 focus-within:border-charcoal-700 rounded-lg px-3 py-2 bg-white transition-colors">
                                    <Search className="w-4 h-4 text-charcoal-400 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search sub-location… e.g. Fairview, High Street, Uptown"
                                        value={locSearch}
                                        onChange={e => { setLocSearch(e.target.value); setShowLocDropdown(true) }}
                                        onFocus={() => setShowLocDropdown(true)}
                                        className="flex-1 bg-transparent text-sm text-charcoal-900 placeholder-charcoal-400 outline-none"
                                    />
                                    {locSearch && (
                                        <button onClick={() => { setLocSearch(''); setShowLocDropdown(false) }} className="text-charcoal-400 hover:text-charcoal-700">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Search results dropdown */}
                                {showLocDropdown && locSearchResults.length > 0 && (
                                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-cream-200 shadow-xl max-h-60 overflow-y-auto py-2">
                                        {locSearchResults.map(({ city, loc }) => (
                                            <button
                                                key={loc}
                                                onClick={() => { setFilterArea(loc); setLocSearch(''); setShowLocDropdown(false) }}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-cream-50 flex items-center gap-3 transition-colors"
                                            >
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 w-20 shrink-0">{city}</span>
                                                <span className="text-charcoal-700">{shortLabel(loc)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {showLocDropdown && locSearch && locSearchResults.length === 0 && (
                                    <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-cream-200 shadow-xl py-4">
                                        <p className="text-center text-sm text-charcoal-400">No sub-locations found</p>
                                    </div>
                                )}
                            </div>

                            {/* Active sub-location badge */}
                            {filterArea !== 'all' && filterArea !== 'All' && filterArea.includes(' - ') && (
                                <div className="flex items-center gap-2 pt-1">
                                    <span className="text-xs text-charcoal-500">Showing:</span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-gold text-white text-xs font-semibold rounded-full">
                                        {filterArea}
                                        <X className="w-3 h-3 cursor-pointer opacity-80 hover:opacity-100" onClick={() => setFilterArea('all')} />
                                    </span>
                                </div>
                            )}
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
                                b.status === 'approved' && new Date(b.slots.start_time) >= new Date()
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
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = "/logo.png";
                                                            }}
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
                                                                <span>{new Date(booking.slots.start_time).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })} at {new Date(booking.slots.start_time).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 font-medium text-charcoal-900">
                                                                <span>{booking.price_breakdown?.quantity || 1} x {booking.price_breakdown?.equipment || booking.equipment || 'Session'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <div className="w-5 h-5 rounded-full overflow-hidden border border-cream-200">
                                                                <img
                                                                    src={booking.client?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.client?.full_name || 'Guest')}`}
                                                                    alt={booking.client?.full_name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(booking.client?.full_name || 'Guest')}`;
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-charcoal-500">
                                                                Client: <span className="font-medium">{booking.client?.full_name || 'Guest'}</span>
                                                            </span>
                                                        </div>
                                                        {/* Medical Condition Tags */}
                                                        {booking.client?.medical_conditions && booking.client.medical_conditions.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                                {booking.client.medical_conditions.map((condition: string) => (
                                                                    <span
                                                                        key={condition}
                                                                        className="inline-flex items-center px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold rounded-full"
                                                                    >
                                                                        {condition}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            const isRental = booking.client_id === booking.instructor_id;
                                                            const recipientName = isRental
                                                                ? booking.slots?.studios?.name
                                                                : booking.client?.full_name || 'Client';
                                                            const rId = isRental ? booking.slots?.studios?.owner_id : booking.client_id;
                                                            setActiveChat({
                                                                id: booking.id,
                                                                recipientId: rId,
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
                                                    <button
                                                        onClick={() => setCancellingBooking(booking)}
                                                        className="px-4 py-2 bg-white text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-all text-sm font-bold flex items-center gap-2 shadow-sm"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Cancel Session
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
                                        .filter(b => ['approved', 'completed', 'cancelled_charged'].includes(b.status) && new Date(b.slots.start_time) < new Date())
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
                                                            {booking.status === 'completed' || (new Date(booking.slots.start_time) < new Date() && booking.status === 'approved') ? 'Completed' :
                                                                booking.status === 'cancelled_charged' ? 'Cancelled (Charged)' :
                                                                    booking.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-charcoal-500 mt-0.5">
                                                        {new Date(booking.slots.start_time).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })} — {booking.price_breakdown?.quantity || 1} x {booking.price_breakdown?.equipment || booking.equipment || 'Session'}
                                                    </p>
                                                </div>
                                                {booking.status === 'approved' && (
                                                    <button
                                                        onClick={() => {
                                                            const isRental = booking.client_id === booking.instructor_id;
                                                            const recipientName = isRental
                                                                ? booking.slots?.studios?.name
                                                                : booking.client?.full_name || 'Client';
                                                            const rId = isRental ? booking.slots?.studios?.owner_id : booking.client_id;
                                                            setActiveChat({
                                                                id: booking.id,
                                                                recipientId: rId,
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
                    recipientId={activeChat.recipientId}
                    recipientName={activeChat.name}
                    isOpen={!!activeChat}
                    onClose={() => setActiveChat(null)}
                    isExpired={activeChat.isExpired}
                />
            )}

            <CancelBookingModal
                isOpen={!!cancellingBooking}
                onClose={() => setCancellingBooking(null)}
                onConfirm={handleCancelConfirm}
                title="Cancel Session"
                description={
                    cancellingBooking?.client_id === cancellingBooking?.instructor_id
                        ? "Are you sure you want to cancel your studio rental? The studio owner will be notified."
                        : "Are you sure you want to cancel this session? 100% of the payment will be refunded to the client. The client and studio owner will be notified."
                }
                penaltyNotice={
                    (() => {
                        if (!cancellingBooking) return null
                        const startTime = new Date(cancellingBooking.slots.start_time)
                        const now = new Date()
                        const diffInHours = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
                        const isLate = diffInHours < 24

                        if (isLate) {
                            const studioFee = cancellingBooking.price_breakdown?.studio_fee || 0
                            return `Late Cancellation Penalty: ₱${studioFee.toLocaleString()} (Studio Rental fee) will be deducted from your wallet to compensate the studio.`
                        }
                        return null
                    })() || undefined
                }
            />
        </div>
    );
}
