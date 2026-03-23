'use client';

import { useEffect, useState, useOptimistic, useTransition } from 'react';
import { Calendar, Clock, MessageSquare, X, ChevronRight, User, MapPin, ArrowUpRight, AlertCircle, Box, Loader2, Pencil, Copy, Trash2, AlertTriangle, CheckCircle, Plus, RefreshCcw, UserCheck, Wallet } from 'lucide-react'
import Avatar from '@/components/shared/Avatar';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ChatWindow from '@/components/dashboard/ChatWindow';
import MessageCountBadge from '@/components/dashboard/MessageCountBadge';
import { formatManilaDateStr, formatTo12Hour, getManilaTodayStr, toManilaTimeString } from '@/lib/timezone';
import CancelBookingModal from './CancelBookingModal';
import { cancelBookingByInstructor, checkInClient } from '@/app/(dashboard)/instructor/booking-actions';
import InstructorScheduleCalendar from '@/components/instructor/InstructorScheduleCalendar';
import InstructorStatCards from './InstructorStatCards';
import RevenueTrendChart from './RevenueTrendChart';
import MobileScheduleCalendar from '@/components/dashboard/MobileScheduleCalendar';
import { deleteAvailability } from '@/app/(dashboard)/instructor/schedule/actions';
import clsx from 'clsx';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/Toast';
import { DashboardHero } from './DashboardHero';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { Button } from '@/components/ui/Button';
import DashboardErrorBoundary from '@/components/shared/DashboardErrorBoundary';

