'use client'

import React, { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findMatchingStudios } from '@/app/(dashboard)/instructors/actions'
import { requestBooking } from '@/app/(dashboard)/customer/actions'
import { Loader2, MapPin, CheckCircle, ArrowRight, Minus, Plus, ChevronLeft, ChevronRight, Info } from 'lucide-react'
import clsx from 'clsx'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function InstructorBookingWizard({
    instructorId,
    availability
}: {
    instructorId: string
    availability: any[]
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

    // Helper: Generate next 14 days
    const nextDays = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return {
            date: d.toISOString().split('T')[0],
            dayIndex: d.getDay(),
            label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        }
    })

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

    // When a studio slot is selected, pre-populate equipment options
    const handleSelectStudioSlot = (slotId: string, equipmentList: string[]) => {
        setSelectedStudioSlot(slotId)
        // Default to first available equipment
        const firstEq = equipmentList?.[0] || ''
        setSelectedEquipment(firstEq)
        // Calculate max quantity: count all slots with this equipment in the matching studio
        const allMatchingSlots = matchingStudios.flatMap(s => s.matchingSlots)
        const sameTimeSlots = allMatchingSlots.filter(
            s => s.start_time === allMatchingSlots.find((ms: any) => ms.id === slotId)?.start_time &&
                (s.equipment as string[] | undefined)?.includes(firstEq)
        )
        setMaxQuantity(Math.max(1, sameTimeSlots.length))
        setQuantity(1)
    }

    const handleEquipmentChange = (eq: string) => {
        setSelectedEquipment(eq)
        // Recalculate max quantity for this equipment
        if (!selectedStudioSlot) return
        const allMatchingSlots = matchingStudios.flatMap(s => s.matchingSlots)
        const primarySlot = allMatchingSlots.find((s: any) => s.id === selectedStudioSlot)
        const sameTimeSlots = allMatchingSlots.filter(
            (s: any) => s.start_time === primarySlot?.start_time && (s.equipment as string[] | undefined)?.includes(eq)
        )
        setMaxQuantity(Math.max(1, sameTimeSlots.length))
        setQuantity(1)
    }

    const handleConfirmBooking = async () => {
        if (!selectedStudioSlot) return
        setIsBooking(true)

        try {
            const result = await requestBooking(selectedStudioSlot, instructorId, quantity, undefined, undefined)
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
                        {/* Left Scroll Button */}
                        <button
                            onClick={scrollLeft}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 bg-white border border-cream-200 shadow-md rounded-full flex items-center justify-center text-charcoal-500 hover:text-charcoal-900 transition-all opacity-0 group-hover:opacity-100 -ml-4 md:-ml-5"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Horizontal Date Picker */}
                        <div
                            ref={scrollContainerRef}
                            className="flex overflow-x-auto pb-4 gap-3 px-1 no-scrollbar snap-x snap-mandatory scroll-smooth"
                        >
                            {nextDays.map((d) => {
                                const todayManilaForPill = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
                                const isTodayPill = d.date === todayManilaForPill;
                                const nowManilaPill = new Date().toLocaleTimeString('en-US', {
                                    hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila'
                                });

                                const hasSlots = availability.some(a => {
                                    const dateMatch = a.date ? a.date === d.date : a.day_of_week === d.dayIndex;
                                    const locationMatch = filterLocation ? a.location_area === filterLocation : true;
                                    const notExpired = isTodayPill ? a.end_time.slice(0, 5) > nowManilaPill : true;
                                    return dateMatch && locationMatch && notExpired;
                                });

                                if (!hasSlots) return null;

                                const isSelected = selectedDate === d.date || (!selectedDate && nextDays.find(nd => availability.some(a => a.date === nd.date || (!a.date && a.day_of_week === nd.dayIndex)))?.date === d.date);

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
                                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-0.5">{d.date === new Date().toISOString().split('T')[0] ? 'Today' : d.label.split(' ')[0]}</span>
                                        <span className="text-xl font-serif leading-tight">{d.label.split(' ').pop()}</span>
                                        <span className="text-[10px] uppercase font-medium">{d.label.split(' ')[1]}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Scroll Button */}
                        <button
                            onClick={scrollRight}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 bg-white border border-cream-200 shadow-md rounded-full flex items-center justify-center text-charcoal-500 hover:text-charcoal-900 transition-all opacity-0 group-hover:opacity-100 -mr-4 md:-mr-5"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Slots for Selected Date */}
                    <div className="bg-cream-50 rounded-2xl p-6 border border-cream-200">
                        {(() => {
                            const activeDate = selectedDate || nextDays.find(nd => availability.some(a => a.date === nd.date || (!a.date && a.day_of_week === nd.dayIndex)))?.date;
                            if (!activeDate) return <p className="text-charcoal-500 text-center italic">No availability found.</p>;

                            const d = nextDays.find(nd => nd.date === activeDate);
                            const nowManilaTime = new Date().toLocaleTimeString('en-US', {
                                hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila'
                            }); // e.g. "10:40"
                            const todayManila = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD
                            const isToday = activeDate === todayManila;

                            const slots = availability.filter(a => {
                                const dateMatch = a.date ? a.date === activeDate : a.day_of_week === d?.dayIndex;
                                const locationMatch = filterLocation ? a.location_area === filterLocation : true;
                                // Hide slots that have already ended when browsing today's date
                                const notExpired = isToday ? a.end_time.slice(0, 5) > nowManilaTime : true;
                                return dateMatch && locationMatch && notExpired;
                            });

                            if (slots.length === 0) {
                                return (
                                    <div className="text-center py-6">
                                        <Info className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
                                        <p className="text-charcoal-500 italic">No sessions available {filterLocation ? `in ${filterLocation}` : ''} on this day.</p>
                                        {filterLocation && (
                                            <button
                                                onClick={() => router.push(window.location.pathname)}
                                                className="mt-2 text-xs text-charcoal-900 font-medium hover:underline"
                                            >
                                                Clear filters to see all availability
                                            </button>
                                        )}
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

                    {availability.length === 0 && (
                        <p className="text-charcoal-500 text-center italic py-12">This instructor has not added availability yet.</p>
                    )}
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
                        Searching studios in <strong>{selectedSlot?.location_area}</strong> on <strong>{selectedDate}</strong> between <strong>{selectedSlot?.start_time.slice(0, 5)}</strong> and <strong>{selectedSlot?.end_time.slice(0, 5)}</strong>
                    </div>

                    {isSearching ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-charcoal-400" />
                            <p className="text-sm text-charcoal-500 mt-2">Checking studio availability...</p>
                        </div>
                    ) : matchingStudios.length === 0 ? (
                        <div className="text-center py-12 bg-cream-50 rounded-xl">
                            <p className="text-charcoal-600 mb-2">No matching studios found.</p>
                            <p className="text-xs text-charcoal-500">Try a different time or date.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Studio Selection */}
                            {matchingStudios.map(result => (
                                <div key={result.studio.id} className="bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-serif text-lg text-charcoal-900">{result.studio.name}</h4>
                                            <p className="text-sm text-charcoal-500">{result.studio.location}</p>
                                        </div>
                                        <div className="text-right flex flex-wrap justify-end gap-1 max-w-[160px]">
                                            {result.studio.pricing && Object.entries(result.studio.pricing).filter(([, v]: any) => typeof v === 'number' && v > 0).length > 0
                                                ? Object.entries(result.studio.pricing)
                                                    .filter(([, v]: any) => typeof v === 'number' && v > 0)
                                                    .map(([eq, price]: any) => (
                                                        <span key={eq} className="inline-flex items-center gap-1 text-[11px] font-medium bg-cream-100 text-charcoal-700 border border-cream-200 px-2 py-0.5 rounded-full">
                                                            {eq}: <strong>₱{price.toLocaleString()}</strong>
                                                        </span>
                                                    ))
                                                : <span className="text-xs text-charcoal-400 italic">Price on Request</span>
                                            }
                                        </div>
                                    </div>

                                    <p className="text-xs font-medium text-charcoal-400 mb-2 uppercase tracking-wider">Available Time Slots</p>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {result.matchingSlots.map((slot: any) => (
                                            <button
                                                key={slot.id}
                                                onClick={() => handleSelectStudioSlot(slot.id, slot.equipment || [])}
                                                className={clsx(
                                                    "px-3 py-2 rounded-lg text-sm border transition-all",
                                                    selectedStudioSlot === slot.id
                                                        ? "bg-charcoal-900 text-cream-50 border-charcoal-900"
                                                        : "bg-cream-50 text-charcoal-700 border-cream-200 hover:border-charcoal-300"
                                                )}
                                            >
                                                {new Date(slot.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Equipment & Quantity — shown after slot selected */}
                                    {selectedStudioSlot && result.matchingSlots.some((s: any) => s.id === selectedStudioSlot) && (() => {
                                        const slot = result.matchingSlots.find((s: any) => s.id === selectedStudioSlot)
                                        const equipmentList: string[] = slot?.equipment || []
                                        return (
                                            <div className="border-t border-cream-100 pt-4 space-y-4">
                                                {/* Equipment Selector */}
                                                {equipmentList.length > 0 && (
                                                    <div>
                                                        <label className="text-sm font-medium text-charcoal-700 block mb-2">
                                                            Equipment Type
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {equipmentList.map(eq => (
                                                                <button
                                                                    key={eq}
                                                                    type="button"
                                                                    onClick={() => handleEquipmentChange(eq)}
                                                                    className={clsx(
                                                                        "px-3 py-1.5 rounded-lg text-sm border font-medium transition-all",
                                                                        selectedEquipment === eq
                                                                            ? "bg-charcoal-900 text-cream-50 border-charcoal-900"
                                                                            : "bg-cream-50 text-charcoal-600 border-cream-200 hover:border-charcoal-400"
                                                                    )}
                                                                >
                                                                    {eq}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Quantity Selector */}
                                                <div>
                                                    <label className="text-sm font-medium text-charcoal-700 block mb-2">
                                                        Number of People
                                                        <span className="text-xs font-normal text-charcoal-400 ml-2">(max {maxQuantity} available)</span>
                                                    </label>
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                                            className="w-8 h-8 rounded-full border border-cream-300 flex items-center justify-center hover:bg-cream-100 transition-colors text-charcoal-700"
                                                        >
                                                            <Minus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="w-8 text-center font-medium text-charcoal-900 text-lg">{quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
                                                            className="w-8 h-8 rounded-full border border-cream-300 flex items-center justify-center hover:bg-cream-100 transition-colors text-charcoal-700"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                        </button>
                                                        <span className="text-xs text-charcoal-500">
                                                            {quantity === 1 ? 'person' : 'people'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Booking Summary */}
                                                <div className="bg-cream-50 rounded-lg p-3 text-sm text-charcoal-600 border border-cream-200">
                                                    <p className="font-medium text-charcoal-900 mb-1">Booking Summary</p>
                                                    <p>{selectedDate} · {selectedSlot?.start_time.slice(0, 5)}–{selectedSlot?.end_time.slice(0, 5)}</p>
                                                    {selectedEquipment && <p>Equipment: <strong>{selectedEquipment}</strong></p>}
                                                    <p>People: <strong>{quantity}</strong></p>
                                                    <p>Studio: <strong>{result.studio.name}</strong></p>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            ))}

                            {/* Confirm Button */}
                            <div className="pt-4 border-t border-cream-200">
                                <button
                                    onClick={handleConfirmBooking}
                                    disabled={!selectedStudioSlot || isBooking}
                                    className="w-full bg-charcoal-900 text-cream-50 py-3 rounded-lg font-medium hover:bg-charcoal-800 disabled:opacity-50 flex justify-center items-center gap-2 transition-colors"
                                >
                                    {isBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking Request'}
                                </button>
                                {!selectedStudioSlot && (
                                    <p className="text-xs text-charcoal-400 text-center mt-2">Select a time slot above to continue</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
