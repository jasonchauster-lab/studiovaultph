'use client'

import { useState, useEffect } from 'react'
import { requestBooking, joinWaitlist } from '@/app/(dashboard)/customer/actions'
import { Loader2, CheckCircle, Calendar, ChevronLeft, ChevronRight, AlertCircle, Sparkles, Smartphone, Ticket } from 'lucide-react'
import { getActivePlans } from '@/app/(dashboard)/customer/pricing-actions'
import LegalAgreementCheckbox from '@/components/storefront/LegalAgreementCheckbox'
import InstructorProfileCard from '@/components/instructor/InstructorProfileCard'
import clsx from 'clsx'
import { formatTo12Hour, toManilaTimeString, normalizeTimeTo24h } from '@/lib/timezone'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isBefore, startOfDay, addDays, isPast } from 'date-fns'
import Image from 'next/image'
import { getSupabaseAssetUrl } from '@/lib/supabase/utils'

interface Slot {
    id: string;
    date: string; // YYYY-MM-DD
    start_time: string; // HH:mm:ss
    end_time: string;
    equipment?: Record<string, number>;
    equipment_type?: string;
    quantity?: number;
    is_available?: boolean;
    service_id?: string;
    instructor_id?: string | null;
}

interface Instructor {
    id: string;
    full_name: string;
    rates?: Record<string, number>;
    avatar_url?: string | null;
    bio?: string | null;
    instagram_handle?: string | null;
    certifications?: Array<{
        certification_body: string
        verified: boolean
    }>;
    teaching_equipment?: string[];
}

interface AvailabilityBlock {
    instructor_id: string;
    day_of_week: number;
    date: string | null;
    start_time: string;
    end_time: string;
    location_area?: string;
    equipment_type?: string | null;
}