interface InstructorDashboardClientProps {
    userId: string;
    initialCalendarBookings: any[];
    initialUpcomingBookings: any[];
    availableBalance: number;
    hasPendingPayout: boolean;
    availability: any[];
    totalSessionsTaught: number;
    pendingEarnings: number;
    revenueTrends?: any[];
    currentDateStr: string;
    instructorProfile: {
        id: string;
        teaching_equipment?: string[];
        rates?: Record<string, number>;
        home_base_address?: string | null;
        offers_home_sessions?: boolean;
        max_travel_km?: number;
    } | null;
    fullName?: string;
    avatarUrl?: string;
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
    revenueTrends,
    currentDateStr,
    instructorProfile,
    fullName,
    avatarUrl
}: InstructorDashboardClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isMounted, setIsMounted] = useState(false);
    const [isPending, startTransition] = useTransition();

    const normalizeBookings = (bookings: any[]) => bookings.map(b => ({
        ...b,
        slots: Array.isArray(b.slots) ? b.slots[0] : b.slots
    }));

    const [calendarBookings, setCalendarBookings] = useState<any[]>(() => normalizeBookings(initialCalendarBookings));
    const [upcomingBookings, setUpcomingBookings] = useState<any[]>(() => normalizeBookings(initialUpcomingBookings));

    // Optimistic UI for bookings status
    const [optimisticBookings, addOptimisticBooking] = useOptimistic(
        upcomingBookings,
        (state, { id, status, client_checked_in_at }: { id: string, status?: string, client_checked_in_at?: string | null }) => 
            state.map(b => b.id === id 
                ? { ...b, ...(status && { status }), ...(client_checked_in_at !== undefined && { client_checked_in_at }) }
                : b
            ).filter(b => b.status !== 'cancelled_refunded' && b.status !== 'cancelled_charged')
    );

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
    const [equipment, setEquipment] = useState<string[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');

    const isProfileComplete = !!(
        instructorProfile?.teaching_equipment &&
        instructorProfile.teaching_equipment.length > 0 &&
        instructorProfile.rates &&
        Object.keys(instructorProfile.rates).length > 0 &&
        instructorProfile.home_base_address
    );

    const [expandedCities, setExpandedCities] = useState<string[]>([]);

    const toggleEquipment = (eq: string) => {
        setEquipment(prev =>
            prev.includes(eq)
                ? prev.filter(e => e !== eq)
                : [...prev, eq]
        );
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
        
        startTransition(async () => {
            // Optimistic update: mark as cancelled (which filters it out in our reducer)
            addOptimisticBooking({ id: cancellingBooking.id, status: 'cancelled_refunded' });
            
            const result = await cancelBookingByInstructor(cancellingBooking.id, reason);
            if (result.success) {
                setCalendarBookings(prev => prev.filter(b => b.id !== cancellingBooking.id));
                setUpcomingBookings(prev => prev.filter(b => b.id !== cancellingBooking.id));
                toast('Session cancelled successfully', 'success');
            } else {
                toast(result.error || 'Failed to cancel session', 'error');
            }
        });
        return { success: true }; // Close modal immediately
    };

    // Optimistic check-in handler
    const handleCheckIn = async (bookingId: string) => {
        if (!confirm('Check in this client?')) return;
        
        startTransition(async () => {
            addOptimisticBooking({ id: bookingId, client_checked_in_at: new Date().toISOString() });
            
            const result = await checkInClient(bookingId);
            if (result.success) {
                toast('Check-in recorded', 'success');
                // Permanent state update
                setUpcomingBookings(prev => prev.map(b => b.id === bookingId ? { ...b, client_checked_in_at: new Date().toISOString() } : b));
            } else {
                toast(result.error || 'Failed to check in', 'error');
            }
        });
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

        if (!instructorProfile?.home_base_address) {
            alert('Please set your Service Area in profile settings first.');
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
            locations: [instructorProfile?.home_base_address || ''],
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
            {/* Unified Dashboard Hero */}
            <DashboardHero 
                title="Instructor Dashboard"
                subtitle="Manage your professional schedule and earnings with grounded precision."
                profile={instructorProfile ? {
                    name: fullName || 'Instructor',
                    location: instructorProfile.home_base_address || 'Home Base',
                    image: avatarUrl
                } : undefined}
            />

            <PWAInstallPrompt />

            {/* Service Area Setup Prompt */}
            {!instructorProfile?.home_base_address && (
                <div className="atelier-card !bg-forest/5 !border-forest/10 p-6 sm:p-10 lg:p-14 mb-8 sm:mb-12 relative overflow-hidden group/service">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none group-hover:bg-forest/10 transition-colors" />
                    <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-10 relative z-10">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-burgundy text-white rounded-[1.5rem] sm:rounded-[2rem] flex items-center justify-center shadow-ambient shrink-0 group-hover/service:scale-110 transition-transform duration-700">
                            <AlertTriangle className="w-7 h-7 sm:w-9 sm:h-9" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl sm:text-4xl font-serif text-burgundy tracking-tight mb-2 sm:mb-3">Connect with Clients at Home</h2>
                            <p className="text-[10px] sm:text-[11px] font-bold text-slate uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-relaxed max-w-2xl">
                                You haven't set your service area yet. Pin your home base and define your travel radius to appear in "Home Session" searches and grow your reach.
                            </p>
                        </div>
                        <Link 
                            href="/instructor/profile"
                            className="btn-primary-atelier !py-3 sm:!py-4 !px-8 sm:!px-10 !text-[9px] sm:!text-[10px]"
                        >
                            Setup Area
                        </Link>
                    </div>
                </div>
            )}

            {/* Analytics Cards */}
            <DashboardErrorBoundary fallbackTitle="Statistics Failure">
                <InstructorStatCards
                    stats={{
                        balance: availableBalance || 0,
                        upcomingSessions: calendarBookings.filter(b => b.status === 'approved').length,
                        totalHours: totalSessionsTaught,
                        pendingEarnings: pendingEarnings
                    }}
                    hasPendingPayout={hasPendingPayout}
                />
            </DashboardErrorBoundary>

            {/* Revenue Trends Visualization */}
            {revenueTrends && revenueTrends.length > 0 && (
                <div className="max-w-5xl mx-auto px-4 sm:px-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <RevenueTrendChart 
                            data={revenueTrends} 
                            title="Revenue Growth" 
                            type="revenue"
                        />
                        <RevenueTrendChart 
                            data={revenueTrends} 
                            title="Booking Volume" 
                            type="bookings"
                        />
                    </div>
                </div>
            )}

            {/* Dashboard Grid Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
                {/* Main Content Area */}
                {/* Main Content Area */}
                <div className="lg:col-span-12 space-y-12">
                    {/* Today's Agenda / Quick Overview */}
                    <div className="mx-auto max-w-5xl w-full">
                        <div className="atelier-card p-8 sm:p-12 bg-white border border-burgundy/5 shadow-ambient relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 relative z-10 gap-6">
                                <div>
                                    <h2 className="text-3xl sm:text-4xl font-serif text-burgundy tracking-tight">Today's Agenda</h2>
                                    <p className="text-[10px] sm:text-xs font-black text-burgundy/40 uppercase tracking-[0.3em] mt-1.5">{format(new Date(), 'EEEE, MMMM do')}</p>
                                </div>
                                <Link 
                                    href="/instructor/schedule"
                                    className="px-6 py-3 bg-forest text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-card flex items-center gap-2"
                                >
                                    <Calendar className="w-4 h-4" />
                                    Open Full Calendar
                                </Link>
                            </div>

                            <DashboardErrorBoundary fallbackTitle="Agenda Failure">
                                <div className="space-y-6 relative z-10">
                                    {optimisticBookings.filter(b => {
                                        const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots;
                                        return slot?.date === getManilaTodayStr();
                                    }).length > 0 ? (
                                        optimisticBookings
                                            .filter(b => {
                                                const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots;
                                                return slot?.date === getManilaTodayStr();
                                            })
                                            .sort((a, b) => {
                                                const slotA = Array.isArray(a.slots) ? a.slots[0] : a.slots;
                                                const slotB = Array.isArray(b.slots) ? b.slots[0] : b.slots;
                                                return (slotA?.start_time || '').localeCompare(slotB?.start_time || '');
                                            })
                                            .map((booking) => {
                                                const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots;
                                                
                                                // Live indicator logic
                                                const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Manila' });
                                                const isLive = nowTime >= (slot?.start_time || '99:99') && nowTime <= (slot?.end_time || '00:00');
                                                
                                                return (
                                                    <div key={booking.id} className={clsx(
                                                        "flex items-center gap-8 p-8 border rounded-3xl transition-all duration-500 group/item relative overflow-hidden",
                                                        isLive 
                                                            ? "bg-white border-forest shadow-ambient ring-2 ring-forest/10" 
                                                            : "bg-surface-container-low/40 border-burgundy/5 hover:bg-white hover:shadow-ambient"
                                                    )}>
                                                        {isLive && (
                                                            <div className="absolute top-0 right-0 px-4 py-1.5 bg-forest text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl animate-pulse">
                                                                Live Now
                                                            </div>
                                                        )}
                                                        <div className={clsx(
                                                            "w-24 flex flex-col items-center justify-center py-4 rounded-2xl border transition-colors duration-500",
                                                            isLive 
                                                                ? "bg-forest text-white border-forest" 
                                                                : "bg-burgundy/5 text-burgundy border-burgundy/10 group-hover/item:bg-burgundy group-hover/item:text-white"
                                                        )}>
                                                            <span className="text-sm font-black uppercase tracking-tighter leading-none">{formatTo12Hour(slot?.start_time || '00:00:00').split(' ')[0]}</span>
                                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{formatTo12Hour(slot?.start_time || '00:00:00').split(' ')[1]}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-4 mb-2">
                                                                <span className={clsx(
                                                                    "text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg",
                                                                    isLive ? "bg-forest/10 text-forest" : "bg-forest/5 text-forest"
                                                                )}>{slot?.session_type || 'Private Session'}</span>
                                                                <span className="w-1 h-1 bg-border-grey rounded-full" />
                                                                <span className="text-[11px] font-bold text-slate uppercase tracking-widest flex items-center gap-1.5">
                                                                    <MapPin className="w-3.5 h-3.5 opacity-40" />
                                                                    {slot?.studios?.name || 'Home Base'}
                                                                </span>
                                                            </div>
                                                            <h3 className="text-xl sm:text-2xl font-serif text-charcoal truncate tracking-tight">{booking.client?.full_name}</h3>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <button 
                                                                onClick={() => setSelectedBooking(booking)}
                                                                className={clsx(
                                                                    "w-12 h-12 flex items-center justify-center rounded-full transition-all shadow-tight hover:shadow-card border",
                                                                    isLive 
                                                                        ? "bg-white border-forest/20 text-forest" 
                                                                        : "bg-white border-border-grey/40 text-charcoal/40 hover:text-forest hover:border-forest/20"
                                                                )}
                                                            >
                                                                <ChevronRight className="w-6 h-6" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                    ) : (
                                        <div className="py-24 flex flex-col items-center justify-center bg-off-white/20 rounded-[3rem] border border-dashed border-border-grey/60">
                                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-tight mb-8">
                                                <Calendar className="w-8 h-8 text-charcoal/20" />
                                            </div>
                                            <h3 className="text-xl font-serif text-charcoal/40 tracking-tight mb-2">Clear Afternoon</h3>
                                            <p className="text-[11px] font-black text-charcoal/30 uppercase tracking-[0.4em] italic mb-8">No sessions scheduled for today</p>
                                            <button 
                                                onClick={() => setIsAddModalOpen(true)}
                                                className="px-8 py-3.5 border-2 border-forest/20 text-forest rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-forest hover:text-white hover:border-forest transition-all shadow-tight"
                                            >
                                                Add Availability
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </DashboardErrorBoundary>
                        </div>

                        {/* Quick Access Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
                            <Link 
                                href="/instructor/schedule"
                                className="atelier-card p-10 bg-white border border-burgundy/5 shadow-tight hover:shadow-ambient hover:-translate-y-1 transition-all duration-500 group/card"
                            >
                                <div className="w-14 h-14 bg-forest/5 rounded-2xl flex items-center justify-center mb-8 group-hover/card:bg-forest group-hover/card:text-white transition-colors">
                                    <Plus className="w-7 h-7 text-forest group-hover/card:text-white" />
                                </div>
                                <h3 className="text-2xl font-serif text-burgundy tracking-tight mb-3">Manage Schedule</h3>
                                <p className="text-[11px] font-bold text-slate/60 uppercase tracking-widest leading-relaxed">Update your weekly slots and availability windows.</p>
                            </Link>
                            <Link 
                                href="/instructor/earnings"
                                className="atelier-card p-10 bg-white border border-burgundy/5 shadow-tight hover:shadow-ambient hover:-translate-y-1 transition-all duration-500 group/card"
                            >
                                <div className="w-14 h-14 bg-burgundy/5 rounded-2xl flex items-center justify-center mb-8 group-hover/card:bg-burgundy group-hover/card:text-white transition-colors">
                                    <Wallet className="w-7 h-7 text-burgundy group-hover/card:text-white" />
                                </div>
                                <h3 className="text-2xl font-serif text-burgundy tracking-tight mb-3">Review Earnings</h3>
                                <p className="text-[11px] font-bold text-slate/60 uppercase tracking-widest leading-relaxed">Monitor your yield, payouts, and financial performance.</p>
                            </Link>
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
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-burgundy/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedProfile(null)}>
                    <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 p-8 md:p-12 relative border border-white/40" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedProfile(null)} className="absolute top-8 right-8 p-3 hover:bg-burgundy/5 rounded-2xl transition-all text-burgundy/30 hover:text-burgundy border border-transparent hover:border-burgundy/5"><X className="w-5 h-5" /></button>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                        <div className="flex flex-col items-center text-center mb-10">
                             <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-white shadow-tight relative z-10">
                                <Avatar 
                                    src={selectedProfile.avatar_url} 
                                    fallbackName={selectedProfile.full_name} 
                                    size={96} 
                                />
                            </div>

                            <h3 className="text-3xl font-serif text-burgundy tracking-tighter mb-2">{selectedProfile.full_name}</h3>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.35em]">{selectedProfile.email}</p>
                                {selectedProfile.date_of_birth && (
                                    <div className="inline-block px-3 py-1 bg-forest/5 rounded-full border border-forest/10 mt-2">
                                        <p className="text-[9px] font-black text-forest uppercase tracking-[0.2em]">{calculateAge(selectedProfile.date_of_birth)} YEARS OLD</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedProfile.bio && (
                            <div className="bg-white/40 p-6 rounded-[2rem] border border-white/60 mb-6 relative z-10">
                                <h4 className="text-[9px] font-black text-burgundy/40 uppercase tracking-[0.4em] mb-3">BIO</h4>
                                <p className="text-[11px] text-burgundy/60 leading-relaxed italic uppercase tracking-wider">"{selectedProfile.bio}"</p>
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
                                    <div className="bg-red-50/60 backdrop-blur-sm p-8 rounded-[2rem] border border-red-100 relative z-10 mt-6">
                                        <h4 className="text-[10px] font-black text-red-900/60 uppercase tracking-[0.4em] mb-4 flex items-center gap-3"><AlertCircle className="w-4 h-4" /> Conditions</h4>
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
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6 bg-burgundy/40 backdrop-blur-sm" onClick={() => setSelectedBooking(null)}>
                    <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-white/40 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-8 md:p-10 border-b border-border-grey/50 flex justify-between items-center bg-white/30">
                            <div>
                                <h3 className="text-2xl font-serif text-burgundy tracking-tighter">Booking Details</h3>
                                <p className="text-[9px] font-black text-burgundy/40 uppercase tracking-[0.4em] mt-2">SESSION OVERVIEW</p>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="p-4 hover:bg-white/60 rounded-2xl transition-all border border-transparent hover:border-border-grey">
                                <X className="w-5 h-5 text-burgundy/40" />
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
                                    <h4 className="text-2xl font-serif text-burgundy truncate tracking-tight">{selectedBooking.client?.full_name}</h4>

                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <button 
                                            onClick={() => setSelectedProfile(selectedBooking.client)}
                                            className="px-5 py-2.5 bg-white/60 border border-burgundy/10 rounded-xl text-[10px] font-black text-burgundy/60 hover:text-burgundy transition-all uppercase tracking-[0.2em] active:scale-95"
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
                                <div className="atelier-card p-6 bg-white border border-burgundy/5 shadow-tight">
                                    <p className="text-[10px] font-bold text-slate uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-forest" /> Session Info
                                    </p>
                                    <div className="space-y-4">
                                        <div className="text-burgundy">
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
                                        <div className="text-burgundy">
                                            <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest mb-1">EQUIPMENT</p>
                                            <p className="text-sm font-bold uppercase tracking-wider">{selectedBooking.price_breakdown?.equipment || 'Standard'}</p>
                                            <p className="text-[10px] font-bold text-slate mt-0.5 capitalize">UNITS: {selectedBooking.price_breakdown?.units || 1}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="atelier-card p-6 bg-white border border-burgundy/5 shadow-tight">
                                    <p className="text-[10px] font-bold text-slate uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-forest" /> Studio Location
                                    </p>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate/40 uppercase tracking-widest mb-1">STUDIO</p>
                                            <p className="text-sm font-bold text-burgundy uppercase tracking-tight">{selectedBooking.studio?.name}</p>
                                            <p className="text-xs text-slate mt-1 leading-relaxed capitalize">{selectedBooking.studio?.location}</p>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedStudio(selectedBooking.studio)}
                                            className="text-[10px] font-bold text-forest hover:text-burgundy transition-colors uppercase tracking-[0.2em] flex items-center gap-2"
                                        >
                                            View Details <ArrowUpRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Booking History */}
                            {selectedBooking.booking_history && selectedBooking.booking_history.length > 0 && (
                                <div className="space-y-6 bg-stone-50 p-6 rounded-2xl border border-burgundy/5 shadow-inner">
                                    <h4 className="text-[10px] font-bold text-slate uppercase tracking-[0.3em] flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Activity History
                                    </h4>
                                    <div className="space-y-4">
                                        {(selectedBooking.booking_history as any[]).map((entry, idx) => (
                                            <div key={idx} className="flex gap-4 items-start pb-4 mb-4 border-b border-border-grey/30 last:border-0 last:pb-0 last:mb-0">
                                                <div className="w-2 h-2 rounded-full bg-forest mt-1.5 shrink-0 shadow-sm" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs text-burgundy font-bold uppercase tracking-tight leading-snug">{entry.action_description || entry.status}</p>
                                                    <p className="text-[10px] text-slate mt-1 font-medium">{format(new Date(entry.timestamp), 'MMM d, h:mm a')}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8 border-t border-burgundy/5 bg-stone-50/50 flex flex-col md:flex-row gap-4">
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
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-burgundy/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}>
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-card border border-burgundy/5 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-burgundy/5 flex justify-between items-center bg-stone-50/50">
                            <div>
                                <h3 className="text-xl font-serif text-burgundy tracking-tight">Edit Availability</h3>
                                <p className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] mt-1">UPDATE PARAMETERS</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-3 hover:bg-stone-50 rounded-xl transition-colors border border-burgundy/5 shadow-tight">
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
                                            className="w-full px-5 py-4 bg-stone-50 border border-burgundy/10 rounded-2xl text-xs font-bold text-burgundy focus:ring-1 focus:ring-forest outline-none transition-all uppercase tracking-widest shadow-inner cursor-pointer"
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
                                                className="w-full px-5 py-4 bg-stone-50 border border-burgundy/10 rounded-2xl text-xs font-bold text-burgundy focus:ring-1 focus:ring-forest outline-none transition-all shadow-inner cursor-pointer"
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
                                                className="w-full px-5 py-4 bg-stone-50 border border-burgundy/10 rounded-2xl text-xs font-bold text-burgundy focus:ring-1 focus:ring-forest outline-none transition-all shadow-inner cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-forest/5 rounded-2xl border border-forest/10">
                                        <p className="text-[10px] font-bold text-forest uppercase tracking-widest mb-1">Service Area</p>
                                        <p className="text-[11px] font-bold text-burgundy">{instructorProfile?.home_base_address || 'No service area set'}</p>
                                    </div>
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
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-burgundy/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-card border border-burgundy/5 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-burgundy/5 flex justify-between items-center bg-stone-50/50">
                            <div>
                                <h3 className="text-xl font-serif text-burgundy tracking-tight">Add Single Slot</h3>
                                <p className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] mt-1">NEW AVAILABILITY</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-3 hover:bg-stone-50 rounded-xl transition-colors border border-burgundy/5 shadow-tight">
                                <X className="w-5 h-5 text-slate" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8">
                            {!isProfileComplete ? (
                                <div className="p-8 bg-burgundy/5 border border-burgundy/10 rounded-[2rem] text-center space-y-6">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-tight border border-burgundy/10">
                                        <AlertTriangle className="w-8 h-8 text-burgundy" />
                                    </div>
                                    <h4 className="text-xl font-serif text-burgundy tracking-tight">Setup Required</h4>
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
                                                className="w-full px-5 py-5 bg-stone-50 border border-burgundy/10 rounded-2xl text-xs font-bold text-burgundy focus:ring-1 focus:ring-forest outline-none transition-all uppercase tracking-widest shadow-inner cursor-pointer"
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
                                                    className="w-full px-5 py-5 bg-stone-50 border border-burgundy/10 rounded-2xl text-xs font-bold text-burgundy focus:ring-1 focus:ring-forest outline-none transition-all shadow-inner cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate uppercase tracking-widest pl-1">Ends</label>
                                                <input 
                                                    type="time" 
                                                    required 
                                                    value={singleEndTime} 
                                                    onChange={(e) => setSingleEndTime(e.target.value)}
                                                    className="w-full px-5 py-5 bg-stone-50 border border-burgundy/10 rounded-2xl text-xs font-bold text-burgundy focus:ring-1 focus:ring-forest outline-none transition-all shadow-inner cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>


                                    <div className="pt-6 space-y-4">
                                        {!instructorProfile?.home_base_address && (
                                            <div className="p-4 bg-burgundy/5 border border-burgundy/10 rounded-2xl flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-burgundy shrink-0 mt-0.5" />
                                                <p className="text-[11px] font-bold text-burgundy/80 leading-relaxed uppercase tracking-wider">
                                                    Service Area missing. Please set your home base in profile settings to activate sessions.
                                                </p>
                                            </div>
                                        )}
                                        <button 
                                            type="submit"
                                            disabled={isSubmitting || !instructorProfile?.home_base_address}
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
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-burgundy/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedStudio(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 p-8 md:p-12 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedStudio(null)} className="absolute top-6 right-6 p-2 hover:bg-stone-50 rounded-full transition-colors text-burgundy/30 hover:text-burgundy"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden mb-6 border-4 border-white shadow-tight relative z-10 bg-white">
                                <Avatar 
                                    src={selectedStudio.logo_url} 
                                    fallbackName={selectedStudio.name} 
                                    size={96} 
                                />
                            </div>

                            <h3 className="text-3xl font-serif text-burgundy tracking-tighter mb-2">{selectedStudio.name}</h3>
                            <p className="text-[10px] font-black text-slate uppercase tracking-[0.3em]">{selectedStudio.location}</p>
                        </div>

                        <div className="space-y-6 mb-10">
                            {selectedStudio.description && (
                                <div className="bg-stone-50 p-6 rounded-2xl border border-burgundy/5">
                                    <h4 className="text-[9px] font-black text-burgundy/40 uppercase tracking-[0.4em] mb-3">ABOUT THE STUDIO</h4>
                                    <p className="text-[11px] text-burgundy/70 leading-relaxed">{selectedStudio.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center gap-4 p-4 bg-white border border-burgundy/5 rounded-xl shadow-tight">
                                    <div className="w-10 h-10 rounded-lg bg-forest/5 flex items-center justify-center"><Box className="w-5 h-5 text-forest/40" /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">CONTACT INFO</p>
                                        <p className="text-[11px] font-bold text-burgundy">{selectedStudio.email || 'No email provided'}</p>
                                        <p className="text-[11px] font-bold text-slate">{selectedStudio.phone || 'No phone provided'}</p>
                                    </div>
                                </div>
                                {selectedStudio && (
                                    <a 
                                        href={selectedStudio.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedStudio.name} ${selectedStudio.location}`)}`}
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center justify-between p-4 bg-white border border-burgundy/5 rounded-xl shadow-tight hover:border-forest/40 hover:bg-forest/5 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-forest/5 flex items-center justify-center"><MapPin className="w-5 h-5 text-forest/40" /></div>
                                            <div>
                                                <p className="text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">LOCATION</p>
                                                <p className="text-[11px] font-bold text-burgundy group-hover:text-forest transition-colors">Open in Google Maps</p>
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
