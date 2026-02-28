'use client'

import React, { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findMatchingStudios } from '@/app/(dashboard)/instructors/actions'
import { requestBooking } from '@/app/(dashboard)/customer/actions'
import { getManilaTodayStr, toManilaDate } from '@/lib/timezone'
import { Loader2, MapPin, CheckCircle, ArrowRight, Minus, Plus, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import clsx from 'clsx'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function InstructorBookingWizard({
    instructorId,
    availability,
    activeBookings = [],
    instructorRates = {}
}: {
    instructorId: string
    availability: any[]
    activeBookings?: any[]
    instructorRates?: Record<string, number>
}) {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [selectedDate, setSelectedDate] = useState<string>('') // YYYY-MM-DD
    const [selectedSlot, setSelectedSlot] = useState<any>(null) // Availability Object
    const [matchingStudios, setMatchingStudios] = useState<any[]>([])
    const [selectedStudioSlot, setSelectedStudioSlot] = useState<string | null>(null) // Real Studio Slot ID
    const [selectedEquipment, setSelectedEquipment] = useState<string>('')
    const [quantity, setQuantity] = useState(1)
    const [maxQuantity, setMaxQuantity] = useState(1)
    const [isSearching, setIsSearching] = useState(false)
    const [isBooking, setIsBooking] = useState(false)
    const [success, setSuccess] = useState(false)
    const [bookingId, setBookingId] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const filterLocation = searchParams.get('location')

    // Helper: Generate next 14 days based on Manila Time
    const nextDays = Array.from({ length: 14 }).map((_, i) => {
        const todayAtNoon = new Date();
        todayAtNoon.setHours(12, 0, 0, 0); // Noon to avoid boundary issues
        const d = toManilaDate(todayAtNoon);
        d.setUTCDate(d.getUTCDate() + i);

        const year = d.getUTCFullYear();
        const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = d.getUTCDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        return {
            date: dateStr,
            dayIndex: d.getUTCDay(),
            label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        }
    })

    // Pre-process active bookings into a set of 'YYYY-MM-DD-HH:MM' strings in Manila time
    const bookedSlotsSet = new Set(
        activeBookings.flatMap(b => {
            const slotsData = Array.isArray(b.slots) ? b.slots[0] : b.slots;
            if (!slotsData?.start_time) return [];

            const startDate = new Date(slotsData.start_time);
            // Apply Manila offset manually to guarantee correctness independent of runtime ICU/locale
            const manilaDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000);

            const year = manilaDate.getUTCFullYear();
            const month = (manilaDate.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = manilaDate.getUTCDate().toString().padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const hours = manilaDate.getUTCHours().toString().padStart(2, '0');
            const minutes = manilaDate.getUTCMinutes().toString().padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;

            return [`${dateStr}-${timeStr}`];
        })
    );

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' })
        }
    }

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' })
        }
    }

    const handleSearchCheck = async (slot: any, dateStr: string) => {
        setSelectedSlot(slot)
        setSelectedDate(dateStr)
        setIsSearching(true)
        setSelectedStudioSlot(null)
        setSelectedEquipment('')
        setQuantity(1)
        setStep(2)

        try {
            const { studios } = await findMatchingStudios(dateStr, slot.start_time, slot.end_time, slot.location_area)
            setMatchingStudios(studios || [])
        } catch (error) {
            console.error(error)
        } finally {
            setIsSearching(false)
        }
    }

    const handleSelectStudioTime = (studioId: string, startTime: string) => {
        const studio = matchingStudios.find(s => s.studio.id === studioId)
        if (!studio) return

        const slotsAtTime = studio.matchingSlots.filter((s: any) => s.start_time === startTime)
        if (slotsAtTime.length === 0) return

        // Pick first slot as primary
        const primarySlot = slotsAtTime[0]
        setSelectedStudioSlot(primarySlot.id)

        // Aggregate unique equipment at this time
        const allEq = Array.from(new Set(slotsAtTime.flatMap((s: any) => s.equipment || []))) as string[]
        const firstEq = allEq[0] || 'Reformer'
        setSelectedEquipment(firstEq)

        // Max quantity for this specific equipment at this time
        const slotsWithEq = slotsAtTime.filter((s: any) => (s.equipment as string[] | undefined)?.includes(firstEq))
        setMaxQuantity(Math.max(1, slotsWithEq.length))
        setQuantity(1)
    }

    const handleEquipmentChange = (eq: string) => {
        setSelectedEquipment(eq)
        if (!selectedStudioSlot) return

        const studio = matchingStudios.find(s => s.matchingSlots.some((ms: any) => ms.id === selectedStudioSlot))
        if (!studio) return

        const primarySlot = studio.matchingSlots.find((s: any) => s.id === selectedStudioSlot)
        const slotsAtTime = studio.matchingSlots.filter((s: any) => s.start_time === primarySlot?.start_time)

        // Update selectedStudioSlot to one that actually has this equipment if possible
        const bestSlot = slotsAtTime.find((s: any) => (s.equipment as string[] | undefined)?.includes(eq))
        if (bestSlot) {
            setSelectedStudioSlot(bestSlot.id)
        }

        const slotsWithEq = slotsAtTime.filter((s: any) => (s.equipment as string[] | undefined)?.includes(eq))
        setMaxQuantity(Math.max(1, slotsWithEq.length))
        setQuantity(1)
    }

    const handleBooking = async () => {
        if (!selectedStudioSlot || !selectedSlot) return
        setIsBooking(true)

        try {
            const result = await requestBooking(
                selectedStudioSlot,
                instructorId,
                quantity,
                selectedEquipment,
                selectedDate + 'T' + selectedSlot.start_time,
                selectedDate + 'T' + selectedSlot.end_time
            )
            if (result.success && result.bookingId) {
                setSuccess(true)
                setBookingId(result.bookingId)
                setStep(3)
                setTimeout(() => {
                    router.push(`/customer/payment/${result.bookingId}`)
                }, 2000)
            } else {
                alert(result.error || 'Booking failed')
            }
        } catch (error) {
            console.error(error)
            alert('Something went wrong')
        } finally {
            setIsBooking(false)
        }
    }

    if (success) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                    <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif text-charcoal-900 mb-2">Booking Requested!</h3>
                <p className="text-charcoal-600 mb-4">Redirecting to payment...</p>
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-charcoal-400" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Step 1: Select Date & Time */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-charcoal-900 text-lg font-serif">1. Select a Date & Time</h3>
                        <div className="text-xs text-charcoal-500 font-medium uppercase tracking-widest">
                            Available next 14 days
                        </div>
                    </div>

                    <div className="relative group">
                        <button
                            onClick={scrollLeft}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 bg-white border border-cream-200 shadow-md rounded-full flex items-center justify-center text-charcoal-500 hover:text-charcoal-900 transition-all opacity-0 group-hover:opacity-100 -ml-4 md:-ml-5"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div
                            ref={scrollContainerRef}
                            className="flex overflow-x-auto pb-4 gap-3 px-1 no-scrollbar snap-x snap-mandatory scroll-smooth"
                        >
                            {nextDays.map((d) => {
                                const todayManilaStr = getManilaTodayStr();
                                const isTodayPill = d.date === todayManilaStr;
                                const nowManilaPill = toManilaDate(new Date()).getUTCHours().toString().padStart(2, '0') + ':' +
                                    toManilaDate(new Date()).getUTCMinutes().toString().padStart(2, '0');

                                const hasSlots = availability.some(a => {
                                    const dateMatch = a.date ? a.date === d.date : a.day_of_week === d.dayIndex;
                                    const locationMatch = filterLocation ? a.location_area === filterLocation : true;
                                    const notExpired = isTodayPill ? a.end_time.slice(0, 5) > nowManilaPill : true;
                                    const notBooked = !bookedSlotsSet.has(`${d.date}-${a.start_time.slice(0, 5)}`);
                                    return dateMatch && locationMatch && notExpired && notBooked;
                                });

                                if (!hasSlots) return null;

                                const isSelected = selectedDate === d.date;

                                return (
                                    <button
                                        key={d.date}
                                        onClick={() => setSelectedDate(d.date)}
                                        className={clsx(
                                            "flex flex-col items-center min-w-[72px] py-3 rounded-2xl border transition-all snap-start flex-shrink-0",
                                            isSelected
                                                ? "bg-charcoal-900 border-charcoal-900 text-cream-50 shadow-md"
                                                : "bg-white border-cream-200 text-charcoal-700 hover:border-charcoal-400"
                                        )}
                                    >
                                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-0.5">{isTodayPill ? 'Today' : d.label.split(' ')[0]}</span>
                                        <span className="text-xl font-serif leading-tight">{d.label.split(' ').pop()}</span>
                                        <span className="text-[10px] uppercase font-medium">{d.label.split(' ')[1]}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={scrollRight}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 bg-white border border-cream-200 shadow-md rounded-full flex items-center justify-center text-charcoal-500 hover:text-charcoal-900 transition-all opacity-0 group-hover:opacity-100 -mr-4 md:-mr-5"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-cream-50 rounded-2xl p-6 border border-cream-200">
                        {(() => {
                            const activeDate = selectedDate || nextDays.find(d => availability.some(a => a.date === d.date || (!a.date && a.day_of_week === d.dayIndex)))?.date;
                            if (!activeDate) return <p className="text-charcoal-500 text-center italic">No availability found.</p>;

                            const d = nextDays.find(nd => nd.date === activeDate);
                            const nowInstance = toManilaDate(new Date());
                            const nowManilaTime = nowInstance.getUTCHours().toString().padStart(2, '0') + ':' + nowInstance.getUTCMinutes().toString().padStart(2, '0');
                            const isToday = activeDate === getManilaTodayStr();

                            const slots = availability.filter(a => {
                                const dateMatch = a.date ? a.date === activeDate : a.day_of_week === d?.dayIndex;
                                const locationMatch = filterLocation ? a.location_area === filterLocation : true;
                                const notExpired = isToday ? a.end_time.slice(0, 5) > nowManilaTime : true;
                                const notBooked = !bookedSlotsSet.has(`${activeDate}-${a.start_time.slice(0, 5)}`);
                                return dateMatch && locationMatch && notExpired && notBooked;
                            });

                            if (slots.length === 0) {
                                return (
                                    <div className="text-center py-6">
                                        <Info className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
                                        <p className="text-charcoal-500 italic">No sessions available on this day.</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-charcoal-400 uppercase tracking-widest mb-4">Available Times</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {slots.map(slot => (
                                            <button
                                                key={slot.id}
                                                onClick={() => handleSearchCheck(slot, activeDate)}
                                                className="w-full text-left bg-white p-4 rounded-xl border border-cream-200 hover:border-charcoal-900 hover:shadow-md transition-all flex justify-between items-center group"
                                            >
                                                <div>
                                                    <div className="font-serif text-lg text-charcoal-900">
                                                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                    </div>
                                                    <div className="text-xs text-charcoal-500 flex items-center gap-1.5 mt-1 font-medium">
                                                        <MapPin className="w-3.5 h-3.5 text-charcoal-300" />
                                                        {slot.location_area}
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-charcoal-200 group-hover:text-charcoal-900 transform group-hover:translate-x-1 transition-all" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Step 2: Select Studio + Equipment + Quantity */}
            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-charcoal-900">2. Select a Studio & Options</h3>
                        <button onClick={() => setStep(1)} className="text-sm text-charcoal-500 hover:text-charcoal-900">
                            ← Change Time
                        </button>
                    </div>

                    <div className="bg-charcoal-900 text-cream-50 p-4 rounded-xl text-sm">
                        Searching studios in <strong>{selectedSlot?.location_area}</strong> on <strong>{selectedDate}</strong> at <strong>{selectedSlot?.start_time.slice(0, 5)}</strong>
                    </div>

                    {isSearching ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400" />
                            <p className="text-sm text-charcoal-500 mt-2">Checking studio availability...</p>
                        </div>
                    ) : matchingStudios.length === 0 ? (
                        <div className="text-center py-12 bg-cream-50 rounded-xl">
                            <p className="text-charcoal-600 mb-2">No matching studios found.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {matchingStudios.map(result => (
                                <div key={result.studio.id} className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-serif text-xl text-charcoal-900">{result.studio.name}</h4>
                                            <p className="text-sm text-charcoal-500">{result.studio.location}</p>
                                        </div>
                                    </div>

                                    <p className="text-xs font-bold text-charcoal-400 uppercase tracking-widest">Available Time Slots</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            const uniqueTimes = Array.from(new Set(result.matchingSlots.map((s: any) => s.start_time))).sort();
                                            return (uniqueTimes as string[]).map(startTime => {
                                                const isSelected = result.matchingSlots.some((s: any) => s.id === selectedStudioSlot && s.start_time === startTime);
                                                return (
                                                    <button
                                                        key={startTime}
                                                        onClick={() => handleSelectStudioTime(result.studio.id, startTime)}
                                                        className={clsx(
                                                            "px-4 py-2 rounded-xl text-sm border font-medium transition-all",
                                                            isSelected
                                                                ? "bg-charcoal-900 text-cream-50 border-charcoal-900 shadow-sm"
                                                                : "bg-cream-50 text-charcoal-700 border-cream-200 hover:border-charcoal-400"
                                                        )}
                                                    >
                                                        {new Date(startTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>

                                    {/* Booking Details — only for selected studio */}
                                    {selectedStudioSlot && result.matchingSlots.some((s: any) => s.id === selectedStudioSlot) && (() => {
                                        const slotsAtTime = result.matchingSlots.filter((s: any) =>
                                            s.start_time === result.matchingSlots.find((ms: any) => ms.id === selectedStudioSlot)?.start_time
                                        );
                                        const allEq = Array.from(new Set(slotsAtTime.flatMap((s: any) => s.equipment || [])));

                                        return (
                                            <div className="border-t border-cream-100 pt-4 space-y-5 animate-in fade-in slide-in-from-top-2">
                                                {/* Equipment & Quantity */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-charcoal-400 uppercase tracking-widest block mb-1.5">Equipment</label>
                                                        <select
                                                            value={selectedEquipment}
                                                            onChange={(e) => handleEquipmentChange(e.target.value)}
                                                            className="w-full px-3 py-2.5 bg-cream-50 border border-cream-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-charcoal-900/10"
                                                        >
                                                            {allEq.map(eq => {
                                                                const count = slotsAtTime.filter((s: any) => (s.equipment as string[] | undefined)?.includes(eq as string)).length;
                                                                return <option key={eq as string} value={eq as string}>{eq as string} ({count} available)</option>;
                                                            })}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-charcoal-400 uppercase tracking-widest block mb-1.5">People</label>
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                                                className="w-10 h-10 rounded-xl border border-cream-200 flex items-center justify-center hover:bg-cream-100 text-charcoal-700 transition-colors"
                                                            >
                                                                <Minus className="w-4 h-4" />
                                                            </button>
                                                            <span className="w-8 text-center text-lg font-serif">{quantity}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
                                                                className="w-10 h-10 rounded-xl border border-cream-200 flex items-center justify-center hover:bg-cream-100 text-charcoal-700 transition-colors"
                                                            >
                                                                <Plus className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pricing */}
                                                {(() => {
                                                    const studioRate = result.studio.pricing?.[selectedEquipment] || 0;
                                                    const instructorRate = instructorRates[selectedEquipment] || 0;
                                                    const subtotal = (studioRate + instructorRate) * quantity;
                                                    const serviceFee = Math.max(100, subtotal * 0.2);
                                                    const total = subtotal + serviceFee;

                                                    return (
                                                        <div className="bg-cream-50 p-4 rounded-2xl border border-cream-100 space-y-2">
                                                            <div className="flex justify-between text-xs text-charcoal-500">
                                                                <span>Session ({quantity}x)</span>
                                                                <span>₱{subtotal.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-charcoal-500">
                                                                <span>Service Fee (20%)</span>
                                                                <span>₱{serviceFee.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between text-base font-bold text-charcoal-900 pt-2 border-t border-cream-200/50">
                                                                <span>Total</span>
                                                                <span className="font-serif text-lg">₱{total.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                <button
                                                    onClick={handleBooking}
                                                    disabled={isBooking}
                                                    className="w-full bg-charcoal-900 text-cream-50 py-3.5 rounded-xl font-bold hover:bg-charcoal-800 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {isBooking && <Loader2 className="w-4 h-4 animate-spin" />}
                                                    Request Booking
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