export default function BookingSection({
    studioId,
    slots,
    instructors,
    availabilityBlocks,
    studioPricing,
    studioHourlyRate,
    studioLocation,
    pendingBookings = [],
    isStorefront = false,
    manualPaymentInstructions = null,
    enableManualPayments = false,
    enableXendit = false,
    manualPaymentMethods = [],
    outletId = null,
    legalConfig = null
}: {
    studioId: string
    outletId?: string | null
    slots: Slot[]
    instructors: Instructor[]
    availabilityBlocks: AvailabilityBlock[]
    studioPricing?: Record<string, number>
    studioHourlyRate?: number
    studioLocation?: string
    pendingBookings?: any[]
    isStorefront?: boolean
    manualPaymentInstructions?: string | null
    enableManualPayments?: boolean
    enableXendit?: boolean
    manualPaymentMethods?: any[]
    legalConfig?: {
        terms?: string
        privacy?: string
        refund?: string
    } | null
}) {
    const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null) // Key: start-end
    const [selectedInstructor, setSelectedInstructor] = useState<string>('')
    const [selectedEquipment, setSelectedEquipment] = useState<string>('')
    const [quantity, setQuantity] = useState<number>(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<'xendit' | 'manual' | 'credit'>(enableXendit ? 'xendit' : 'manual')
    const [userPlans, setUserPlans] = useState<any[]>([])
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
    const [agreedToLegal, setAgreedToLegal] = useState(false)

    // 2. State for active date & month
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const router = useRouter()
    const searchParams = useSearchParams()
    const viewedMonth = searchParams.get('month') || format(new Date(), 'yyyy-MM')
    const currentMonth = startOfMonth(new Date(viewedMonth + '-01'))

    const handleMonthChange = (offset: number) => {
        const next = offset > 0 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1)
        const params = new URLSearchParams(searchParams)
        params.set('month', format(next, 'yyyy-MM'))
        router.push(`?${params.toString()}`, { scroll: false })
    }

    // Auto-select equipment whenever the slot changes
    useEffect(() => {
        if (!selectedSlotTime || !selectedDate) return;
        const slotsInGroup = slots.filter(s => s.date === selectedDate && `${s.start_time}|${s.end_time}` === selectedSlotTime);
        const inventory: Record<string, number> = {};
        slotsInGroup.forEach(s => {
            const eq = (s as any).equipment;
            if (!eq || typeof eq !== 'object') return;

            // Handle array safely
            if (Array.isArray(eq)) {
                eq.forEach((item) => {
                    if (typeof item === 'string') {
                        const key = item.trim().toUpperCase();
                        inventory[key] = (inventory[key] || 0) + 1; // Default qty 1 for arrays
                    }
                });
                return;
            }

            // Normal object handling
            Object.entries(eq).forEach(([k, v]) => {
                const key = k.trim().toUpperCase();
                const val = typeof v === 'number' ? v : parseInt(v as string, 10) || 0;
                if (val > 0) inventory[key] = (inventory[key] || 0) + val;
            });
        });
        const firstEq = Object.keys(inventory)[0] || '';
        setSelectedEquipment(firstEq);
        setQuantity(1);

        // Auto-select instructor if pre-assigned to the slot
        const firstSlot = slotsInGroup[0] as any;
        if (firstSlot?.instructor_id) {
            setSelectedInstructor(firstSlot.instructor_id);
        }
    }, [selectedSlotTime, selectedDate, slots]);

    // Fetch user credits for this studio
    useEffect(() => {
        getActivePlans(studioId).then(setUserPlans)
    }, [studioId])

    // Determine available instructors for the selected time
    const availableInstructors = instructors.filter((instructor) => {
        // If no time selected OR no availability data at all, show everyone
        if (!selectedSlotTime || !selectedDate) return true;

        // 1. Case-Insensitive Equipment Check
        const instructorRates = instructor.rates || {};
        
        // NEW: If instructor is pre-assigned to THIS slot, they are ALWAYS available
        const slotsInGroup = slots.filter(s => s.date === selectedDate && `${s.start_time}|${s.end_time}` === selectedSlotTime);
        const isAssigned = slotsInGroup.some((s: any) => s.instructor_id === instructor.id);
        if (isAssigned) return true;
        const hasEquipment = Object.keys(instructorRates).some(
            (key) => key.toUpperCase() === selectedEquipment.toUpperCase()
        );
        if (!hasEquipment && selectedEquipment.toUpperCase() !== 'MAT') return false;

        // 2. Isolate blocks for THIS specific instructor
        const instBlocks = availabilityBlocks.filter(b => b.instructor_id === instructor.id);

        // Fallback: If no blocks exist for THIS instructor, assume they are available 
        if (instBlocks.length === 0) return true;

        // 3. Time and Fuzzy Location Match
        const [startTime] = selectedSlotTime.split('|');
        const slotTimeNormalized = normalizeTimeTo24h(startTime);
        const studioLocLower = (studioLocation || '').toLowerCase();
        const dayOfWeek = new Date(selectedDate + "T00:00:00+08:00").getDay();

        return instBlocks.some((block) => {
            const blockTimeNormalized = normalizeTimeTo24h(block.start_time);
            const blockLocLower = (block.location_area || '').toLowerCase();

            // Check if block covers the slot time
            const timeMatches = blockTimeNormalized <= slotTimeNormalized && normalizeTimeTo24h(block.end_time) > slotTimeNormalized;

            // Fuzzy match: Does the studio "qc - fairview" include the block's "qc"?
            const locationMatches = !blockLocLower || studioLocLower.includes(blockLocLower);

            // Date match
            const dateMatches = block.date === selectedDate || (block.date === null && block.day_of_week === dayOfWeek);

            return timeMatches && locationMatches && dateMatches;
        });
    });

    // 1. Group by Date
    const slotsByDate = slots.reduce((acc, slot) => {
        const date = slot.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(slot);
        return acc;
    }, {} as Record<string, Slot[]>);

    const availableDates = Object.keys(slotsByDate).sort();

    // Auto-select first date on mount
    useEffect(() => {
        if (availableDates.length > 0 && !selectedDate) {
            setSelectedDate(availableDates[0]);
        }
    }, [availableDates, selectedDate]);

    // Auto-select date/time from URL if present
    useEffect(() => {
        const urlDate = searchParams.get('date');
        const urlTime = searchParams.get('time');
        
        if (urlDate) {
            setSelectedDate(urlDate);
        }
        if (urlTime) {
            setSelectedSlotTime(urlTime);
        }
    }, [searchParams]);

    // Calendar logic
    const nextMonth = () => handleMonthChange(1)
    const prevMonth = () => handleMonthChange(-1)

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarRows = []
    let days = []
    let day = startDate
    let formattedDate = ""
    const today = startOfDay(new Date())

    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            formattedDate = format(day, "d")
            const cloneDay = day

            // Check if this render day has slots
            const dateStr = format(cloneDay, 'yyyy-MM-dd')
            const hasSlots = availableDates.includes(dateStr)
            const isSelected = selectedDate === dateStr
            const isPast = isBefore(cloneDay, today)

            days.push(
                <button
                    key={day.toString()}
                    type="button"
                    onClick={() => {
                        if (hasSlots) {
                            setSelectedDate(dateStr)
                            setSelectedSlotTime(null)
                        }
                    }}
                    className={clsx(
                        "h-12 flex flex-col items-center justify-center rounded-xl text-sm transition-all focus:outline-none",
                        !isSameMonth(day, monthStart) ? "text-cream-300 pointer-events-none" : "",
                        isSameMonth(day, monthStart) && !hasSlots && !isPast && !isSelected ? "text-charcoal-500 opacity-60" : "",
                        isPast ? "text-cream-400 pointer-events-none opacity-40" : "",
                        hasSlots && !isSelected ? "bg-white text-[var(--primary-brand,theme(colors.burgundy))] font-medium hover:bg-off-white cursor-pointer border border-border-grey" : "",
                        isSelected ? "bg-[var(--primary-brand,theme(colors.forest))] text-white font-bold shadow-md transform scale-105 border border-[var(--primary-brand,theme(colors.forest))]" : ""
                    )}
                    disabled={!hasSlots || isPast}
                >
                    <span className="leading-none">{formattedDate}</span>
                    {hasSlots && !isSelected && <span className="w-1 h-1 bg-[var(--primary-brand,theme(colors.forest))]/40 rounded-full mt-1"></span>}
                </button>
            )
            day = addDays(day, 1)
        }
        calendarRows.push(
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2" key={day.toString()}>
                {days}
            </div>
        )
        days = []
    }

    // 3. Group slots for the SELECTED date by time range
    const slotsForDate = selectedDate ? slotsByDate[selectedDate] : [];

    const groupedSlots = slotsForDate.reduce((acc, slot) => {
        const key = `${slot.start_time}|${slot.end_time}`;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(slot);
        return acc;
    }, {} as Record<string, Slot[]>);

    const sortedKeys = Object.keys(groupedSlots).sort((a, b) => {
        const timeA = a.split('|')[0];
        const timeB = b.split('|')[0];
        return timeA.localeCompare(timeB);
    });

    // Slots for the currently selected time slot
    const slotsInGroup: Slot[] = selectedSlotTime ? (groupedSlots[selectedSlotTime] || []) : [];

    // Helper: case-insensitive JSONB equipment lookup — sums actual inventory values
    const getEquipmentInventory = (slots: Slot[]): Record<string, number> => {
        const inventory: Record<string, number> = {};
        slots.forEach(s => {
            const equipmentData = (s as any).equipment;
            if (!equipmentData || typeof equipmentData !== 'object') return;

            if (Array.isArray(equipmentData)) {
                equipmentData.forEach((item) => {
                    if (typeof item === 'string') {
                        const key = item.trim().toUpperCase();
                        inventory[key] = (inventory[key] || 0) + 1;
                    }
                });
                return;
            }

            Object.entries(equipmentData).forEach(([rawKey, rawVal]) => {
                const key = rawKey.trim().toUpperCase(); // normalize to uppercase
                const val = typeof rawVal === 'number' ? rawVal : parseInt(rawVal as string, 10) || 0;
                if (val > 0) {
                    inventory[key] = (inventory[key] || 0) + val;
                }
            });
        });
        return inventory;
    };

    const equipmentInventory = getEquipmentInventory(slotsInGroup || []);
    const equipmentTypes = Object.keys(equipmentInventory);


    // maxQuantity: actual inventory count for selected equipment (case-insensitive)
    const selectedEqKey = Object.keys(equipmentInventory).find(
        k => k.toLowerCase() === selectedEquipment.toLowerCase()
    ) || '';
    const maxQuantity = selectedEqKey ? (equipmentInventory[selectedEqKey] || 0) : 0;

    // Primary slot for booking: first slot that contains the selected equipment
    const slotsForSelectedEquipment = (slotsInGroup || []).filter(s => {
        const equipmentData = (s as any).equipment;
        if (!equipmentData || typeof equipmentData !== 'object') return false;

        if (Array.isArray(equipmentData)) {
            return equipmentData.some(k => typeof k === 'string' && k.trim().toLowerCase() === selectedEquipment.toLowerCase());
        }

        return Object.keys(equipmentData).some(
            k => k.trim().toLowerCase() === selectedEquipment.toLowerCase()
                && ((equipmentData[k] ?? 0) > 0)
        );
    });
    const primarySlot = slotsForSelectedEquipment[0];

    // Helper to calculate price
    const calculateTotal = () => {
        if (!selectedSlotTime || !selectedInstructor || !selectedEquipment) return null;

        // Valid Check
        if (maxQuantity === 0) return null;

        // Studio Rate: Use the specific equipment rate, fallback to hourly_rate
        const sKey = Object.keys(studioPricing || {}).find(k => k.toLowerCase() === selectedEquipment.toLowerCase());
        const sRate = sKey ? (studioPricing?.[sKey] || 0) : (studioHourlyRate || 0);

        // Instructor Rate: Always use the REFORMER rate as their base fee
        const instructor = instructors.find(i => i.id === selectedInstructor);
        const iKey = Object.keys(instructor?.rates || {}).find(k => k.toUpperCase() === 'REFORMER');
        const iRate = iKey ? (instructor?.rates?.[iKey] || 0) : 0;

        // Session Fee: combined instructor & studio base
        const sessionFee = sRate + iRate;

        // Platform Service Fee: 20% of session fee or ₱100 minimum, per slot
        // WAIVE IF STOREFRONT
        const rawServiceFee = Math.max(100, sessionFee * 0.20);
        const serviceFee = isStorefront ? 0 : rawServiceFee;

        return {
            studioRate: sRate,
            instructorRate: iRate,
            sessionFee,
            serviceFee,
            rawServiceFee, // Include raw for UI strike-through
            total: (sessionFee + serviceFee) * quantity,
        };
    }

    const totalPrice = calculateTotal();

    const handleBook = async () => {
        if (!selectedSlotTime || !selectedInstructor || !selectedEquipment) return

        // Primary slot for booking is already defined in the component body
        if (!primarySlot) return;

        setIsSubmitting(true)

        try {
            const start = window.localStorage.getItem('booking_start');
            const end = window.localStorage.getItem('booking_end');

            const result = await requestBooking(
                primarySlot.id,
                selectedInstructor,
                quantity, // Pass quantity
                selectedEquipment,
                start || undefined,
                end || undefined,
                'studio',
                undefined,
                undefined,
                undefined,
                isStorefront,
                paymentMethod,
                selectedPlanId || undefined
            );

            if (result.success && result.bookingId) {
                if (paymentMethod === 'manual') {
                    setSuccessMessage('Booking requested! Please follow the manual payment instructions and notify the studio owner.')
                } else if (paymentMethod === 'credit') {
                    setSuccessMessage('Booking confirmed using your package credits!')
                } else {
                    setSuccessMessage('Booking requested! Redirecting to payment...')
                    // Prioritize checkoutUrl if provided (for immediately opening Xendit)
                    if (result.checkoutUrl) {
                        window.location.href = result.checkoutUrl;
                    } else {
                        router.push(`/customer/payment/${result.bookingId}`)
                    }
                }
            } else {
                alert(result.error || 'Failed to book.')
            }
        } catch (error) {
            console.error(error)
            alert('Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleJoinWaitlist = async () => {
        if (!selectedSlotTime || !selectedEquipment) return

        const primarySlot = slotsForSelectedEquipment[0];
        if (!primarySlot) {
            // If No slots for this equipment, we can't waitlist
            alert('No slots available for this equipment.')
            return
        }

        setIsSubmitting(true)
        setWaitlistPosition(null)

        try {
            const result = await joinWaitlist(
                primarySlot.id,
                selectedEquipment,
                quantity
            )

            if (result.success) {
                setSuccessMessage(`You have been added to the waitlist!`)
                setWaitlistPosition(result.position || null)
            } else {
                alert(result.error || 'Failed to join waitlist.')
            }
        } catch (error) {
            console.error(error)
            alert('Something went wrong')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (slots.length === 0) {
        return (
            <div className="text-center py-12 text-charcoal-500 bg-cream-50 rounded-xl">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No available slots at the moment.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {successMessage && (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5" />
                    {successMessage}
                </div>
            )}

            {/* Monthly Calendar View */}
            <div className="bg-white border border-cream-200 rounded-2xl p-4 sm:p-6 shadow-sm max-w-md mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-cream-50 rounded-full transition-colors text-charcoal-500 hover:text-charcoal-900 disabled:opacity-30"
                        disabled={isPast(subMonths(currentMonth, 0)) && !isSameMonth(currentMonth, new Date())}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-serif text-lg text-charcoal-900">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h3>
                    <button onClick={nextMonth} className="p-2 hover:bg-cream-50 rounded-full transition-colors text-charcoal-500 hover:text-charcoal-900">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                        <div key={d} className="text-center text-[10px] sm:text-xs font-semibold text-charcoal-400 uppercase tracking-wider py-1">
                            {d}
                        </div>
                    ))}
                </div>

                <div>{calendarRows}</div>
            </div>

            {/* Selected Date Header Display (Optional context for slots below) */}
            {selectedDate && (
                <div className="text-center mb-4 pb-2 border-b border-cream-200 max-w-2xl mx-auto">
                    <h3 className="text-xl font-serif text-charcoal-900">
                        {format(new Date(selectedDate), 'EEEE, MMMM do')}
                    </h3>
                    <p className="text-sm text-charcoal-500 mt-1">Select a time slot below to continue</p>
                </div>
            )}

            {/* Time Slots for Selected Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedKeys.map(key => {
                    const group = groupedSlots[key];
                    const firstSlot = group[0];
                    const isSelected = selectedSlotTime === key;
                    const count = group.length;

                    const startTimeDisp = formatTo12Hour(firstSlot.start_time);
                    const endTimeDisp = formatTo12Hour(firstSlot.end_time);

                    // Get equipment overview for card
                    const eqOverview = new Set(group.flatMap(s => {
                        const equipmentData = (s as any).equipment;
                        if (equipmentData && typeof equipmentData === 'object' && !Array.isArray(equipmentData)) {
                            const keys = Object.keys(equipmentData);
                            return keys.length > 0 ? keys : ['Unknown'];
                        }
                        const fallback = Array.isArray(equipmentData) ? equipmentData[0] : ((s as any).equipment_type || 'Unknown');
                        return fallback ? [fallback] : ['Unknown'];
                    }));

                    // Sum quantities for "Spaces left"
                    const totalSpaceLeft = group.reduce((sum, s) => sum + (s.quantity || 1), 0);

                    // Calculate inventory for this specific group
                    const groupInventory = getEquipmentInventory(group);
                    const inventoryEntries = Object.entries(groupInventory);

                    return (
                        <button
                            key={key}
                            onClick={() => {
                                setSelectedSlotTime(key);
                                setQuantity(1);

                                // Default to first equipment type found in this new group
                                const inventory = getEquipmentInventory(group || []);
                                const firstEq = Object.keys(inventory)[0] || '';
                                setSelectedEquipment(firstEq);

                                // Safety check for date values
                                try {
                                    window.localStorage.setItem('booking_start', selectedDate + 'T' + firstSlot.start_time);
                                    window.localStorage.setItem('booking_end', selectedDate + 'T' + firstSlot.end_time);
                                } catch (e) {
                                    console.error("Invalid date for storage:", e);
                                }
                            }}
                            className={clsx(
                                "p-5 rounded-2xl border text-left transition-all relative overflow-hidden",
                                isSelected
                                    ? "bg-[var(--primary-brand,theme(colors.forest))] border-[var(--primary-brand,theme(colors.forest))] text-white shadow-md transform scale-[1.02]"
                                    : "bg-white border-border-grey hover:shadow-md text-[var(--primary-brand,theme(colors.burgundy))] hover:border-[var(--primary-brand,theme(colors.forest))]/40"
                            )}
                        >
                            <div className="font-serif text-xl mb-2">
                                {startTimeDisp}
                                <span className="text-sm opacity-50 mx-2">to</span>
                                {endTimeDisp}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {inventoryEntries.length > 0 ? (
                                    inventoryEntries.map(([eq, qty]) => (
                                        <span key={eq} className={clsx(
                                            "text-xs px-2.5 py-1 rounded-lg inline-block font-medium border",
                                            isSelected
                                                ? "bg-white/20 text-white border-white/30"
                                                : "bg-off-white text-[var(--primary-brand,theme(colors.burgundy))] border-border-grey"
                                        )}>
                                            {qty} {eq}{qty !== 1 ? 's' : ''} available
                                        </span>
                                    ))
                                ) : (
                                    <span className={clsx(
                                        "text-xs px-2.5 py-1 rounded-lg inline-block font-medium",
                                        isSelected ? "bg-white/20 text-white" : "bg-cream-100 text-charcoal-600"
                                    )}>
                                        {totalSpaceLeft} {totalSpaceLeft !== 1 ? 'Spaces' : 'Space'} left
                                    </span>
                                )}
                            </div>
                            
                            {!firstSlot.is_available && (
                                <div className={clsx(
                                    "absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                    isSelected ? "bg-white text-forest" : "bg-charcoal-900 text-white"
                                )}>
                                    Full
                                </div>
                            )}
                        </button>
                    );
                })}

                {selectedDate && sortedKeys.length === 0 && (
                    <div className="col-span-full py-12 text-center text-charcoal-400 italic">
                        No slots available for this day.
                    </div>
                )}
            </div>

            {selectedSlotTime && (() => {
                const slotsInGroup = groupedSlots[selectedSlotTime] || [];
                // Check if the current selected slot corresponds to a pending booking
                const activePendingBooking = pendingBookings.find(pb => {
                    return pb.booked_slot_ids?.some((id: string) => slotsInGroup.map(s => s.id).includes(id))
                });

                if (activePendingBooking) {
                    return (
                        <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 animate-in fade-in slide-in-from-top-2 text-center">
                            <h3 className="font-serif text-lg text-orange-900 mb-2">Resume Your Reservation</h3>
                            <p className="text-orange-700 text-sm mb-6 max-w-md mx-auto">
                                You already have a pending reservation for this time slot. Please complete your payment to finalize the booking.
                            </p>
                            <button
                                onClick={() => router.push(`/customer/payment/${activePendingBooking.id}`)}
                                className="bg-orange-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors inline-block mx-auto"
                            >
                                Continue to Payment
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="bg-cream-50 p-6 rounded-xl border border-cream-200 animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-serif text-lg text-charcoal-900 mb-4">Complete your Request</h3>

                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex-1 max-w-md space-y-4">
                                {/* Equipment Selector */}
                                {equipmentTypes.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                            Select Equipment
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {equipmentTypes.map(eq => (
                                                <button
                                                    key={eq}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedEquipment(eq);
                                                        setQuantity(1); // Reset qty on equipment change
                                                    }}
                                                    className={clsx(
                                                        "p-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-between text-left",
                                                        selectedEquipment.toLowerCase() === eq.toLowerCase()
                                                            ? "bg-[var(--primary-brand,theme(colors.forest))] border-[var(--primary-brand,theme(colors.forest))] text-white"
                                                            : "bg-white border-border-grey text-[var(--primary-brand,theme(colors.burgundy))] hover:border-[var(--primary-brand,theme(colors.forest))]/50"
                                                    )}
                                                >
                                                    <div>
                                                        <div className="uppercase tracking-wider text-xs mb-0.5">{eq}</div>
                                                        <div className={clsx("text-[10px]", selectedEquipment.toLowerCase() === eq.toLowerCase() ? "text-cream-200" : "text-charcoal-400")}>
                                                            {equipmentInventory[eq]} available
                                                        </div>
                                                    </div>
                                                    {selectedEquipment.toLowerCase() === eq.toLowerCase() && (
                                                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Quantity Selector */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-sm font-medium text-charcoal-700">Quantity</label>
                                        <span className="text-xs text-charcoal-500">Max: {maxQuantity}</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        max={maxQuantity}
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) {
                                                if (val > maxQuantity) setQuantity(maxQuantity);
                                                else if (val < 1) setQuantity(1);
                                                else setQuantity(val);
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-white border border-cream-300 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                        Select Your Instructor
                                    </label>
                                    {availableInstructors.length > 0 ? (
                                        <select
                                            value={selectedInstructor}
                                            onChange={(e) => setSelectedInstructor(e.target.value)}
                                            className="w-full px-4 py-2 bg-white border border-cream-300 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                                        >
                                            <option value="">-- Choose an Instructor --</option>
                                            {availableInstructors.map(inst => (
                                                <option key={inst.id} value={inst.id}>
                                                    {inst.full_name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <span>No instructors available for this equipment at this time.</span>
                                        </div>
                                    )}
                                    <p className="text-xs text-charcoal-500 mt-1">
                                        {availableInstructors.length > 0 && "Don't see your instructor? Tell them to verify their profile on StudioVaultPH!"}
                                    </p>
                                </div>

                                {/* Price Display */}
                                {totalPrice !== null && (
                                    <div className="bg-white p-4 rounded-lg border border-cream-200 space-y-4 text-sm">
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-charcoal-600">
                                                <span>Session Fee (1x)</span>
                                                <span>₱{totalPrice.sessionFee.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-charcoal-500 text-xs pl-2">
                                                <span>↳ Instructor Base <span className="text-charcoal-400">({selectedEquipment})</span></span>
                                                <span>₱{totalPrice.instructorRate.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-charcoal-500 text-xs pl-2">
                                                <span>↳ Studio Fee <span className="text-charcoal-400">({selectedEquipment})</span></span>
                                                <span>₱{totalPrice.studioRate.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex justify-between text-charcoal-600">
                                            <span>
                                                Platform Service Fee 
                                                {isStorefront && <span className="ml-2 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider">Waived</span>}
                                            </span>
                                            <span className={isStorefront ? "line-through text-charcoal-400" : ""}>
                                                ₱{isStorefront ? totalPrice.rawServiceFee?.toLocaleString() : totalPrice.serviceFee.toLocaleString()}
                                            </span>
                                        </div>

                                        {quantity > 1 && (
                                            <div className="flex justify-between text-charcoal-500 text-xs">
                                                <span>Quantity:</span>
                                                <span>× {quantity} {selectedEquipment}s</span>
                                            </div>
                                        )}

                                        <div className="border-t border-cream-200 pt-3 flex justify-between items-center">
                                            <p className="font-bold text-charcoal-900">Grand Total</p>
                                            <span className="text-xl font-serif text-charcoal-900">₱{totalPrice.total.toLocaleString()}</span>
                                        </div>

                                        {waitlistPosition && (
                                            <div className="p-3 bg-forest/10 border border-forest/20 rounded-xl text-center">
                                                <p className="text-xs font-bold text-forest uppercase tracking-widest">
                                                    Current Position: #{waitlistPosition}
                                                </p>
                                            </div>
                                        )}

                                        {/* Legal Agreement */}
                                        <div className="py-4 border-t border-cream-100">
                                            <LegalAgreementCheckbox 
                                                checked={agreedToLegal}
                                                onChange={setAgreedToLegal}
                                                legalConfig={legalConfig || undefined}
                                            />
                                        </div>

                                        {!slotsForSelectedEquipment[0]?.is_available ? (
                                            <button
                                                onClick={handleJoinWaitlist}
                                                disabled={isSubmitting || !agreedToLegal}
                                                className="w-full py-4 bg-charcoal-900 text-white rounded-xl font-bold uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transform active:scale-95 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                                                Join Waitlist
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleBook}
                                                disabled={isSubmitting || !selectedInstructor || !agreedToLegal}
                                                className="w-full py-4 bg-charcoal-900 text-white rounded-xl font-bold uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transform active:scale-95 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-3"
                                            >
                                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                                                Confirm Booking
                                            </button>
                                        )}

                                        {/* Payment Method Selection (Storefront Only) */}
                                        {isStorefront && (enableManualPayments || enableXendit) && (
                                            <div className="space-y-4 pt-4 border-t border-cream-100">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate/40 block">Payment Method</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {/* Package Credits Option */}
                                                    {userPlans.map(plan => {
                                                        const planServiceIds = plan.plan_type === 'package' 
                                                            ? plan.packages?.applicable_service_ids 
                                                            : plan.memberships?.applicable_service_ids;
                                                        
                                                        const planOutletIds = plan.plan_type === 'package'
                                                            ? plan.packages?.applicable_outlet_ids
                                                            : plan.memberships?.applicable_outlet_ids;

                                                        const slotServiceId = primarySlot?.service_id;
                                                        
                                                        // Service validation
                                                        const isServiceValid = !planServiceIds || planServiceIds.length === 0 || (slotServiceId && planServiceIds.includes(slotServiceId));
                                                        
                                                        // Location validation (Transparency check)
                                                        const isLocationValid = !outletId || !planOutletIds || planOutletIds.length === 0 || planOutletIds.includes(outletId);

                                                        const isPlanSelectable = isServiceValid && isLocationValid;

                                                        return (
                                                            <button
                                                                key={plan.id}
                                                                onClick={() => {
                                                                    setPaymentMethod('credit')
                                                                    setSelectedPlanId(plan.id)
                                                                }}
                                                                disabled={!isPlanSelectable}
                                                                type="button"
                                                                className={clsx(
                                                                    "p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between",
                                                                    (paymentMethod === 'credit' && selectedPlanId === plan.id) ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-cream-100 text-charcoal hover:border-indigo-500/30",
                                                                    !isPlanSelectable && "opacity-60 grayscale cursor-not-allowed"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <Ticket className={clsx("w-4 h-4", (paymentMethod === 'credit' && selectedPlanId === plan.id) ? "text-white" : "text-indigo-500")} />
                                                                    <div className="text-left">
                                                                        <div className="uppercase tracking-widest text-[9px]">Pay with {plan.plan_type}</div>
                                                                        <div className={clsx("font-black flex items-center gap-2", (paymentMethod === 'credit' && selectedPlanId === plan.id) ? "text-indigo-100" : "text-zinc-600")}>
                                                                            {plan.plan_type === 'package' ? plan.packages?.name : plan.memberships?.name}
                                                                            <span className="ml-2 opacity-60">({plan.remaining_credits ?? '∞'} left)</span>
                                                                            
                                                                            {!isLocationValid && (
                                                                                <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1 shadow-sm">
                                                                                    <AlertCircle className="w-2.5 h-2.5" />
                                                                                    Not valid here
                                                                                </span>
                                                                            )}
                                                                            {isLocationValid && !isServiceValid && (
                                                                                <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1 shadow-sm">
                                                                                    <AlertCircle className="w-2.5 h-2.5" />
                                                                                    Service Mismatch
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {(paymentMethod === 'credit' && selectedPlanId === plan.id) && <CheckCircle className="w-4 h-4" />}
                                                            </button>
                                                        )
                                                    })}


                                                    {enableXendit && (
                                                        <button
                                                            onClick={() => setPaymentMethod('xendit')}
                                                            type="button"
                                                            className={clsx(
                                                                "p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between",
                                                                paymentMethod === 'xendit' ? "bg-forest border-forest text-white" : "bg-white border-cream-100 text-charcoal hover:border-forest/30"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Sparkles className={clsx("w-4 h-4", paymentMethod === 'xendit' ? "text-white" : "text-emerald-500")} />
                                                                <span>Automatic Checkout</span>
                                                            </div>
                                                            {paymentMethod === 'xendit' && <CheckCircle className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    {enableManualPayments && (
                                                        <button
                                                            onClick={() => setPaymentMethod('manual')}
                                                            type="button"
                                                            className={clsx(
                                                                "p-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-between",
                                                                paymentMethod === 'manual' ? "bg-forest border-forest text-white" : "bg-white border-cream-100 text-charcoal hover:border-forest/30"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Smartphone className={clsx("w-4 h-4", paymentMethod === 'manual' ? "text-white" : "text-blue-500")} />
                                                                <span>Manual Payout</span>
                                                            </div>
                                                            {paymentMethod === 'manual' && <CheckCircle className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>

                                                {paymentMethod === 'manual' && (
                                                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500 mt-2">
                                                        {(manualPaymentMethods && manualPaymentMethods.length > 0) ? (
                                                            <div className="space-y-3">
                                                                {manualPaymentMethods.map((method: any) => (
                                                                    <div key={method.id} className="p-5 bg-white border border-cream-200 rounded-2xl shadow-tight space-y-4">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-forest bg-forest/5 px-2 py-1 rounded border border-forest/10">
                                                                                {method.type}
                                                                            </span>
                                                                        </div>
                                                                        
                                                                        <div className="flex gap-6">
                                                                            {method.qr_code_url && (
                                                                                <div className="shrink-0 w-24 h-24 relative bg-cream-50 rounded-xl border border-cream-100 overflow-hidden group/qr cursor-zoom-in">
                                                                                    <Image 
                                                                                        src={getSupabaseAssetUrl(method.qr_code_url, 'studios') || '/default-qr.svg'} 
                                                                                        alt="QR Code" 
                                                                                        fill 
                                                                                        className="object-contain p-1"
                                                                                        unoptimized
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                            <div className="flex-1 space-y-3">
                                                                                <div className="space-y-1">
                                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-charcoal-400">Account Number</p>
                                                                                    <p className="text-sm font-bold text-charcoal-900 font-mono">{method.account_number}</p>
                                                                                </div>
                                                                                <div className="space-y-1">
                                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-charcoal-400">Recipient Name</p>
                                                                                    <p className="text-xs font-bold text-charcoal-700">{method.recipient_name}</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                                <div className="p-4 bg-cream-50 rounded-xl border border-cream-100">
                                                                    <p className="text-[10px] text-charcoal-500 italic leading-relaxed">
                                                                        Please send the payment using any of the methods above and notify the studio owner to confirm your booking.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            manualPaymentInstructions && (
                                                                <div className="p-4 bg-cream-50 border border-cream-100 rounded-xl space-y-2">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate/40">Instructions</p>
                                                                    <p className="text-xs text-charcoal whitespace-pre-wrap leading-relaxed">{manualPaymentInstructions}</p>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleBook}
                                    disabled={!selectedInstructor || isSubmitting || !selectedEquipment}
                                    className="w-full bg-[var(--primary-brand,theme(colors.forest))] text-white py-3 rounded-lg font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Request Booking (' + quantity + ')'
                                    )}
                                </button>
                            </div>

                            {/* Instructor Profile Card */}
                            <div className="w-full md:w-72 shrink-0">
                                {selectedInstructor && (() => {
                                    const instructor = availableInstructors.find(i => i.id === selectedInstructor);
                                    if (!instructor) return null;

                                    return (
                                        <InstructorProfileCard 
                                            instructor={instructor} 
                                            isSticky={true} 
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    )
}
