'use client';

// Hoisted outside the component — these are static data that never change,
// so defining them inside the function body would recreate them on every render.
const AREAS = [
    'Alabang - Madrigal/Ayala Alabang', 'Alabang - Filinvest City', 'Alabang - Alabang Town Center Area', 'Alabang - Others',
    'BGC - High Street', 'BGC - Central Square/Uptown', 'BGC - Forbes Town', 'BGC - Others',
    'Ortigas - Ortigas Center', 'Ortigas - Greenhills', 'Ortigas - San Juan', 'Ortigas - Others',
    'Makati - CBD/Ayala', 'Makati - Poblacion/Rockwell', 'Makati - San Antonio/Gil Puyat', 'Makati - Others',
    'Mandaluyong - Ortigas South', 'Mandaluyong - Greenfield/Shaw', 'Mandaluyong - Boni/Pioneer',
    'QC - Tomas Morato', 'QC - Katipunan', 'QC - Eastwood', 'QC - Cubao', 'QC - Fairview/Commonwealth', 'QC - Novaliches', 'QC - Diliman', 'QC - Maginhawa/UP Village',
    'Paranaque - BF Homes', 'Paranaque - Moonwalk / Merville', 'Paranaque - Bicutan / Sucat', 'Paranaque - Others'
]

const GROUPED_AREAS = AREAS.reduce((acc: Record<string, string[]>, loc: string) => {
    const city = loc?.split(' - ')[0] || 'Studio';
    if (!acc[city]) acc[city] = [];
    acc[city].push(loc);
    return acc;
}, {})

