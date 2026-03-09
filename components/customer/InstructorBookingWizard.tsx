'use client'

import React, { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findMatchingStudios } from '@/app/(dashboard)/instructors/actions'
import { requestBooking } from '@/app/(dashboard)/customer/actions'
import { getManilaTodayStr, toManilaDate, formatTo12Hour, normalizeTimeTo24h } from '@/lib/timezone'
import { Loader2, MapPin, CheckCircle, ArrowRight, Minus, Plus, ChevronLeft, ChevronRight, Info, Calendar } from 'lucide-react'
import clsx from 'clsx'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isBefore, startOfDay, addDays, isPast, eachDayOfInterval } from 'date-fns'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export default function InstructorBookingWizard({
    instructorId,
    availability,
    activeBookings = [],
    instructorRates = {},
    pendingBookings = []
}: {
    instructorId: string
    availability: any[]
    activeBookings?: any[]
    instructorRates?: Record<string, number>
    pendingBookings?: any[]
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
        if (!equipmentData || typeof equipmentData !== 'object') return 0;

        if (Array.isArray(equipmentData)) {
            const actualMatched = equipmentData.find(k => {
                if (typeof k !== 'string') return false;
                const tk = k.trim().toLowerCase();
                const tt = type.trim().toLowerCase();
                return tk === tt || (EQUIPMENT_MAP[tk] || tk).toLowerCase() === tt;
            });
            return actualMatched ? 1 : 0;
        }

        // 1. Direct Case-Insensitive Match
        const actualKey = Object.keys(equipmentData).find(k => {
            const tk = k.trim().toLowerCase();
            const tt = type.trim().toLowerCase();
            return tk === tt || (EQUIPMENT_MAP[tk] || tk).toLowerCase() === tt;
        });

        if (actualKey) return equipmentData[actualKey] ?? 0;

        // 2. Time-Based Normalization Match (Safety for specific DB anomalies)
        const typeAsTime = normalizeTimeTo24h(type);
        const timeKey = Object.keys(equipmentData).find(k => {
            if (!k.includes(':')) return false;
            return normalizeTimeTo24h(k) === typeAsTime;
        });

        return timeKey ? (equipmentData[timeKey] ?? 0) : 0;
    };

    // Helper: Generate days for the viewed month
    const viewedMonth = searchParams.get('month') || format(new Date(), 'yyyy-MM')
    const monthStart = startOfMonth(new Date(viewedMonth + '-01'))
    const nextDays = eachDayOfInterval({
        start: monthStart,
        end: endOfMonth(monthStart)
    }).map(d => {
        const year = d.getFullYear()
        const month = (d.getMonth() + 1).toString().padStart(2, '0')
        const day = d.getDate().toString().padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`

        return {
            date: dateStr,
            dayIndex: d.getDay(),
            label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
        }
    })

    const handleMonthChange = (offset: number) => {
        const next = offset > 0 ? addMonths(monthStart, 1) : subMonths(monthStart, 1)
        const params = new URLSearchParams(searchParams)
        params.set('month', format(next, 'yyyy-MM'))
        router.push(`?${params.toString()}`, { scroll: false })
    }

    // Calendar logic (Standardized with BookingSection)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    const today = startOfDay(new Date())

    const calendarRows = []
    let days = []
    let day = startDate

    // Pre-calculate available dates for the calendar dots
    const availableDatesWithSlots = new Set(
        nextDays.filter(d => {
            const todayManilaStr = getManilaTodayStr();
            const isToday = d.date === todayManilaStr;
            const isPastPill = d.date < todayManilaStr;

            const nowInstance = toManilaDate(new Date());
            const nowMinus30Shift = new Date(nowInstance.getTime() - 30 * 60 * 1000);
            const nowManilaPill = nowMinus30Shift.getUTCHours().toString().padStart(2, '0') + ':' +
                nowMinus30Shift.getUTCMinutes().toString().padStart(2, '0');

            return availability.some(a => {
                const dateMatch = a.date ? a.date === d.date : a.day_of_week === d.dayIndex;
                const aLoc = a.location_area?.trim().toLowerCase();
                const fLoc = filterLocation?.trim().toLowerCase();
                const locationMatch = fLoc ? (aLoc === fLoc || aLoc.startsWith(fLoc + ' - ')) : true;
                const notExpired = isPastPill ? false : (isToday ? a.end_time.slice(0, 5) > nowManilaPill : true);
                const notBooked = !bookedSlotsSet.has(`${d.date}|${normalizeTimeTo24h(a.start_time)}`);
                return dateMatch && locationMatch && notExpired && notBooked;
            });
        }).map(d => d.date)
    );

    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            const cloneDay = day
            const dateStr = format(cloneDay, 'yyyy-MM-dd')
            const hasSlots = availableDatesWithSlots.has(dateStr)
            const isSelected = selectedDate === dateStr
            const isPastDay = isBefore(cloneDay, today)
            const formattedDate = format(day, "d")

            days.push(
                <button
                    key={day.toString()}
                    type="button"
                    onClick={() => {
                        if (hasSlots) {
                            setSelectedDate(dateStr)
                        }
                    }}
                    className={clsx(
                        "h-12 flex flex-col items-center justify-center rounded-xl text-sm transition-all focus:outline-none",
                        !isSameMonth(day, monthStart) ? "text-cream-300 pointer-events-none" : "",
                        isSameMonth(day, monthStart) && !hasSlots && !isPastDay && !isSelected ? "text-charcoal-500 opacity-60" : "",
                        isPastDay ? "text-cream-400 pointer-events-none opacity-40" : "",
                        hasSlots && !isSelected ? "bg-white text-[#333333] font-medium hover:bg-cream-50 cursor-pointer border border-[#ebd3cf]" : "",
                        isSelected ? "bg-[#ebd3cf] text-[#333333] font-bold shadow-md transform scale-105 border border-[#ebd3cf]" : ""
                    )}
                    disabled={!hasSlots || isPastDay}
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

    // Pre-process active bookings into a set of 'YYYY-MM-DD|HH:mm:ss' strings in Manila time
    const bookedSlotsSet = new Set(
        activeBookings.flatMap(b => {
            const slotsData = Array.isArray(b.slots) ? b.slots[0] : b.slots;
            if (!slotsData?.start_time || !slotsData?.date) return [];

            const dateStr = slotsData.date;
            const timeStr = normalizeTimeTo24h(slotsData.start_time);

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

        // Normalize to HH:mm:ss for safe comparison against DB values
        const normalizedStartTime = normalizeTimeTo24h(startTime)
        const slotsAtTime = studio.matchingSlots.filter((s: any) =>
            normalizeTimeTo24h(s.start_time) === normalizedStartTime
        )
        if (slotsAtTime.length === 0) return

        const primarySlot = slotsAtTime[0]
        setSelectedStudioSlot(primarySlot.id)

        // Aggregate equipment from ALL slots at this time, summing actual JSONB values
        const aggregatedEquipment: Record<string, number> = {}
        slotsAtTime.forEach((s: any) => {
            const eq = s.equipment
            if (!eq || typeof eq !== 'object') return

            if (Array.isArray(eq)) {
                eq.forEach((item) => {
                    if (typeof item === 'string') {
                        const normalizedKey = item.trim().toUpperCase()
                        aggregatedEquipment[normalizedKey] = (aggregatedEquipment[normalizedKey] || 0) + 1
                    }
                })
                return
            }

            Object.entries(eq).forEach(([k, v]) => {
                const normalizedKey = k.trim().toUpperCase()
                const qty = typeof v === 'number' ? v : parseInt(v as string, 10) || 0
                if (qty > 0) aggregatedEquipment[normalizedKey] = (aggregatedEquipment[normalizedKey] || 0) + qty
            })
        })

        const firstEq = Object.keys(aggregatedEquipment)[0] || ''
        setSelectedEquipment(firstEq)
        setMaxQuantity(firstEq ? Math.max(1, aggregatedEquipment[firstEq]) : 1)
        setQuantity(1)
    }

    const handleEquipmentChange = (eq: string) => {
        setSelectedEquipment(eq)
        if (!selectedStudioSlot) return

        const studio = matchingStudios.find(s => s.matchingSlots.some((ms: any) => ms.id === selectedStudioSlot))
        if (!studio) return

        const primarySlot = studio.matchingSlots.find((s: any) => s.id === selectedStudioSlot)
        const primaryNormTime = normalizeTimeTo24h(primarySlot?.start_time || '')

        // Aggregate across ALL slots at the selected time for accurate count
        const slotsAtTime = studio.matchingSlots.filter((s: any) =>
            normalizeTimeTo24h(s.start_time) === primaryNormTime
        )
        const aggregated: Record<string, number> = {}
        slotsAtTime.forEach((s: any) => {
            const eqData = s.equipment
            if (!eqData || typeof eqData !== 'object') return

            if (Array.isArray(eqData)) {
                eqData.forEach((item) => {
                    if (typeof item === 'string') {
                        const key = item.trim().toUpperCase()
                        aggregated[key] = (aggregated[key] || 0) + 1
                    }
                })
                return
            }

            Object.entries(eqData).forEach(([k, v]) => {
                const key = k.trim().toUpperCase()
                const qty = typeof v === 'number' ? v : parseInt(v as string, 10) || 0
                if (qty > 0) aggregated[key] = (aggregated[key] || 0) + qty
            })
        })

        // Case-insensitive lookup in aggregated map
        const matchKey = Object.keys(aggregated).find(k => k.toLowerCase() === eq.trim().toLowerCase()) || ''
        setMaxQuantity(matchKey ? Math.max(1, aggregated[matchKey]) : 1)
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
                <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h3 className="font-medium text-charcoal-900 text-lg font-serif">1. Select a Date & Time</h3>
                        <div className="relative">
                            <select
                                value={filterLocation || ''}
                                onChange={(e) => {
                                    const params = new URLSearchParams(searchParams.toString())
                                    if (e.target.value) {
                                        params.set('location', e.target.value)
                                    } else {
                                        params.delete('location')
                                    }
                                    router.push(`?${params.toString()}`, { scroll: false })
                                }}
                                className="appearance-none bg-white border border-cream-200 text-charcoal-700 text-sm rounded-lg pl-3 pr-8 py-2 outline-none focus:border-charcoal-400 focus:ring-1 focus:ring-charcoal-400 w-full sm:w-56"
                            >
                                <option value="">All Areas</option>
                                {Array.from(new Set(availability.map(a => a.location_area).filter(Boolean))).sort().map(loc => (
                                    <option key={loc as string} value={loc as string}>{loc as string}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-charcoal-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Calendar View */}
                    <div className="bg-white border border-cream-200 rounded-2xl p-4 sm:p-6 shadow-sm max-w-md mx-auto">
                        <div className="flex items-center justify-between mb-4">
                            <button
                                onClick={() => handleMonthChange(-1)}
                                className="p-2 hover:bg-cream-50 rounded-full transition-colors text-charcoal-500 hover:text-charcoal-900 disabled:opacity-30"
                                disabled={isPast(subMonths(monthStart, 0)) && !isSameMonth(monthStart, new Date())}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h3 className="font-serif text-lg text-charcoal-900 text-center">
                                {format(monthStart, 'MMMM yyyy')}
                            </h3>
                            <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-cream-50 rounded-full transition-colors text-charcoal-500 hover:text-charcoal-900">
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

                    {/* Selected Date Header */}
                    {selectedDate && (
                        <div className="text-center mb-4 pb-2 border-b border-cream-200 max-w-2xl mx-auto">
                            <h3 className="text-xl font-serif text-charcoal-900">
                                {format(new Date(selectedDate), 'EEEE, MMMM do')}
                            </h3>
                            <p className="text-sm text-charcoal-500 mt-1">Select a time slot below to continue</p>
                        </div>
                    )}

                    {/* Time Slots for Selected Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(() => {
                            const activeDate = selectedDate || (availableDatesWithSlots.size > 0 ? Array.from(availableDatesWithSlots).sort()[0] : null);
                            if (!activeDate) return <div className="col-span-full text-center py-12 text-charcoal-500 italic">No available dates found for this month.</div>;

                            const d = nextDays.find(nd => nd.date === activeDate);
                            const nowInstance = toManilaDate(new Date());
                            const nowMinus30Shift = new Date(nowInstance.getTime() - 30 * 60 * 1000);
                            const nowManilaTime = nowMinus30Shift.getUTCHours().toString().padStart(2, '0') + ':' + nowMinus30Shift.getUTCMinutes().toString().padStart(2, '0');
                            const isToday = activeDate === getManilaTodayStr();
                            const isPastDate = activeDate < getManilaTodayStr();

                            const slots = availability.filter(a => {
                                const dateMatch = a.date ? a.date === activeDate : a.day_of_week === d?.dayIndex;
                                const aLoc = a.location_area?.trim().toLowerCase();
                                const fLoc = filterLocation?.trim().toLowerCase();
                                const locationMatch = fLoc ? (aLoc === fLoc || aLoc.startsWith(fLoc + ' - ')) : true;
                                const notExpired = isPastDate ? false : (isToday ? a.end_time.slice(0, 5) > nowManilaTime : true);
                                const notBooked = !bookedSlotsSet.has(`${activeDate}|${normalizeTimeTo24h(a.start_time)}`);
                                return dateMatch && locationMatch && notExpired && notBooked;
                            });

                            if (slots.length === 0) {
                                return (
                                    <div className="col-span-full text-center py-12 text-charcoal-400 italic">
                                        No slots available for this day.
                                    </div>
                                );
                            }

                            // Group slots by exact start and end times
                            const groupedSlots = slots.reduce((acc, slot) => {
                                const key = `${slot.start_time}-${slot.end_time}`
                                if (!acc[key]) {
                                    acc[key] = {
                                        primarySlot: slot,
                                        locations: [slot.location_area]
                                    }
                                } else {
                                    if (!acc[key].locations.includes(slot.location_area)) {
                                        acc[key].locations.push(slot.location_area)
                                    }
                                }
                                return acc
                            }, {} as Record<string, { primarySlot: any, locations: string[] }>)

                            return (Object.values(groupedSlots) as { primarySlot: any, locations: string[] }[]).map(({ primarySlot: slot, locations }) => {
                                const extraLocCount = locations.length - 1;
                                return (
                                    <button
                                        key={slot.id}
                                        onClick={() => handleSearchCheck(slot, activeDate)}
                                        className="p-5 rounded-2xl border text-left transition-all relative overflow-hidden bg-white border-[#ebd3cf] hover:shadow-md text-[#333333] group"
                                    >
                                        <div className="font-serif text-xl mb-2">
                                            {formatTo12Hour(slot.start_time)}
                                            <span className="text-sm opacity-50 mx-2">to</span>
                                            {formatTo12Hour(slot.end_time)}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                            <div className="text-[11px] text-charcoal-600 flex items-center gap-1 font-medium bg-cream-50 px-2 py-0.5 rounded border border-cream-100 max-w-full">
                                                <MapPin className="w-3 h-3 text-charcoal-400 shrink-0" />
                                                <span className="truncate">{locations[0].split(' - ')[1] || locations[0]}</span>
                                            </div>
                                            {extraLocCount > 0 && (
                                                <div className="text-[10px] font-bold text-charcoal-700 bg-cream-100 px-1.5 py-0.5 rounded border border-cream-200 shrink-0">
                                                    +{extraLocCount} Area{extraLocCount !== 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                                            <ArrowRight className="w-5 h-5 text-charcoal-400" />
                                        </div>
                                    </button>
                                )
                            })
                        })()}
                    </div>
                </div>
            )}

            {/* Pending Booking Resume Banner — shown when user selects a slot that they have a pending booking for */}
            {step === 2 && selectedStudioSlot && (() => {
                const resumeBooking = pendingBookings.find((pb: any) =>
                    (pb.booked_slot_ids || []).includes(selectedStudioSlot)
                )

                if (resumeBooking) {
                    return (
                        <div className="bg-orange-50 p-6 rounded-xl border border-orange-200 animate-in fade-in slide-in-from-top-2 text-center mb-6">
                            <h3 className="font-serif text-lg text-orange-900 mb-2">Resume Your Reservation</h3>
                            <p className="text-orange-700 text-sm mb-6 max-w-md mx-auto">
                                You already have a pending reservation for this time slot. Please complete your payment to finalize the booking.
                            </p>
                            <button
                                onClick={() => router.push(`/customer/payment/${resumeBooking.id}`)}
                                className="bg-orange-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors inline-block mx-auto"
                            >
                                Continue to Payment
                            </button>
                        </div>
                    )
                }
                return null
            })()}
            {/* Step 2: Select Studio + Equipment + Quantity */}
            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-charcoal-900">2. Select a Studio & Options</h3>
                        <button onClick={() => setStep(1)} className="text-sm text-charcoal-500 hover:text-charcoal-900">
                            ← Change Time
                        </button>
                    </div>

                    <div className="bg-charcoal-900/5 border border-charcoal-900/10 p-4 rounded-2xl text-charcoal-900 flex items-start gap-3">
                        <Info className="w-5 h-5 text-charcoal-400 shrink-0 mt-0.5" />
                        <div className="text-sm">
                            Searching studios in <span className="font-bold underline decoration-charcoal-200">{selectedSlot?.location_area}</span> on <span className="font-bold underline decoration-charcoal-200">{selectedDate}</span> at <span className="font-bold underline decoration-charcoal-200">{formatTo12Hour(selectedSlot?.start_time)}</span>
                        </div>
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
                                                                ? "bg-[#ebd3cf] text-[#333333] border-[#ebd3cf] shadow-sm"
                                                                : "bg-white text-[#333333] border-[#ebd3cf] hover:shadow-sm"
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
                                        const primarySlot = result.matchingSlots.find((ms: any) => ms.id === selectedStudioSlot);
                                        const primaryNormTime = normalizeTimeTo24h(primarySlot?.start_time || '');
                                        const slotsAtTime = result.matchingSlots.filter((s: any) =>
                                            normalizeTimeTo24h(s.start_time) === primaryNormTime
                                        );

                                        // Aggregate equipment from ALL slots at this time, summing JSONB values
                                        const aggregatedEq: Record<string, number> = {};
                                        slotsAtTime.forEach((s: any) => {
                                            const eq = s.equipment;
                                            if (!eq || typeof eq !== 'object') return;

                                            if (Array.isArray(eq)) {
                                                eq.forEach((item) => {
                                                    if (typeof item === 'string') {
                                                        const key = item.trim().toUpperCase();
                                                        aggregatedEq[key] = (aggregatedEq[key] || 0) + 1;
                                                    }
                                                });
                                                return;
                                            }

                                            Object.entries(eq).forEach(([k, v]) => {
                                                const key = k.trim().toUpperCase();
                                                const qty = typeof v === 'number' ? v : parseInt(v as string, 10) || 0;
                                                if (qty > 0) aggregatedEq[key] = (aggregatedEq[key] || 0) + qty;
                                            });
                                        });
                                        const allEq = Object.keys(aggregatedEq);

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
                                                                    // Read count from aggregated JSONB values directly
                                                                    const count = aggregatedEq[eq] ?? 0;
                                                                    const isSelected = selectedEquipment === eq;
                                                                    return (
                                                                        <button
                                                                            key={eq as string}
                                                                            type="button"
                                                                            onClick={() => handleEquipmentChange(eq as string)}
                                                                            className={clsx(
                                                                                "px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between min-w-[140px]",
                                                                                isSelected
                                                                                    ? "bg-charcoal-900 border-charcoal-900 text-cream-50 shadow-md transform scale-[1.02]"
                                                                                    : "bg-white border-cream-200 text-charcoal-700 hover:border-charcoal-400"
                                                                            )}
                                                                        >
                                                                            <div className="text-left">
                                                                                <div className="uppercase tracking-widest text-[10px] opacity-70 mb-0.5">{eq as string}</div>
                                                                                <div className={clsx("text-xs", isSelected ? "text-cream-200" : "text-charcoal-400")}>
                                                                                    {count} available
                                                                                </div>
                                                                            </div>
                                                                            {isSelected && <CheckCircle className="w-4 h-4 text-cream-50 shrink-0" />}
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
                                                    const studioPricing = result.studio.pricing || {};
                                                    const sKey = Object.keys(studioPricing).find(k => k.toLowerCase() === selectedEquipment.toLowerCase());
                                                    const studioRate = sKey ? (studioPricing[sKey] || 0) : (Number(result.studio.hourly_rate) || 0);

                                                    const reformerKey = Object.keys(instructorRates).find(k => k.toUpperCase() === 'REFORMER');
                                                    const instructorRate = reformerKey ? (instructorRates[reformerKey] || 0) : 0;

                                                    const sessionFee = studioRate + instructorRate;
                                                    const serviceFee = Math.max(100, sessionFee * 0.2);

                                                    const total = (sessionFee + serviceFee) * quantity;

                                                    return (
                                                        <div className="bg-cream-50 p-5 rounded-2xl border border-cream-100 space-y-2.5">
                                                            <div className="flex justify-between text-xs text-charcoal-500">
                                                                <span>Session Fee (1x)</span>
                                                                <span>₱{sessionFee.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between text-[10px] text-charcoal-400 pl-2">
                                                                <span>↳ Instructor Base <span className="opacity-70">({selectedEquipment})</span></span>
                                                                <span>₱{instructorRate.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between text-[10px] text-charcoal-400 pl-2">
                                                                <span>↳ Studio Fee <span className="opacity-70">({selectedEquipment})</span></span>
                                                                <span>₱{studioRate.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs text-charcoal-500 mt-2">
                                                                <span>Service Fee (20% min. ₱100)</span>
                                                                <span>₱{serviceFee.toLocaleString()}</span>
                                                            </div>
                                                            {quantity > 1 && (
                                                                <div className="flex justify-between text-[10px] text-charcoal-400 mt-1">
                                                                    <span>Quantity:</span>
                                                                    <span>× {quantity} {selectedEquipment}s</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between text-base font-bold text-charcoal-900 pt-2.5 border-t border-cream-200/50 mt-2">
                                                                <span>Grand Total</span>
                                                                <span className="font-serif text-xl">₱{total.toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                <button
                                                    onClick={handleBooking}
                                                    disabled={isBooking || !selectedEquipment}
                                                    className="w-full bg-charcoal-900 text-cream-50 py-4 rounded-xl font-bold hover:bg-charcoal-800 transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                                                >
                                                    {isBooking ? (
                                                        <>
                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                            Processing...
                                                        </>
                                                    ) : (
                                                        'Request Booking (' + quantity + ')'
                                                    )}
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
