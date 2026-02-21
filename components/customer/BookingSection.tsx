'use client'

import { useState, useEffect } from 'react'
import { requestBooking } from '@/app/(dashboard)/customer/actions'
import { Loader2, CheckCircle, Calendar } from 'lucide-react'
import clsx from 'clsx'
import { useRouter } from 'next/navigation'

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

export default function BookingSection({
    studioId,
    slots,
    instructors,
    studioPricing,
    studioHourlyRate
}: {
    studioId: string
    slots: Slot[]
    instructors: Instructor[]
    studioPricing?: Record<string, number>
    studioHourlyRate: number
}) {
    const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null) // Key: start-end
    const [selectedInstructor, setSelectedInstructor] = useState<string>('')
    const [selectedEquipment, setSelectedEquipment] = useState<string>('') // New state
    const [quantity, setQuantity] = useState<number>(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    // 1. Group by Date
    const slotsByDate = slots.reduce((acc, slot) => {
        const date = slot.start_time.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(slot);
        return acc;
    }, {} as Record<string, Slot[]>);

    const availableDates = Object.keys(slotsByDate).sort();

    // 2. State for active date
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Auto-select first date on mount
    useEffect(() => {
        if (availableDates.length > 0 && !selectedDate) {
            setSelectedDate(availableDates[0]);
        }
    }, [availableDates, selectedDate]);

    // 3. Group slots for the SELECTED date by time range
    const slotsForDate = selectedDate ? slotsByDate[selectedDate] : [];

    const groupedSlots = slotsForDate.reduce((acc, slot) => {
        const key = `${slot.start_time}-${slot.end_time}`;
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
            const eq = s.equipment?.[0] || 'Unknown';
            equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
        });
    }
    const equipmentTypes = Object.keys(equipmentCounts);

    // Filter slots by selected equipment to get the right primary ID and count
    const slotsForSelectedEquipment = slotsInGroup?.filter(s => (s.equipment?.[0] || 'Unknown') === selectedEquipment) || [];
    const maxQuantity = slotsForSelectedEquipment.length;

    // Helper to calculate price
    const calculateTotal = () => {
        if (!selectedSlotTime || !selectedInstructor || !selectedEquipment) return null;

        // Valid Check
        if (maxQuantity === 0) return null;

        // Studio Rate
        const sRate = studioPricing?.[selectedEquipment] || studioHourlyRate;

        // Instructor Rate
        const instructor = instructors.find(i => i.id === selectedInstructor);
        const iRate = instructor?.rates?.[selectedEquipment] || 0;

        // Service Fee
        const fee = 100;

        return (sRate + iRate + fee) * quantity;
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

            {/* Date Picker Tabs */}
            <div className="flex overflow-x-auto pb-4 gap-3 -mx-4 px-4 no-scrollbar snap-x snap-mandatory">
                {availableDates.map(date => {
                    const d = new Date(date);
                    const isDateSelected = selectedDate === date;
                    return (
                        <button
                            key={date}
                            onClick={() => {
                                setSelectedDate(date);
                                setSelectedSlotTime(null); // Reset time selection
                            }}
                            className={clsx(
                                "flex flex-col items-center min-w-[72px] py-3 rounded-2xl border transition-all snap-start",
                                isDateSelected
                                    ? "bg-charcoal-900 border-charcoal-900 text-cream-50 shadow-md"
                                    : "bg-white border-cream-200 text-charcoal-700 hover:border-charcoal-400"
                            )}
                        >
                            <span className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-0.5">
                                {d.toLocaleDateString(undefined, { weekday: 'short' })}
                            </span>
                            <span className="text-xl font-serif leading-tight">
                                {d.getDate()}
                            </span>
                            <span className="text-[10px] uppercase font-medium">
                                {d.toLocaleDateString(undefined, { month: 'short' })}
                            </span>
                        </button>
                    )
                })}
            </div>

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
                    const eqOverview = new Set(group.map(s => s.equipment?.[0] || 'Unknown'));

                    return (
                        <button
                            key={key}
                            onClick={() => {
                                setSelectedSlotTime(key);
                                setQuantity(1);

                                // Default to first equipment type found in this new group
                                const newGroup = groupedSlots[key];
                                const firstEq = newGroup[0]?.equipment?.[0] || 'Unknown';
                                setSelectedEquipment(firstEq);

                                window.localStorage.setItem('booking_start', start.toISOString());
                                window.localStorage.setItem('booking_end', end.toISOString());
                            }}
                            className={clsx(
                                "p-5 rounded-2xl border text-left transition-all relative overflow-hidden",
                                isSelected
                                    ? "bg-charcoal-900 border-charcoal-900 text-cream-50 shadow-md transform scale-[1.02]"
                                    : "bg-white border-cream-200 hover:border-charcoal-300 text-charcoal-900"
                            )}
                        >
                            <div className="font-serif text-xl mb-2">
                                {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                <span className="text-sm opacity-50 mx-2">to</span>
                                {end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
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
                                        isSelected ? "border-white/30 text-white/80" : "border-cream-200 text-charcoal-400"
                                    )}>
                                        {eq}
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

                        {/* Equipment Selector */}
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
                            <select
                                value={selectedInstructor}
                                onChange={(e) => setSelectedInstructor(e.target.value)}
                                className="w-full px-4 py-2 bg-white border border-cream-300 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                            >
                                <option value="">-- Choose an Instructor --</option>
                                {instructors.map(inst => (
                                    <option key={inst.id} value={inst.id}>
                                        {inst.full_name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-charcoal-500 mt-1">
                                Don't see your instructor? Tell them to verify their profile on StudioVaultPH!
                            </p>
                        </div>

                        {/* Price Display */}
                        {totalPrice !== null && (
                            <div className="bg-white p-4 rounded-lg border border-cream-200 flex justify-between items-center">
                                <div>
                                    <p className="text-charcoal-600 font-medium">Grand Total</p>
                                    {quantity > 1 && (
                                        <p className="text-xs text-charcoal-400">
                                            For {quantity} {selectedEquipment}{quantity > 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                                <span className="text-xl font-serif text-charcoal-900">₱{totalPrice.toLocaleString()}</span>
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