import { useEffect, useState } from 'react';
import { Calendar, Clock, MessageSquare, X, ChevronRight, User, MapPin, ArrowUpRight, AlertCircle, Box, Loader2, Pencil, Copy, Trash2, AlertTriangle, CheckCircle, Plus, RefreshCcw, UserCheck } from 'lucide-react'
import Avatar from '@/components/shared/Avatar';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChatWindow from '@/components/dashboard/ChatWindow';
import MessageCountBadge from '@/components/dashboard/MessageCountBadge';
import { formatManilaDateStr, formatTo12Hour, getManilaTodayStr, toManilaTimeString } from '@/lib/timezone';
import CancelBookingModal from './CancelBookingModal';
import { cancelBookingByInstructor, checkInClient } from '@/app/(dashboard)/instructor/actions';
import InstructorScheduleCalendar from '@/components/instructor/InstructorScheduleCalendar';
import InstructorStatCards from './InstructorStatCards';
import MobileScheduleCalendar from '@/components/dashboard/MobileScheduleCalendar';
import { deleteAvailability } from '@/app/(dashboard)/instructor/schedule/actions';
import clsx from 'clsx';
import { format } from 'date-fns';

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
    instructorProfile: {
        id: string;
        teaching_equipment?: string[];
        rates?: Record<string, number>;
    } | null;
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
    currentDateStr,
    instructorProfile
}: InstructorDashboardClientProps) {
    const router = useRouter();
    const normalizeBookings = (bookings: any[]) => bookings.map(b => ({
        ...b,
        slots: Array.isArray(b.slots) ? b.slots[0] : b.slots
    }));

    const [calendarBookings, setCalendarBookings] = useState<any[]>(() => normalizeBookings(initialCalendarBookings));
    const [upcomingBookings, setUpcomingBookings] = useState<any[]>(() => normalizeBookings(initialUpcomingBookings));
    const [isLoading, setIsLoading] = useState(false); // No longer loading initially
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Sync state when props change (e.g., when user navigates to a new week)
    useEffect(() => {
        setCalendarBookings(normalizeBookings(initialCalendarBookings));
        setUpcomingBookings(normalizeBookings(initialUpcomingBookings));
    }, [initialCalendarBookings, initialUpcomingBookings]);

    const [activeChat, setActiveChat] = useState<{ id: string, recipientId: string, name: string, isExpired: boolean } | null>(null);
    const [cancellingBooking, setCancellingBooking] = useState<any>(null);
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [selectedStudio, setSelectedStudio] = useState<any>(null);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);
    const [editingSlot, setEditingSlot] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentSlotHistory, setCurrentSlotHistory] = useState<any[]>([]);

    // State for Add/Edit Form
    const [singleDate, setSingleDate] = useState(currentDateStr || '');
    const [singleTime, setSingleTime] = useState('09:00');
    const [singleEndTime, setSingleEndTime] = useState('10:00');
    const [locations, setLocations] = useState<string[]>([]);
    const [equipment, setEquipment] = useState<string[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');

    const isProfileComplete = !!(
        instructorProfile?.teaching_equipment &&
        instructorProfile.teaching_equipment.length > 0 &&
        instructorProfile.rates &&
        Object.keys(instructorProfile.rates).length > 0
    );

    const [expandedCities, setExpandedCities] = useState<string[]>([]);

    const toggleCityAccordion = (city: string) => {
        setExpandedCities(prev =>
            prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
        );
    };
    const toggleLocation = (loc: string) => {
        setLocations(prev =>
            prev.includes(loc)
                ? prev.filter(l => l !== loc)
                : [...prev, loc]
        );
    };

    const toggleEquipment = (eq: string) => {
        setEquipment(prev =>
            prev.includes(eq)
                ? prev.filter(e => e !== eq)
                : [...prev, eq]
        );
    };

    const toggleCityGroup = (cityLocations: string[]) => {
        const allSelected = cityLocations.every(loc => locations.includes(loc));
        if (allSelected) {
            setLocations(prev => prev.filter(l => !cityLocations.includes(l)));
        } else {
            setLocations(prev => {
                const newSelections = cityLocations.filter(loc => !prev.includes(loc));
                return [...prev, ...newSelections];
            });
        }
    };

    const getSlotDateTime = (date: string | undefined, time: string | undefined) => {
        if (!date || !time) return new Date(0);
        return new Date(`${date}T${time}+08:00`);
    };

    const now = new Date();

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

    const handleDelete = async (id: string, groupId?: string) => {
        const message = groupId
            ? 'Are you sure you want to delete this session for ALL selected areas?'
            : 'Are you sure you want to delete this availability?';
        if (!confirm(message)) return;
        setIsSubmitting(true);
        const result = await deleteAvailability(id, groupId);
        setIsSubmitting(false);
        if (result.success) {
            setCalendarBookings(prev => prev.filter(b => b.id !== id && (!groupId || b.group_id !== groupId)));
            setIsEditModalOpen(false);
            setEditingSlot(null);
            router.refresh();
        } else {
            alert(result.error);
        }
    };

    const handleUpdate = async (id: string, formData: FormData) => {
        setIsSubmitting(true);
        const { updateAvailability } = await import('@/app/(dashboard)/instructor/schedule/actions');
        const result = await updateAvailability(id, formData);
        setIsSubmitting(false);
        if (result.success) {
            setIsEditModalOpen(false);
            setEditingSlot(null);
            router.refresh();
        } else {
            alert(result.error);
        }
    };

    const handleCreateSingle = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isSubmitting) return;

        if (locations.length === 0) {
            alert('Please select at least one location');
            return;
        }

        setIsSubmitting(true);
        const { generateRecurringAvailability } = await import('@/app/(dashboard)/instructor/schedule/actions');

        const result = await generateRecurringAvailability({
            startDate: singleDate,
            endDate: singleDate,
            days: [new Date(singleDate).getDay()],
            startTime: singleTime,
            endTime: singleEndTime,
            locations: locations,
            equipment: instructorProfile?.teaching_equipment || []
        });

        setIsSubmitting(false);
        if (result.success) {
            setIsAddModalOpen(false);
            router.refresh();
        } else {
            alert(result.error);
        }
    };

    const calculateAge = (dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    // Scroll Lock
    useEffect(() => {
        const anyModalOpen = cancellingBooking || selectedProfile || selectedStudio || activeChat || selectedBooking || isEditModalOpen || isAddModalOpen;
        if (anyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [cancellingBooking, selectedProfile, selectedStudio, activeChat, selectedBooking, isEditModalOpen, isAddModalOpen]);

    return (
        <div className="space-y-8 sm:space-y-16 pb-20">
            {/* Sticky Header */}
            <div className="sticky-header-antigravity -mx-4 sm:-mx-8 lg:-mx-12 mb-8 sm:mb-12 px-6 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-8">
                    <div>
                        <h1 className="text-xl sm:text-4xl md:text-5xl font-serif text-charcoal tracking-tighter mb-2 sm:mb-4">Instructor Dashboard</h1>
                        <p className="text-[9px] sm:text-[10px] font-bold text-charcoal/40 uppercase tracking-[0.3em] sm:tracking-[0.4em] max-w-[90%] sm:max-w-none leading-relaxed">Manage your professional schedule and earnings with grounded precision.</p>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2">
                    {/* Desktop Calendar */}
                    <div className="hidden lg:block border border-border-grey rounded-xl overflow-hidden bg-white">
                        <InstructorScheduleCalendar
                            availability={availability}
                            bookings={calendarBookings}
                            currentUserId={userId || ''}
                            currentDate={new Date(currentDateStr || getManilaTodayStr())}
                            instructorProfile={instructorProfile}
                        />
                    </div>

                    {/* Mobile Schedule View */}
                    <div className="lg:hidden">
                        <MobileScheduleCalendar
                            currentDate={new Date(currentDateStr || getManilaTodayStr())}
                            onAddSlot={(date) => {
                                setSingleDate(format(date, 'yyyy-MM-dd'));
                                setAddMode('single');
                                setIsAddModalOpen(true);
                            }}
                            onRecurringSchedule={() => {
                                router.push('/instructor/schedule');
                            }}
                            onSlotClick={(session) => {
                                if (session.is_booked) {
                                    const booking = calendarBookings.find(b => b.id === session.id);
                                    if (booking) setSelectedBooking(booking);
                                } else {
                                    const slot = availability.find(a => a.id === session.id);
                                    if (slot) {
                                        setEditingSlot(slot);
                                        setSingleDate(slot.date || getManilaTodayStr());
                                        setSingleTime(slot.start_time);
                                        setSingleEndTime(slot.end_time);
                                        setLocations([slot.location_area]);
                                        setEquipment(slot.equipment || instructorProfile?.teaching_equipment || []);
                                        setIsEditModalOpen(true);
                                    }
                                }
                            }}
                            initialSessions={[
                                ...availability.map(a => ({
                                    id: a.id,
                                    start_time: a.start_time,
                                    end_time: a.end_time,
                                    date: a.date || getManilaTodayStr(),
                                    type: `Availability: ${a.location_area?.split(' - ').slice(-1)[0] || a.location_area || 'Standard'}`,
                                    location: a.location_area || 'Studio',
                                    is_booked: false
                                })),
                                ...calendarBookings.map(b => {
                                    const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots;
                                    return {
                                        id: b.id,
                                        start_time: slot?.start_time || '00:00:00',
                                        end_time: slot?.end_time || '00:00:00',
                                        date: slot?.date || getManilaTodayStr(),
                                        type: `Booking: ${slot?.studios?.name || 'Partner'}`,
                                        location: slot?.studios?.location || 'Studio',
                                        is_booked: b.status === 'approved'
                                    };
                                })
                            ]}
                        />
                    </div>
                </div>

                {/* Upcoming Bookings Sidebar */}
                <div className="space-y-10 lg:col-span-1">
                    <div className="earth-card overflow-hidden">
                        <div className="bg-buttermilk p-5 flex items-center justify-between border-b border-burgundy/10">
                            <h2 className="text-[11px] font-bold !text-burgundy uppercase tracking-[0.2em] flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-burgundy" />
                                Upcoming Bookings
                            </h2>
                            <span className="text-[9px] font-bold text-burgundy/50 border border-burgundy/20 px-3 py-1 rounded-full uppercase tracking-tighter">Next 5 Sessions</span>
                        </div>
                        <div className="p-4 sm:p-6">
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
                                            <div className="py-12 sm:py-16 text-center bg-off-white shadow-inner rounded-2xl border border-border-grey/50 flex flex-col items-center justify-center relative overflow-hidden group/empty mx-1">
                                                <div className="absolute inset-0 bg-gradient-to-b from-buttermilk/10 to-transparent pointer-events-none" />
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center shadow-tight border border-border-grey/50 mb-6 sm:mb-8 relative z-10 group-hover/empty:scale-110 transition-transform duration-700">
                                                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-burgundy/40" />
                                                </div>
                                                <h3 className="text-[10px] sm:text-[11px] font-black text-burgundy uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-2 sm:mb-3 relative z-10">Quiet Week</h3>
                                                <p className="text-[9px] sm:text-[10px] text-charcoal/50 font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] max-w-[200px] sm:max-w-[220px] mx-auto mb-6 sm:mb-8 relative z-10 leading-relaxed">No bookings yet—your schedule is clear.</p>
                                                <button 
                                                    onClick={() => setIsAddModalOpen(true)}
                                                    className="px-6 sm:px-8 py-3 sm:py-3.5 bg-forest text-white text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-xl hover:brightness-110 transition-all shadow-tight flex items-center gap-2 relative z-10 active:scale-95"
                                                >
                                                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Quick Add
                                                </button>
                                            </div>
                                    );
                                }

                                return (
                                        <div className="space-y-4 sm:space-y-5">
                                            {upcomingBookings.map(session => (
                                                <div key={session.id} className="p-4 sm:p-5 border border-border-grey/50 bg-white rounded-2xl hover:bg-off-white transition-all duration-500 shadow-tight group relative ring-1 ring-border-grey/10">
                                                    <div className="flex justify-between items-start mb-4 sm:mb-5">
                                                        <div className="flex flex-col gap-1 w-full">
                                                            <div className="flex items-center gap-3 sm:gap-4">
                                                                 <button
                                                                    onClick={() => session.slots?.studios && setSelectedStudio(session.slots.studios)}
                                                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-[12px] sm:rounded-[14px] overflow-hidden border border-white bg-white shadow-tight shrink-0 hover:scale-110 transition-transform duration-700"
                                                                >
                                                                    <Avatar 
                                                                        src={session.slots?.studios?.logo_url} 
                                                                        fallbackName={session.slots?.studios?.name} 
                                                                        size={56} 
                                                                    />
                                                                </button>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <button
                                                                            onClick={() => session.slots?.studios && setSelectedStudio(session.slots.studios)}
                                                                            className="text-xs sm:text-sm font-black text-charcoal uppercase tracking-tight hover:text-forest transition-colors text-left leading-tight"
                                                                        >
                                                                            {session.slots?.studios?.name || 'Unknown Studio'}
                                                                        </button>
                                                                        <div className="flex items-center gap-1 bg-[#FFF1B5]/40 px-1.5 py-0.5 rounded border border-charcoal/5 whitespace-nowrap">
                                                                            <span className="text-[9px] sm:text-[10px] font-black text-charcoal">1/1</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-start gap-1.5 text-xs text-charcoal/50 font-black uppercase tracking-[0.1em] mt-1 sm:mt-1.5">
                                                                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-forest/50 shrink-0" />
                                                                        <span className="">{session.slots?.date ? formatManilaDateStr(session.slots.date) : 'No Date'} • {session.slots?.start_time ? formatTo12Hour(session.slots.start_time) : 'No Time'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-5 sm:pt-7 border-t border-border-grey/30 space-y-4 sm:space-y-5">
                                                        <button
                                                            className="flex items-center gap-3 sm:gap-4 cursor-pointer group/client w-full text-left focus:outline-none focus:ring-2 focus:ring-forest/20 rounded-xl p-1.5 -m-1.5 hover:bg-white transition-all"
                                                            onClick={() => setSelectedProfile(session.client)}
                                                            aria-label={`View record for ${session.client?.full_name}`}
                                                        >
                                                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-white shrink-0 border border-border-grey/50 shadow-tight group-hover/client:scale-110 transition-transform duration-500">
                                                                <Avatar 
                                                                    src={session.client?.avatar_url} 
                                                                    fallbackName={session.client?.full_name} 
                                                                    size={40} 
                                                                />
                                                            </div>

                                                            <div className="text-[10px] sm:text-[11px] text-charcoal/40 uppercase tracking-[0.2em] flex-1 group-hover/client:text-forest transition-colors font-bold break-words">
                                                                CLIENT: <span className="font-black text-charcoal">{session.client?.full_name}</span>
                                                            </div>
                                                        </button>

                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                                                            <div className="flex items-center gap-3">
                                                                <Box className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-forest/40" />
                                                                <span className="font-black text-slate uppercase tracking-[0.2em] text-[10px] sm:text-xs">
                                                                    {Array.isArray(session.slots?.equipment) && session.slots.equipment.length > 0
                                                                        ? `${session.slots.equipment[0]}`
                                                                        : (`${session.price_breakdown?.equipment || 'Standard'}`)
                                                                    } ({session.quantity || 1})
                                                                </span>
                                                            </div>

                                                            <div className="flex gap-2 sm:gap-2.5 items-center self-end sm:self-auto">
                                                                {session.status === 'approved' && !session.client_checked_in_at && (
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.preventDefault();
                                                                            if (confirm('Check in this client?')) {
                                                                                await checkInClient(session.id);
                                                                            }
                                                                        }}
                                                                        className="w-8 h-8 sm:w-10 sm:h-10 bg-forest/5 text-forest border border-forest/20 rounded-full hover:bg-forest hover:text-white transition-all duration-300 flex items-center justify-center shadow-tight group/check"
                                                                        title="Check In Client"
                                                                    >
                                                                        <UserCheck className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                                {session.client_checked_in_at && (
                                                                    <div 
                                                                        className="w-8 h-8 sm:w-10 sm:h-10 bg-forest text-white rounded-full flex items-center justify-center shadow-tight"
                                                                        title={isMounted ? `Checked in at ${formatTo12Hour(toManilaTimeString(session.client_checked_in_at))}` : "Checked in"}
                                                                    >
                                                                        <UserCheck className="w-4 h-4" />
                                                                    </div>
                                                                )}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setActiveChat({
                                                                            id: session.id,
                                                                            recipientId: session.client_id,
                                                                            name: session.client?.full_name || 'Client',
                                                                            isExpired: isChatExpired(session)
                                                                        })
                                                                    }}
                                                                    className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-forest border border-border-grey rounded-full hover:bg-forest hover:text-white transition-all duration-300 flex items-center justify-center shadow-tight relative group/btn"
                                                                    title="Message Client"
                                                                    aria-label={`Message client ${session.client?.full_name || 'Client'}`}
                                                                >
                                                                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                                    <MessageCountBadge bookingId={session.id} currentUserId={userId || ''} partnerId={session.client_id} isOpen={activeChat?.id === session.id && activeChat?.recipientId === session.client_id} />
                                                                </button>
    
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setActiveChat({
                                                                            id: session.id,
                                                                            recipientId: session.slots?.studios?.owner_id,
                                                                            name: session.slots?.studios?.name || 'Studio',
                                                                            isExpired: isChatExpired(session)
                                                                        })
                                                                    }}
                                                                    className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-charcoal border border-border-grey rounded-full hover:bg-forest hover:text-white transition-all duration-300 flex items-center justify-center shadow-tight relative group/btn2"
                                                                    title="Message Studio"
                                                                    aria-label={`Message studio ${session.slots?.studios?.name || 'Studio'}`}
                                                                >
                                                                    <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                                    <MessageCountBadge bookingId={session.id} currentUserId={userId || ''} partnerId={session.slots?.studios?.owner_id} isOpen={activeChat?.id === session.id && activeChat?.recipientId === session.slots?.studios?.owner_id} />
                                                                </button>
    
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        setCancellingBooking(session);
                                                                    }}
                                                                    className="w-8 h-8 sm:w-10 sm:h-10 bg-white text-red-600 border border-border-grey rounded-full hover:bg-red-600 hover:text-white transition-all duration-300 flex items-center justify-center shadow-tight"
                                                                    title="Cancel Session"
                                                                    aria-label="Cancel session"
                                                                >
                                                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

            {/* Profile Detail Modal */}
            {selectedProfile && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedProfile(null)}>
                    <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 p-8 md:p-12 relative border border-white/40" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedProfile(null)} className="absolute top-8 right-8 p-3 hover:bg-charcoal/5 rounded-2xl transition-all text-charcoal/30 hover:text-charcoal border border-transparent hover:border-border-grey"><X className="w-5 h-5" /></button>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                        <div className="flex flex-col items-center text-center mb-10">
                             <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-white shadow-tight relative z-10">
                                <Avatar 
                                    src={selectedProfile.avatar_url} 
                                    fallbackName={selectedProfile.full_name} 
                                    size={96} 
                                />
                            </div>

                            <h3 className="text-3xl font-serif text-charcoal tracking-tighter mb-2">{selectedProfile.full_name}</h3>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.35em]">{selectedProfile.email}</p>
                                {selectedProfile.date_of_birth && (
                                    <div className="inline-block px-3 py-1 bg-forest/5 rounded-full border border-forest/10 mt-2">
                                        <p className="text-[9px] font-black text-forest uppercase tracking-[0.2em]">{calculateAge(selectedProfile.date_of_birth)} YEARS OLD</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedProfile.bio && (
                            <div className="bg-white/40 p-6 rounded-[2rem] border border-white/60 mb-6 relative z-10">
                                <h4 className="text-[9px] font-black text-charcoal/40 uppercase tracking-[0.4em] mb-3">BIO</h4>
                                <p className="text-[11px] text-charcoal/60 leading-relaxed italic uppercase tracking-wider">"{selectedProfile.bio}"</p>
                            </div>
                        )}

                        <div className="mb-8">
                            {(() => {
                                 const conditions = Array.isArray(selectedProfile.medical_conditions)
                                     ? selectedProfile.medical_conditions
                                     : typeof selectedProfile.medical_conditions === 'string'
                                         ? selectedProfile.medical_conditions.split(',').map((c: string) => c.trim())
                                         : [];

                                 const displayConditions = conditions
                                     .map((c: any) => {
                                         if (!c) return null;
                                         const conditionStr = String(c);
                                         return conditionStr === 'Others' ? (selectedProfile.other_medical_condition || 'Other Conditions') : conditionStr;
                                     })
                                     .filter(Boolean)
                                     .join(', ');

                                return displayConditions ? (
                                    <div className="bg-red-50/60 backdrop-blur-sm p-8 rounded-3xl border border-red-100 relative z-10">
                                        <h4 className="text-[10px] font-black text-red-900/60 uppercase tracking-[0.4em] mb-4 flex items-center gap-3"><AlertCircle className="w-4 h-4" /> PHYSICAL CONDITIONS</h4>
                                        <p className="text-[11px] text-red-900 font-black uppercase tracking-[0.2em] leading-relaxed">{displayConditions}</p>
                                    </div>
                                ) : (
                                    <div className="bg-sage/5 backdrop-blur-sm p-8 rounded-3xl border border-forest/10 relative z-10">
                                        <h4 className="text-[10px] font-black text-forest/40 uppercase tracking-[0.4em] mb-2">HEALTH STATUS</h4>
                                        <p className="text-[10px] text-forest/60 uppercase tracking-[0.3em] font-black">No reported conditions.</p>
                                    </div>
                                );
                            })()}
                        </div>
                        <button onClick={() => setSelectedProfile(null)} className="w-full py-6 bg-forest text-white rounded-[12px] text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-md active:scale-95">CLOSE</button>
                    </div>
                </div>
            )}

            {/* Booking Detail Modal (Mobile) */}
            {selectedBooking && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 bg-charcoal/40 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}>
                    <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-white/40 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-8 md:p-10 border-b border-border-grey/50 flex justify-between items-center bg-white/30">
                            <div>
                                <h3 className="text-2xl font-serif text-charcoal tracking-tighter">Booking Details</h3>
                                <p className="text-[9px] font-black text-charcoal/40 uppercase tracking-[0.4em] mt-2">SESSION OVERVIEW</p>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="p-4 hover:bg-white/60 rounded-2xl transition-all border border-transparent hover:border-border-grey">
                                <X className="w-5 h-5 text-charcoal/40" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10">
                            {/* Client Info */}
                            <div className="flex items-center gap-6 bg-white/40 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] border border-border-grey/40 shadow-tight">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-tight shrink-0">
                                    <Avatar 
                                        src={selectedBooking.client?.avatar_url} 
                                        fallbackName={selectedBooking.client?.full_name} 
                                        size={80} 
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-2xl font-serif text-charcoal truncate tracking-tight">{selectedBooking.client?.full_name}</h4>

                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <button 
                                            onClick={() => setSelectedProfile(selectedBooking.client)}
                                            className="px-5 py-2.5 bg-white/60 border border-border-grey/60 rounded-xl text-[10px] font-black text-charcoal/60 hover:text-charcoal transition-all uppercase tracking-[0.2em] active:scale-95"
                                        >
                                            View Profile
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const chat = { 
                                                    id: selectedBooking.id, 
                                                    recipientId: selectedBooking.client_id, 
                                                    name: selectedBooking.client?.full_name || 'Client',
                                                    isExpired: isChatExpired(selectedBooking)
                                                };
                                                setActiveChat(chat);
                                                setSelectedBooking(null);
                                            }}
                                            className="px-5 py-2.5 bg-forest text-white rounded-xl text-[10px] font-black hover:brightness-110 transition-all flex items-center gap-2.5 uppercase tracking-[0.2em] shadow-tight active:scale-95"
                                        >
                                            <MessageSquare className="w-4 h-4" /> Message
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="earth-card p-6 bg-white border border-border-grey shadow-tight">
                                    <p className="text-[10px] font-bold text-slate uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-forest" /> Session Info
                                    </p>
                                    <div className="space-y-4">
                                        <div className="text-charcoal">
                                            <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest mb-1">DATE & TIME</p>
                                            <p className="text-sm font-bold uppercase tracking-tight">
                                                {(() => {
                                                    const slot = Array.isArray(selectedBooking.slots) ? selectedBooking.slots[0] : selectedBooking.slots;
                                                    const date = slot?.date || selectedBooking.date;
                                                    return date ? format(new Date(date), 'EEEE, MMMM d, yyyy') : 'Session Date';
                                                })()}
                                            </p>
                                            <p className="text-sm font-bold text-forest mt-0.5">
                                                {(() => {
                                                    const slot = Array.isArray(selectedBooking.slots) ? selectedBooking.slots[0] : selectedBooking.slots;
                                                    return `${slot?.start_time || '--:--'} - ${slot?.end_time || '--:--'}`;
                                                })()}
                                            </p>
                                        </div>
                                        <div className="text-charcoal">
                                            <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest mb-1">EQUIPMENT</p>
                                            <p className="text-sm font-bold uppercase tracking-wider">{selectedBooking.price_breakdown?.equipment || 'Standard'}</p>
                                            <p className="text-[10px] font-bold text-slate mt-0.5 capitalize">UNITS: {selectedBooking.price_breakdown?.units || 1}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="earth-card p-6 bg-white border border-border-grey shadow-tight">
                                    <p className="text-[10px] font-bold text-slate uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-forest" /> Studio Location
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest mb-1">STUDIO</p>
                                            <p className="text-sm font-bold text-charcoal uppercase tracking-tight">{selectedBooking.studio?.name}</p>
                                            <p className="text-xs text-slate mt-1 leading-relaxed capitalize">{selectedBooking.studio?.location}</p>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedStudio(selectedBooking.studio)}
                                            className="text-[10px] font-bold text-forest hover:text-charcoal transition-colors uppercase tracking-[0.2em] flex items-center gap-2"
                                        >
                                            View Details <ArrowUpRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Booking History */}
                            {selectedBooking.booking_history && selectedBooking.booking_history.length > 0 && (
                                <div className="space-y-6 bg-off-white/50 p-6 rounded-2xl border border-border-grey/50 shadow-inner">
                                    <h4 className="text-[10px] font-bold text-slate uppercase tracking-[0.3em] flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Activity History
                                    </h4>
                                    <div className="space-y-4">
                                        {(selectedBooking.booking_history as any[]).map((entry, idx) => (
                                            <div key={idx} className="flex gap-4 items-start pb-4 mb-4 border-b border-border-grey/30 last:border-0 last:pb-0 last:mb-0">
                                                <div className="w-2 h-2 rounded-full bg-forest mt-1.5 shrink-0 shadow-sm" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-charcoal font-bold uppercase tracking-tight leading-snug">{entry.action_description || entry.status}</p>
                                                    <p className="text-[10px] text-slate mt-1 font-medium">{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8 border-t border-border-grey bg-alabaster/50 flex flex-col md:flex-row gap-4">
                            {selectedBooking.status === 'approved' && (
                                <button 
                                    onClick={() => {
                                        setCancellingBooking(selectedBooking);
                                        setSelectedBooking(null);
                                    }}
                                    className="flex-1 px-8 py-4 bg-white border-2 border-burgundy/10 text-burgundy rounded-2xl text-[10px] font-bold hover:bg-burgundy/5 transition-all uppercase tracking-[0.25em] shadow-tight active:scale-95"
                                >
                                    Cancel Session
                                </button>
                            )}
                            <button 
                                onClick={() => setSelectedBooking(null)}
                                className="flex-1 px-8 py-4 bg-forest text-white rounded-2xl text-[10px] font-bold hover:brightness-110 transition-all uppercase tracking-[0.25em] shadow-tight active:scale-95"
                            >
                                Close Overview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Availability Modal (Mobile) */}
            {isEditModalOpen && editingSlot && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}>
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-card border border-border-grey overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-border-grey flex justify-between items-center bg-alabaster/50">
                            <div>
                                <h3 className="text-xl font-serif text-charcoal tracking-tight">Edit Availability</h3>
                                <p className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] mt-1">UPDATE PARAMETERS</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-white rounded-xl transition-colors border border-border-grey shadow-tight">
                                <X className="w-5 h-5 text-slate" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                            <form action={(formData) => handleUpdate(editingSlot.id, formData)} className="space-y-8">
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate uppercase tracking-widest pl-1">Target Date</label>
                                        <input 
                                            name="date" 
                                            type="date" 
                                            required 
                                            value={singleDate} 
                                            onChange={(e) => setSingleDate(e.target.value)}
                                            className="w-full px-5 py-4 bg-off-white border border-border-grey rounded-2xl text-xs font-bold text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all uppercase tracking-widest shadow-inner cursor-pointer"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate uppercase tracking-widest pl-1">Starts</label>
                                            <input 
                                                name="start_time" 
                                                type="time" 
                                                required 
                                                value={singleTime} 
                                                onChange={(e) => setSingleTime(e.target.value)}
                                                className="w-full px-5 py-4 bg-off-white border border-border-grey rounded-2xl text-xs font-bold text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all shadow-inner cursor-pointer"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate uppercase tracking-widest pl-1">Ends</label>
                                            <input 
                                                name="end_time" 
                                                type="time" 
                                                required 
                                                value={singleEndTime} 
                                                onChange={(e) => setSingleEndTime(e.target.value)}
                                                className="w-full px-5 py-4 bg-off-white border border-border-grey rounded-2xl text-xs font-bold text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all shadow-inner cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate uppercase tracking-widest pl-1">Primary Location</label>
                                    <select 
                                        name="location_area" 
                                        required 
                                        defaultValue={editingSlot.location_area}
                                        className="w-full px-5 py-4 bg-off-white border border-border-grey rounded-2xl text-xs font-bold text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all uppercase tracking-widest shadow-inner cursor-pointer"
                                    >
                                        {AREAS.sort().map(loc => (
                                            <option key={loc} value={loc}>{loc}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="pt-6 flex flex-col gap-4">
                                    <button 
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-5 bg-forest text-white rounded-2xl text-[10px] font-bold hover:brightness-110 transition-all uppercase tracking-[0.25em] shadow-tight disabled:opacity-50 active:scale-95"
                                    >
                                        {isSubmitting ? 'Updating...' : 'Save Parameters'}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleDelete(editingSlot.id, editingSlot.group_id)}
                                        className="w-full py-5 bg-white border-2 border-burgundy/10 text-burgundy rounded-2xl text-[10px] font-bold hover:bg-burgundy/5 transition-all uppercase tracking-[0.25em] flex items-center justify-center gap-3 shadow-tight active:scale-95"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Availability
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Slot Modal (Mobile) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-card border border-border-grey overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-border-grey flex justify-between items-center bg-alabaster/50">
                            <div>
                                <h3 className="text-xl font-serif text-charcoal tracking-tight">Add Single Slot</h3>
                                <p className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] mt-1">NEW AVAILABILITY</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-3 hover:bg-white rounded-xl transition-colors border border-border-grey shadow-tight">
                                <X className="w-5 h-5 text-slate" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            {!isProfileComplete ? (
                                <div className="p-8 bg-burgundy/5 border border-burgundy/10 rounded-[2rem] text-center space-y-6">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-tight border border-burgundy/10">
                                        <AlertTriangle className="w-8 h-8 text-burgundy" />
                                    </div>
                                    <h4 className="text-xl font-serif text-charcoal tracking-tight">Setup Required</h4>
                                    <p className="text-xs text-slate leading-relaxed uppercase tracking-widest font-medium">Please define your teaching equipment and rates in settings first.</p>
                                    <Link href="/instructor/profile" className="block w-full py-4 bg-forest text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-tight active:scale-95">Go to Settings</Link>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateSingle} className="space-y-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate uppercase tracking-widest pl-1">Select Date</label>
                                            <input 
                                                type="date" 
                                                required 
                                                value={singleDate} 
                                                onChange={(e) => setSingleDate(e.target.value)}
                                                className="w-full px-5 py-5 bg-off-white border border-border-grey rounded-2xl text-xs font-bold text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all uppercase tracking-widest shadow-inner cursor-pointer"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate uppercase tracking-widest pl-1">Starts</label>
                                                <input 
                                                    type="time" 
                                                    required 
                                                    value={singleTime} 
                                                    onChange={(e) => setSingleTime(e.target.value)}
                                                    className="w-full px-5 py-5 bg-off-white border border-border-grey rounded-2xl text-xs font-bold text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all shadow-inner cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate uppercase tracking-widest pl-1">Ends</label>
                                                <input 
                                                    type="time" 
                                                    required 
                                                    value={singleEndTime} 
                                                    onChange={(e) => setSingleEndTime(e.target.value)}
                                                    className="w-full px-5 py-5 bg-off-white border border-border-grey rounded-2xl text-xs font-bold text-charcoal focus:ring-1 focus:ring-forest outline-none transition-all shadow-inner cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-[10px] font-bold text-slate uppercase tracking-widest pl-1">Target Areas</label>
                                        <div className="space-y-4">
                                            {Object.entries(GROUPED_AREAS).sort().map(([city, cityLocations]) => (
                                                <div key={city} className="border border-border-grey rounded-[1.5rem] overflow-hidden bg-off-white/50 shadow-sm">
                                                    <button 
                                                        type="button"
                                                        onClick={() => toggleCityAccordion(city)}
                                                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white transition-all border-b border-border-grey/50"
                                                    >
                                                        <span className="text-[10px] font-bold text-charcoal uppercase tracking-[0.2em]">{city}</span>
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-[9px] text-slate font-black uppercase tracking-tighter">{cityLocations.filter(l => locations.includes(l)).length} SET</span>
                                                            <ChevronRight className={clsx("w-4 h-4 text-slate/40 transition-transform", expandedCities.includes(city) && "rotate-90")} />
                                                        </div>
                                                    </button>
                                                    {expandedCities.includes(city) && (
                                                        <div className="p-4 grid grid-cols-1 gap-2 bg-white animate-in slide-in-from-top-2 duration-200">
                                                            <button 
                                                                type="button"
                                                                onClick={() => toggleCityGroup(cityLocations)}
                                                                className="text-left px-4 py-2.5 text-[9px] font-black text-forest hover:bg-forest/5 rounded-xl transition-all uppercase tracking-[0.2em] mb-1"
                                                            >
                                                                {cityLocations.every(l => locations.includes(l)) ? 'Deselect All' : 'Select Entire ' + city}
                                                            </button>
                                                            {cityLocations.map(loc => (
                                                                <button 
                                                                    key={loc}
                                                                    type="button"
                                                                    onClick={() => toggleLocation(loc)}
                                                                    className={clsx(
                                                                        "text-left px-4 py-4 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest flex items-center justify-between border",
                                                                        locations.includes(loc) 
                                                                            ? "bg-buttermilk border-burgundy/10 text-burgundy shadow-tight scale-[1.02]" 
                                                                            : "text-slate bg-off-white/50 border-transparent hover:border-border-grey"
                                                                    )}
                                                                >
                                                                    {loc?.split(' - ')[1] || loc || 'Studio'}
                                                                    {locations.includes(loc) && <CheckCircle className="w-4 h-4 text-burgundy" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button 
                                            type="submit"
                                            disabled={isSubmitting || locations.length === 0}
                                            className="w-full py-5 bg-forest text-white rounded-2xl text-[10px] font-bold hover:brightness-110 transition-all uppercase tracking-[0.3em] shadow-tight disabled:opacity-50 active:scale-95"
                                        >
                                            {isSubmitting ? 'Creating Session...' : 'Activate Session'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Studio Detail Modal */}
            {selectedStudio && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedStudio(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 p-8 md:p-12 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedStudio(null)} className="absolute top-6 right-6 p-2 hover:bg-charcoal/5 rounded-full transition-colors text-charcoal/50 hover:text-charcoal"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden mb-6 border-4 border-white shadow-tight relative z-10 bg-white">
                                <Avatar 
                                    src={selectedStudio.logo_url} 
                                    fallbackName={selectedStudio.name} 
                                    size={96} 
                                />
                            </div>

                            <h3 className="text-3xl font-serif text-charcoal tracking-tighter mb-2">{selectedStudio.name}</h3>
                            <p className="text-[10px] font-black text-slate uppercase tracking-[0.3em]">{selectedStudio.location}</p>
                        </div>

                        <div className="space-y-6 mb-10">
                            {selectedStudio.description && (
                                <div className="bg-off-white/50 p-6 rounded-2xl border border-border-grey/50">
                                    <h4 className="text-[9px] font-black text-charcoal/40 uppercase tracking-[0.4em] mb-3">ABOUT THE STUDIO</h4>
                                    <p className="text-[11px] text-charcoal/70 leading-relaxed">{selectedStudio.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center gap-4 p-4 bg-white border border-border-grey rounded-xl shadow-tight">
                                    <div className="w-10 h-10 rounded-lg bg-forest/5 flex items-center justify-center"><Box className="w-5 h-5 text-forest/40" /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em]">CONTACT INFO</p>
                                        <p className="text-[11px] font-bold text-charcoal">{selectedStudio.email || 'No email provided'}</p>
                                        <p className="text-[11px] font-bold text-slate">{selectedStudio.phone || 'No phone provided'}</p>
                                    </div>
                                </div>
                                {selectedStudio && (
                                    <a 
                                        href={selectedStudio.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedStudio.name} ${selectedStudio.location}`)}`}
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center justify-between p-4 bg-white border border-border-grey rounded-xl shadow-tight hover:border-forest/40 hover:bg-forest/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-forest/5 flex items-center justify-center"><MapPin className="w-5 h-5 text-forest/40" /></div>
                                            <div>
                                                <p className="text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em]">LOCATION</p>
                                                <p className="text-[11px] font-bold text-charcoal group-hover:text-forest transition-colors">Open in Google Maps</p>
                                            </div>
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 text-charcoal/50 group-hover:text-forest transition-all" />
                                    </a>
                                )}
                            </div>
                        </div>

                        <button onClick={() => setSelectedStudio(null)} className="w-full py-6 bg-forest text-white rounded-[12px] text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-md active:scale-95">CLOSE</button>
                    </div>
                </div>
            )}
        </div>
    );
}
