'use client'

import { useState, useEffect } from 'react'
import { requestBooking } from '@/app/(dashboard)/customer/actions'
import { Loader2, CheckCircle, Calendar, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isBefore, startOfDay, addDays } from 'date-fns'

interface Slot {
    id: string;
    start_time: string;
    end_time: string;
    equipment?: string[];
}

interface Instructor {
    id: string;
    full_name: string;
    rates?: Record<string, number>;
}

interface AvailabilityBlock {
    instructor_id: string;
    day_of_week: number;
    date: string | null;
    start_time: string;
    end_time: string;
}

export default function BookingSection({
    studioId,
    slots,
    instructors,
    availabilityBlocks,
    studioPricing
}: {
    studioId: string
    slots: Slot[]
    instructors: Instructor[]
    availabilityBlocks: AvailabilityBlock[]
    studioPricing?: Record<string, number>
}) {
    const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null) // Key: start-end
    const [selectedInstructor, setSelectedInstructor] = useState<string>('')
    const [selectedEquipment, setSelectedEquipment] = useState<string>('') // New state
    const [quantity, setQuantity] = useState<number>(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // Determine available instructors for the selected time
    const availableInstructors = instructors.filter(inst => {
        if (!selectedSlotTime || !selectedDate) return true;
        const [startFullStr] = selectedSlotTime.split('|');
        const start = new Date(startFullStr);
        const dayOfWeek = start.getDay();
        const dateStr = format(start, 'yyyy-MM-dd');
        const timeStr = format(start, 'HH:mm');

        return availabilityBlocks.some(block =>
            block.instructor_id === inst.id &&
            (block.date === dateStr || (block.date === null && block.day_of_week === dayOfWeek)) &&
            block.start_time <= timeStr &&
            block.end_time > timeStr
        );
    });

    // 1. Group by Date
    const slotsByDate = slots.reduce((acc, slot) => {
        const date = slot.start_time.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(slot);
        return acc;
    }, {} as Record<string, Slot[]>);

    const availableDates = Object.keys(slotsByDate).sort();

    // 2. State for active date & month
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

    // Auto-select first date on mount, and sync month to it
    useEffect(() => {
        if (availableDates.length > 0 && !selectedDate) {
            setSelectedDate(availableDates[0]);
            setCurrentMonth(new Date(availableDates[0]));
        }
    }, [availableDates, selectedDate]);

    // Calendar logic
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

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
                        hasSlots && !isSelected ? "bg-cream-100 text-charcoal-900 font-medium hover:bg-cream-200 cursor-pointer border border-cream-200" : "",
                        isSelected ? "bg-charcoal-900 text-cream-50 font-bold shadow-md transform scale-105" : ""
                    )}
                    disabled={!hasSlots || isPast}
                >
                    <span className="leading-none">{formattedDate}</span>
                    {hasSlots && !isSelected && <span className="w-1 h-1 bg-charcoal-500 rounded-full mt-1"></span>}
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
        const dateA = new Date(groupedSlots[a][0].start_time);
        const dateB = new Date(groupedSlots[b][0].start_time);
        return dateA.getTime() - dateB.getTime();
    });

    // ... (rest of logic remains similar but uses groupedSlots)

    // Determine available equipment for the selected time
    const slotsInGroup = selectedSlotTime ? groupedSlots[selectedSlotTime] : [];
    const equipmentCounts: Record<string, number> = {};
    if (slotsInGroup) {
        slotsInGroup.forEach(s => {
            const equipmentData = (s as any).equipment;
            const keys = (equipmentData && typeof equipmentData === 'object' && !Array.isArray(equipmentData))
                ? Object.keys(equipmentData)
                : (Array.isArray(equipmentData) ? equipmentData : []);

            const eq = keys[0] || (s as any).equipment_type || 'Unknown';
            equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
        });
    }
    const equipmentTypes = Object.keys(equipmentCounts).filter(e => e !== 'Unknown');

    // Filter slots by selected equipment to get the right primary ID and count
    const slotsForSelectedEquipment = slotsInGroup?.filter(s => {
        const equipmentData = (s as any).equipment;
        const keys = (equipmentData && typeof equipmentData === 'object' && !Array.isArray(equipmentData))
            ? Object.keys(equipmentData)
            : (Array.isArray(equipmentData) ? equipmentData : []);

        const eq = keys[0] || (s as any).equipment_type || 'Unknown';
        return eq === selectedEquipment;
    }) || [];
    const maxQuantity = slotsForSelectedEquipment.length;

    // Helper to calculate price
    const calculateTotal = () => {
        if (!selectedSlotTime || !selectedInstructor || !selectedEquipment) return null;

        // Valid Check
        if (maxQuantity === 0) return null;

        // Studio Rate
        const sRate = studioPricing?.[selectedEquipment] || 0;

        // Instructor Rate
        const instructor = instructors.find(i => i.id === selectedInstructor);
        const iRate = instructor?.rates?.[selectedEquipment] || 0;

        // Platform Service Fee: 20% of (studio + instructor) or ₱100 minimum, per slot
        const subtotalPerSlot = sRate + iRate;
        const serviceFee = Math.max(100, subtotalPerSlot * 0.20);

        return {
            studioRate: sRate,
            instructorRate: iRate,
            serviceFee,
            total: (subtotalPerSlot + serviceFee) * quantity,
        };
    }

    const totalPrice = calculateTotal();
    const router = useRouter()

    const handleBook = async () => {
        if (!selectedSlotTime || !selectedInstructor || !selectedEquipment) return

        // We use the first slot ID FROM THE FILTERED LIST as the primary ID
        const primarySlot = slotsForSelectedEquipment[0];
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
                end || undefined
            );

            if (result.success && result.bookingId) {
                setSuccessMessage('Booking requested! Redirecting to payment...')
                router.push(`/customer/payment/${result.bookingId}`)
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
                    <button onClick={prevMonth} className="p-2 hover:bg-cream-50 rounded-full transition-colors text-charcoal-500 hover:text-charcoal-900">
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
                    const start = new Date(firstSlot.start_time);
                    const end = new Date(firstSlot.end_time);
                    const isSelected = selectedSlotTime === key;
                    const count = group.length;

                    // Get equipment overview for card
                    const eqOverview = new Set(group.map(s => {
                        const equipmentData = (s as any).equipment;
                        if (equipmentData && typeof equipmentData === 'object' && !Array.isArray(equipmentData)) {
                            return Object.keys(equipmentData)[0] || 'Unknown';
                        }
                        return Array.isArray(equipmentData) ? equipmentData[0] : ((s as any).equipment_type || 'Unknown');
                    }));

                    return (
                        <button
                            key={key}
                            onClick={() => {
                                setSelectedSlotTime(key);
                                setQuantity(1);

                                // Default to first equipment type found in this new group
                                const newGroup = groupedSlots[key];
                                const firstEq = newGroup[0]?.equipment?.[0] || (newGroup[0] as any).equipment_type || 'Unknown';
                                setSelectedEquipment(firstEq);

                                // Safety check for date values before toISOString()
                                try {
                                    window.localStorage.setItem('booking_start', start.toISOString());
                                    window.localStorage.setItem('booking_end', end.toISOString());
                                } catch (e) {
                                    console.error("Invalid date for storage:", e);
                                }
                            }}
                            className={clsx(
                                "p-5 rounded-2xl border text-left transition-all relative overflow-hidden",
                                isSelected
                                    ? "bg-charcoal-900 border-charcoal-900 text-cream-50 shadow-md transform scale-[1.02]"
                                    : "bg-white border-cream-200 hover:border-charcoal-300 text-charcoal-900"
                            )}
                        >
                            <div className="font-serif text-xl mb-2">
                                {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                <span className="text-sm opacity-50 mx-2">to</span>
                                {end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <span className={clsx(
                                    "text-xs px-2.5 py-1 rounded-lg inline-block font-medium",
                                    isSelected ? "bg-white/20 text-white" : "bg-cream-100 text-charcoal-600"
                                )}>
                                    {count} {count !== 1 ? 'Spaces' : 'Space'} left
                                </span>
                                {Array.from(eqOverview).map(eq => (
                                    <span key={eq} className={clsx(
                                        "text-[10px] uppercase tracking-widest px-2 py-1 rounded-lg inline-block border font-bold",
                                        isSelected ? "border-white/30 text-white/80" : "border-cream-200 text-charcoal-500"
                                    )}>
                                        {eq !== 'Unknown' ? eq : 'Equipment'}
                                    </span>
                                ))}
                            </div>
                        </button>
                    );
                })}

                {selectedDate && sortedKeys.length === 0 && (
                    <div className="col-span-full py-12 text-center text-charcoal-400 italic">
                        No slots available for this day.
                    </div>
                )}
            </div>

            {selectedSlotTime && (
                <div className="bg-cream-50 p-6 rounded-xl border border-cream-200 animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-serif text-lg text-charcoal-900 mb-4">Complete your Request</h3>

                    <div className="max-w-md space-y-4">

                        {/* Equipment Selector - Hide if only one option to save space/clicks */}
                        {equipmentTypes.length > 1 ? (
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                    Select Equipment
                                </label>
                                <select
                                    value={selectedEquipment}
                                    onChange={(e) => {
                                        setSelectedEquipment(e.target.value);
                                        setQuantity(1); // Reset qty on equipment change
                                    }}
                                    className="w-full px-4 py-2 bg-white border border-cream-300 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                                >
                                    {equipmentTypes.map(eq => (
                                        <option key={eq} value={eq}>
                                            {eq} ({equipmentCounts[eq]} available)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : null}

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
                            <div className="bg-white p-4 rounded-lg border border-cream-200 space-y-2 text-sm">
                                <div className="flex justify-between text-charcoal-600">
                                    <span>Studio Rate ({selectedEquipment})</span>
                                    <span>₱{totalPrice.studioRate.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-charcoal-600">
                                    <span>Instructor Rate ({selectedEquipment})</span>
                                    <span>₱{totalPrice.instructorRate.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-charcoal-500 text-xs">
                                    <span>Platform Service Fee <span className="italic">(20% min. ₱100)</span></span>
                                    <span>₱{totalPrice.serviceFee.toLocaleString()}</span>
                                </div>
                                {quantity > 1 && (
                                    <div className="flex justify-between text-charcoal-400 text-xs">
                                        <span>× {quantity} {selectedEquipment}s</span>
                                    </div>
                                )}
                                <div className="border-t border-cream-200 pt-2 flex justify-between items-center">
                                    <p className="font-bold text-charcoal-900">Grand Total</p>
                                    <span className="text-xl font-serif text-charcoal-900">₱{totalPrice.total.toLocaleString()}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleBook}
                            disabled={!selectedInstructor || isSubmitting || !selectedEquipment}
                            className="w-full bg-charcoal-900 text-cream-50 py-3 rounded-lg font-medium hover:bg-charcoal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Request Booking (${quantity})`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
