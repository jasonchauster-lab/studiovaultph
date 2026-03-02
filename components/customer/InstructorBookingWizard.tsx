'use client'

import React, { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findMatchingStudios } from '@/app/(dashboard)/instructors/actions'
import { requestBooking } from '@/app/(dashboard)/customer/actions'
import { getManilaTodayStr, toManilaDate, formatTo12Hour } from '@/lib/timezone'
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

    // Helper: Case-insensitive map to link DB keys to UI labels
    const EQUIPMENT_MAP: Record<string, string> = {
        'reformer': 'REFORMER',
        'chair': 'CHAIR',
        'mat': 'MAT',
        'reformer_chair': 'REFORMER + CHAIR',
        'cadillac': 'CADILLAC',
        'tower': 'TOWER'
    };

    // Helper: Case-insensitive lookup for equipment count in JSONB
    const getEquipmentCount = (equipmentData: any, type: string) => {
        if (!equipmentData || typeof equipmentData !== 'object' || Array.isArray(equipmentData)) return 0;

        // Find matching key case-insensitively
        const actualKey = Object.keys(equipmentData).find(k => {
            const tk = k.trim().toLowerCase();
            const tt = type.trim().toLowerCase();
            return tk === tt || (EQUIPMENT_MAP[tk] || tk).toLowerCase() === tt;
        });

        // If not found by equipment name, check if keys are time-based (safety for specific DB anomalies)
        if (!actualKey) {
            const timeKey = Object.keys(equipmentData).find(k => {
                const tk = k.trim();
                const tt = type.trim();
                // Match if both are times, even with different seconds or AM/PM (using slice(0,5))
                return tk.includes(':') && tt.includes(':') && tk.slice(0, 5) === tt.slice(0, 5);
            });
            if (timeKey) return equipmentData[timeKey] ?? 0;
        }

        return actualKey ? (equipmentData[actualKey] ?? 0) : 0;
    };

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

    // Pre-process active bookings into a set of 'YYYY-MM-DD|HH:MM' strings in Manila time
    const bookedSlotsSet = new Set(
        activeBookings.flatMap(b => {
            const slotsData = Array.isArray(b.slots) ? b.slots[0] : b.slots;
            if (!slotsData?.start_time || !slotsData?.date) return [];

            const dateStr = slotsData.date;
            const timeStr = slotsData.start_time.length === 5 ? slotsData.start_time + ':00' : slotsData.start_time;

            return [`${dateStr}|${timeStr}`];
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

        // Aggregate unique equipment at this time — always use Object.keys() for JSONB
        const equipmentData = primarySlot.equipment
        const allEq: string[] = (equipmentData && typeof equipmentData === 'object' && !Array.isArray(equipmentData))
            ? Object.keys(equipmentData).filter(k => (equipmentData[k] ?? 0) > 0)
            : []

        // Case-insensitive equipment selection
        const firstEq = allEq[0] || ''
        setSelectedEquipment(firstEq)
        setMaxQuantity(Math.max(1, getEquipmentCount(equipmentData, firstEq)))
        setQuantity(1)
    }

    const handleEquipmentChange = (eq: string) => {
        setSelectedEquipment(eq)
        if (!selectedStudioSlot) return

        const studio = matchingStudios.find(s => s.matchingSlots.some((ms: any) => ms.id === selectedStudioSlot))
        if (!studio) return

        const primarySlot = studio.matchingSlots.find((s: any) => s.id === selectedStudioSlot)
        setMaxQuantity(Math.max(1, getEquipmentCount(primarySlot?.equipment, eq)))
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

                                // Relaxed expiration: allow slots that ended up to 30 minutes ago
                                const nowInstance = toManilaDate(new Date());
                                const nowMinus30Shift = new Date(nowInstance.getTime() - 30 * 60 * 1000);
                                const nowManilaPill = nowMinus30Shift.getUTCHours().toString().padStart(2, '0') + ':' +
                                    nowMinus30Shift.getUTCMinutes().toString().padStart(2, '0');

                                const hasSlots = availability.some(a => {
                                    const dateMatch = a.date ? a.date === d.date : a.day_of_week === d.dayIndex;
                                    const aLoc = a.location_area?.trim().toLowerCase();
                                    const fLoc = filterLocation?.trim().toLowerCase();
                                    const locationMatch = fLoc ? (aLoc === fLoc || aLoc.startsWith(fLoc + ' - ')) : true;
                                    const notExpired = isTodayPill ? a.end_time.slice(0, 5) > nowManilaPill : true;
                                    const notBooked = !bookedSlotsSet.has(`${d.date}|${a.start_time.length === 5 ? a.start_time + ':00' : a.start_time}`);
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
                                                : "bg-white border-charcoal-400 text-charcoal-700 hover:border-charcoal-600"
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
                            // Relaxed expiration for display
                            const nowMinus30Shift = new Date(nowInstance.getTime() - 30 * 60 * 1000);
                            const nowManilaTime = nowMinus30Shift.getUTCHours().toString().padStart(2, '0') + ':' + nowMinus30Shift.getUTCMinutes().toString().padStart(2, '0');
                            const isToday = activeDate === getManilaTodayStr();

                            const slots = availability.filter(a => {
                                const dateMatch = a.date ? a.date === activeDate : a.day_of_week === d?.dayIndex;
                                const aLoc = a.location_area?.trim().toLowerCase();
                                const fLoc = filterLocation?.trim().toLowerCase();
                                const locationMatch = fLoc ? (aLoc === fLoc || aLoc.startsWith(fLoc + ' - ')) : true;
                                const notExpired = isToday ? a.end_time.slice(0, 5) > nowManilaTime : true;
                                const notBooked = !bookedSlotsSet.has(`${activeDate}|${a.start_time.length === 5 ? a.start_time + ':00' : a.start_time}`);
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
                                                        {formatTo12Hour(slot.start_time)} - {formatTo12Hour(slot.end_time)}
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
                        Searching studios in <strong>{selectedSlot?.location_area}</strong> on <strong>{selectedDate}</strong> at <strong>{formatTo12Hour(selectedSlot?.start_time)}</strong>
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
                                                        {formatTo12Hour(startTime)}
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
                                        // Robust JSONB extraction: handle objects by keys[0], fallback to equipment_type
                                        const equipmentData = slotsAtTime[0]?.equipment;
                                        const allEq: string[] = (equipmentData && typeof equipmentData === 'object' && !Array.isArray(equipmentData))
                                            ? Object.keys(equipmentData)
                                            : (Array.isArray(equipmentData) ? equipmentData : []);

                                        if (allEq.length === 0 && (slotsAtTime[0] as any).equipment_type) {
                                            allEq.push((slotsAtTime[0] as any).equipment_type);
                                        }

                                        return (
                                            <div className="border-t border-cream-100 pt-4 space-y-5 animate-in fade-in slide-in-from-top-2">
                                                {/* Equipment & Quantity */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                    <div className="sm:col-span-2">
                                                        <label className="text-xs font-bold text-charcoal-400 uppercase tracking-widest block mb-3">Select Equipment</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {allEq.length === 0 ? (
                                                                <div className="bg-cream-100 text-charcoal-500 px-4 py-2.5 rounded-xl text-sm border border-cream-200 italic">
                                                                    No specific equipment listed for this slot.
                                                                </div>
                                                            ) : allEq.length === 1 ? (
                                                                <div className="bg-cream-50 text-charcoal-800 px-5 py-3 rounded-2xl border border-cream-200 flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-xs text-charcoal-400 uppercase tracking-widest font-bold block leading-none mb-1">Auto-Selected</span>
                                                                        <span className="text-sm font-medium text-charcoal-900">{allEq[0]}</span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                allEq.map((eq: string) => {
                                                                    const slotWithEq = slotsAtTime.find((s: any) => {
                                                                        if (Array.isArray(s.equipment)) return s.equipment.includes(eq)
                                                                        if (typeof s.equipment === 'object' && s.equipment !== null) return !!(s.equipment as Record<string, any>)[eq]
                                                                        return false
                                                                    });
                                                                    const count = getEquipmentCount(slotsAtTime[0]?.equipment, eq);
                                                                    const isSelected = selectedEquipment === eq;
                                                                    return (
                                                                        <button
                                                                            key={eq as string}
                                                                            type="button"
                                                                            onClick={() => handleEquipmentChange(eq as string)}
                                                                            className={clsx(
                                                                                "px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2",
                                                                                isSelected
                                                                                    ? "bg-charcoal-900 border-charcoal-900 text-cream-50 shadow-md ring-2 ring-charcoal-900/10"
                                                                                    : "bg-white border-cream-200 text-charcoal-700 hover:border-charcoal-400"
                                                                            )}
                                                                        >
                                                                            <span>{eq as string}</span>
                                                                            <span className={clsx(
                                                                                "text-[10px] px-1.5 py-0.5 rounded-full",
                                                                                isSelected ? "bg-charcoal-800 text-cream-200" : "bg-cream-100 text-charcoal-500"
                                                                            )}>
                                                                                {count} {count === 1 ? 'slot' : 'slots'}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-bold text-charcoal-400 uppercase tracking-widest block mb-3">Number of People</label>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                                                    className="w-11 h-11 rounded-xl border border-cream-200 flex items-center justify-center hover:bg-cream-50 text-charcoal-700 transition-all active:scale-95"
                                                                >
                                                                    <Minus className="w-5 h-5" />
                                                                </button>
                                                                <div className="w-12 text-center">
                                                                    <span className="text-xl font-serif text-charcoal-900">{quantity}</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
                                                                    className="w-11 h-11 rounded-xl border border-cream-200 flex items-center justify-center hover:bg-cream-50 text-charcoal-700 transition-all active:scale-95"
                                                                >
                                                                    <Plus className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-tighter">Available</span>
                                                                <span className="text-sm font-serif text-charcoal-900">{maxQuantity} max</span>
                                                            </div>
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
                                                        <div className="bg-cream-50 p-5 rounded-2xl border border-cream-100 space-y-2.5">
                                                            <div className="flex justify-between text-xs text-charcoal-500">
                                                                <span>Session Fee ({quantity}x)</span>
                                                                <span>₱{subtotal.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-charcoal-500">
                                                                <span>Service Fee (20%)</span>
                                                                <span>₱{serviceFee.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between text-base font-bold text-charcoal-900 pt-2.5 border-t border-cream-200/50">
                                                                <span>Total</span>
                                                                <span className="font-serif text-xl">₱{total.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                <button
                                                    onClick={handleBooking}
                                                    disabled={isBooking}
                                                    className="w-full bg-charcoal-900 text-cream-50 py-4 rounded-xl font-bold hover:bg-charcoal-800 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {isBooking && <Loader2 className="w-5 h-5 animate-spin" />}
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
