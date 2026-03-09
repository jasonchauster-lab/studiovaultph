'use client'

import React, { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findMatchingStudios } from '@/app/(dashboard)/instructors/actions'
import { requestBooking } from '@/app/(dashboard)/customer/actions'
import { getManilaTodayStr, toManilaDate, formatTo12Hour, normalizeTimeTo24h } from '@/lib/timezone'
import { Loader2, MapPin, CheckCircle, ArrowRight, Minus, Plus, ChevronLeft, ChevronRight, Info, Calendar, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isBefore, startOfDay, addDays, isPast, eachDayOfInterval, addHours, parse, isAfter } from 'date-fns'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Splits a list of availability slots into 1-hour blocks.
 */
function splitIntoHourlySlots(availability: any[]) {
    const hourlySlots: any[] = [];
    availability.forEach(slot => {
        const start = parse(slot.start_time, 'HH:mm:ss', new Date());
        const end = parse(slot.end_time, 'HH:mm:ss', new Date());

        let current = start;
        while (isBefore(current, end)) {
            const next = addHours(current, 1);
            if (isAfter(next, end)) break;

            hourlySlots.push({
                ...slot,
                start_time: format(current, 'HH:mm:ss'),
                end_time: format(next, 'HH:mm:ss'),
                // Keep the original ID as a reference but make the split slot ID unique
                id: `${slot.id}-${format(current, 'HHmm')}`
            });
            current = next;
        }
    });
    return hourlySlots;
}

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
    const [expandedSlotKey, setExpandedSlotKey] = useState<string | null>(null)
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

    // Split availability into hourly slots
    const processedAvailability = React.useMemo(() => {
        return splitIntoHourlySlots(availability || []);
    }, [availability]);

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

            return processedAvailability.some(a => {
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

    const calendarRows: React.ReactNode[] = []
    let days: React.ReactNode[] = []
    let day = startDate

    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            const cloneDay = day
            const dateStr = format(cloneDay, 'yyyy-MM-dd')
            const hasSlots = availableDatesWithSlots.has(dateStr)
            const isSelected = selectedDate === dateStr
            const isPastDay = isBefore(cloneDay, today)
            const formattedDate = format(cloneDay, "d")

            days.push(
                <button
                    key={cloneDay.toString()}
                    type="button"
                    onClick={() => {
                        if (hasSlots) {
                            setSelectedDate(dateStr)
                        }
                    }}
                    className={clsx(
                        "h-12 flex flex-col items-center justify-center rounded-[18px] text-[11px] transition-all focus:outline-none",
                        !isSameMonth(cloneDay, monthStart) ? "text-charcoal/10 pointer-events-none" : "",
                        isSameMonth(cloneDay, monthStart) && !hasSlots && !isPastDay && !isSelected ? "text-charcoal/40" : "",
                        isPastDay ? "text-charcoal/10 pointer-events-none opacity-40" : "",
                        hasSlots && !isSelected ? "bg-white/40 text-charcoal font-bold hover:bg-white/60 cursor-pointer border border-white/80" : "",
                        isSelected ? "bg-sage text-white font-bold shadow-cloud transform scale-105" : ""
                    )}
                    disabled={!hasSlots || isPastDay}
                >
                    <span className="leading-none">{formattedDate}</span>
                    {hasSlots && !isSelected && <span className="w-1 h-1 bg-sage/40 rounded-full mt-1.5"></span>}
                </button>
            )
            day = addDays(day, 1)
        }
        calendarRows.push(
            <div className="grid grid-cols-7 gap-2 mb-2" key={day.toString()}>
                {days}
            </div>
        )
        days = []
    }

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
        <div className="space-y-10">
            {/* Step 1: Select Date & Time */}
            {step === 1 && (
                <div className="space-y-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <h3 className="text-xl font-serif font-bold text-charcoal">1. Select a Date & Time</h3>
                        <div className="relative group">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30 group-hover:text-sage transition-colors" />
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
                                className="appearance-none bg-white/40 border border-white/60 text-charcoal text-[11px] font-bold uppercase tracking-widest rounded-[14px] pl-10 pr-10 py-3 outline-none focus:ring-1 focus:ring-sage focus:border-transparent w-full sm:w-64 transition-all"
                            >
                                <option value="">All Teaching Areas</option>
                                {Array.from(new Set(processedAvailability.map(a => a.location_area).filter(Boolean))).sort().map(loc => (
                                    <option key={loc as string} value={loc as string}>{loc as string}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Monthly Calendar View */}
                    <div className="bg-white/30 backdrop-blur-md border border-white/80 rounded-[32px] p-6 sm:p-8 shadow-cloud max-w-sm mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <button
                                onClick={() => handleMonthChange(-1)}
                                className="p-3 hover:bg-white/60 rounded-full transition-all text-charcoal/40 hover:text-charcoal disabled:opacity-10"
                                disabled={isPast(subMonths(monthStart, 0)) && !isSameMonth(monthStart, new Date())}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h3 className="font-serif text-lg font-bold text-charcoal">
                                {format(monthStart, 'MMMM yyyy')}
                            </h3>
                            <button onClick={() => handleMonthChange(1)} className="p-3 hover:bg-white/60 rounded-full transition-all text-charcoal/40 hover:text-charcoal">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-7 gap-2 mb-4">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                                <div key={d} className="text-center text-[10px] font-bold text-charcoal/20 uppercase tracking-[0.2em]">
                                    {d}
                                </div>
                            ))}
                        </div>

                        <div className="animate-in fade-in duration-500">{calendarRows}</div>
                    </div>

                    {/* Selected Date Header */}
                    {selectedDate && (
                        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-2">
                            <h3 className="text-2xl font-serif font-bold text-charcoal">
                                {format(new Date(selectedDate), 'EEEE, MMMM do')}
                            </h3>
                            <p className="text-[10px] font-bold text-sage uppercase tracking-[0.3em] mt-2">Available Sessions</p>
                        </div>
                    )}

                    {/* Time Slots for Selected Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {(() => {
                            const activeDate = selectedDate || (availableDatesWithSlots.size > 0 ? Array.from(availableDatesWithSlots).sort()[0] : null);
                            if (!activeDate) return <div className="col-span-full text-center py-20 text-charcoal/30 italic font-medium">No sessions scheduled for this period.</div>;

                            const d = nextDays.find(nd => nd.date === activeDate);
                            const nowInstance = toManilaDate(new Date());
                            const nowMinus30Shift = new Date(nowInstance.getTime() - 30 * 60 * 1000);
                            const nowManilaTime = nowMinus30Shift.getUTCHours().toString().padStart(2, '0') + ':' + nowMinus30Shift.getUTCMinutes().toString().padStart(2, '0');
                            const isToday = activeDate === getManilaTodayStr();
                            const isPastDate = activeDate < getManilaTodayStr();

                            const slots = processedAvailability.filter(a => {
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
                                    <div className="col-span-full text-center py-20 bg-white/20 rounded-[28px] border border-dashed border-white/60">
                                        <p className="text-[11px] font-bold text-charcoal/30 uppercase tracking-widest italic font-serif">
                                            No sessions available for this day.
                                        </p>
                                    </div>
                                );
                            }

                            // Group slots by exact start and end times
                            const groupedSlots = slots.reduce((acc, slot) => {
                                const key = `${slot.start_time}-${slot.end_time}`
                                if (!acc[key]) {
                                    acc[key] = {
                                        key,
                                        primarySlot: slot,
                                        locations: [slot.location_area],
                                        allSlots: [slot]
                                    }
                                } else {
                                    if (!acc[key].locations.includes(slot.location_area)) {
                                        acc[key].locations.push(slot.location_area)
                                        acc[key].allSlots.push(slot)
                                    }
                                }
                                return acc
                            }, {} as Record<string, { key: string, primarySlot: any, locations: string[], allSlots: any[] }>)

                            return (Object.values(groupedSlots) as { key: string, primarySlot: any, locations: string[], allSlots: any[] }[]).map(({ key, primarySlot: slot, locations, allSlots }) => {
                                const isExpanded = expandedSlotKey === key;
                                return (
                                    <div
                                        key={key}
                                        className="p-6 rounded-[24px] border border-white/80 bg-white/40 text-left transition-all relative shadow-sm hover:shadow-cloud hover:bg-white/50"
                                    >
                                        <div className="font-serif text-[18px] sm:text-[20px] font-bold text-charcoal mb-4 flex flex-wrap items-baseline gap-2">
                                            <span className="whitespace-nowrap">{formatTo12Hour(slot.start_time)}</span>
                                            <span className="text-[9px] text-charcoal/30 font-sans uppercase tracking-[0.2em] font-bold">to</span>
                                            <span className="whitespace-nowrap">{formatTo12Hour(slot.end_time)}</span>
                                        </div>

                                        {locations.length === 1 ? (
                                            <button
                                                onClick={() => handleSearchCheck(slot, activeDate)}
                                                className="w-full flex items-center justify-between group"
                                            >
                                                <div className="text-[9px] font-bold text-sage uppercase tracking-widest flex items-center gap-2 bg-sage/5 px-3 py-2 rounded-[12px] border border-sage/10 group-hover:bg-sage/10 transition-colors max-w-[90%]">
                                                    <MapPin className="w-3 h-3 shrink-0" />
                                                    <span className="truncate">{locations[0].split(' - ')[1] || locations[0]}</span>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-sage opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all shrink-0" />
                                            </button>
                                        ) : (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setExpandedSlotKey(isExpanded ? null : key)}
                                                    className={clsx(
                                                        "w-full flex items-center justify-between text-[9px] font-bold uppercase tracking-widest px-3 py-2.5 rounded-[12px] border transition-all",
                                                        isExpanded ? "bg-charcoal text-white border-charcoal" : "bg-gold/5 text-gold border-gold/20 hover:bg-gold/10"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2 truncate pr-2">
                                                        <MapPin className="w-3 h-3 shrink-0" />
                                                        <span>Select Area ({locations.length})</span>
                                                    </div>
                                                    <ChevronDown className={clsx("w-4 h-4 transition-transform shrink-0", isExpanded && "rotate-180")} />
                                                </button>

                                                {isExpanded && (() => {
                                                    // Categorize slots by main location
                                                    const categorized = allSlots.reduce((acc, s) => {
                                                        const locStr = s.location_area || '';
                                                        let main = 'Other';
                                                        let sub = locStr;

                                                        if (locStr.includes(' - ')) {
                                                            const parts = locStr.split(' - ');
                                                            main = parts[0].trim();
                                                            sub = parts.slice(1).join(' - ').trim();
                                                        } else if (locStr.includes('-')) {
                                                            const parts = locStr.split('-');
                                                            main = parts[0].trim();
                                                            sub = parts.slice(1).join('-').trim();
                                                        }

                                                        // Map abbreviations to full names if needed
                                                        const mainName = main === 'QC' ? 'Quezon City' : main;

                                                        if (!acc[mainName]) acc[mainName] = [];
                                                        acc[mainName].push({ ...s, subName: sub });
                                                        return acc;
                                                    }, {} as Record<string, any[]>);

                                                    return (
                                                        <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-white/95 backdrop-blur-xl rounded-[24px] border border-white/60 shadow-cloud p-3 animate-in fade-in slide-in-from-top-2 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                            {(Object.entries(categorized) as [string, any[]][]).map(([mainLoc, subs]) => (
                                                                <div key={mainLoc} className="space-y-1.5">
                                                                    <div className="px-3 py-1 flex items-center gap-2">
                                                                        <div className="w-1 h-3 bg-sage/30 rounded-full" />
                                                                        <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.15em]">{mainLoc}</span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {subs.map((s: any) => (
                                                                            <button
                                                                                key={s.id}
                                                                                onClick={() => { handleSearchCheck(s, activeDate); setExpandedSlotKey(null); }}
                                                                                className="w-full text-left px-3 py-2.5 rounded-[14px] hover:bg-sage/10 text-[9px] font-bold text-charcoal uppercase tracking-widest transition-all flex items-center justify-between group active:scale-[0.98]"
                                                                            >
                                                                                <span className="truncate pl-3">{s.subName}</span>
                                                                                <ArrowRight className="w-3.5 h-3.5 text-sage opacity-0 group-hover:opacity-100 transform -translate-x-1 group-hover:translate-x-0 transition-all shrink-0" />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        })()}
                    </div>
                </div>
            )}

            {/* Pending Booking Resume Banner */}
            {step === 2 && selectedStudioSlot && (() => {
                const resumeBooking = pendingBookings.find((pb: any) =>
                    (pb.booked_slot_ids || []).includes(selectedStudioSlot)
                )

                if (resumeBooking) {
                    return (
                        <div className="bg-sage/10 p-8 rounded-[32px] border border-sage/20 animate-in fade-in slide-in-from-top-4 text-center mb-10">
                            <h3 className="font-serif text-xl font-bold text-sage mb-2">Resume Your Reservation</h3>
                            <p className="text-[11px] font-bold text-charcoal/40 uppercase tracking-widest mb-8 max-w-sm mx-auto leading-relaxed">
                                You have an active reservation. Secure your place by completing the authentication.
                            </p>
                            <button
                                onClick={() => router.push(`/customer/payment/${resumeBooking.id}`)}
                                className="bg-charcoal text-white px-10 py-4 rounded-[20px] text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-cloud shadow-charcoal/10"
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
                <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-serif font-bold text-charcoal">2. Select Your Studio Sanctuary</h3>
                        <button
                            onClick={() => setStep(1)}
                            className="text-[10px] font-bold text-charcoal/30 uppercase tracking-[0.2em] hover:text-sage transition-colors flex items-center gap-2"
                        >
                            <ChevronLeft className="w-4 h-4" /> Change Session
                        </button>
                    </div>

                    <div className="bg-sage/5 border border-sage/10 p-6 rounded-[24px] flex items-start gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center shrink-0">
                            <Info className="w-5 h-5 text-sage" />
                        </div>
                        <div className="text-[11px] font-medium text-charcoal/60 leading-relaxed uppercase tracking-widest pt-1">
                            Searching for spaces in <span className="text-charcoal font-bold">{selectedSlot?.location_area}</span> on <span className="text-charcoal font-bold">{selectedDate}</span> at <span className="text-charcoal font-bold">{formatTo12Hour(selectedSlot?.start_time)}</span>
                        </div>
                    </div>

                    {isSearching ? (
                        <div className="text-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin mx-auto text-sage/40" />
                            <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-[0.3em] mt-6">Consulting the Vault...</p>
                        </div>
                    ) : matchingStudios.length === 0 ? (
                        <div className="text-center py-20 bg-white/20 rounded-[32px] border border-dashed border-white/60">
                            <p className="text-[11px] font-bold text-charcoal/30 uppercase tracking-widest italic font-serif">No studios available for this specific criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-8">
                            {matchingStudios.map(result => (
                                <div key={result.studio.id} className="bg-white/40 backdrop-blur-md p-8 rounded-[32px] border border-white/80 shadow-cloud space-y-8">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="space-y-1">
                                            <h4 className="font-serif text-2xl font-bold text-charcoal">{result.studio.name}</h4>
                                            <p className="text-[11px] font-bold text-charcoal/40 uppercase tracking-widest flex items-center gap-2">
                                                <MapPin className="w-3 h-3" />
                                                {result.studio.location}
                                            </p>
                                        </div>
                                        <div className="bg-sage/10 px-4 py-2 rounded-2xl border border-sage/20">
                                            <span className="text-[10px] font-bold text-sage uppercase tracking-widest">Verified Venue</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-[0.2em]">Available Start Times</p>
                                        <div className="flex flex-wrap gap-3">
                                            {(() => {
                                                const uniqueTimes = Array.from(new Set(result.matchingSlots.map((s: any) => s.start_time))).sort();
                                                return (uniqueTimes as string[]).map(startTime => {
                                                    const isSelected = result.matchingSlots.some((s: any) => s.id === selectedStudioSlot && s.start_time === startTime);
                                                    return (
                                                        <button
                                                            key={startTime}
                                                            onClick={() => handleSelectStudioTime(result.studio.id, startTime)}
                                                            className={clsx(
                                                                "px-6 py-3 rounded-[16px] text-xs font-bold uppercase tracking-widest transition-all border",
                                                                isSelected
                                                                    ? "bg-sage text-white border-sage shadow-md scale-105"
                                                                    : "bg-white/60 text-charcoal/60 border-white/80 hover:bg-white hover:text-charcoal"
                                                            )}
                                                        >
                                                            {formatTo12Hour(startTime)}
                                                        </button>
                                                    );
                                                });
                                            })()}
                                        </div>
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
                                            <div className="pt-8 border-t border-charcoal/5 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                                {/* Equipment & Quantity */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                    <div className="space-y-5">
                                                        <label className="text-[10px] font-bold text-charcoal/30 uppercase tracking-[0.2em]">Select Equipment</label>
                                                        <div className="flex flex-col gap-3">
                                                            {allEq.length === 0 ? (
                                                                <div className="bg-white/40 text-charcoal/30 px-6 py-4 rounded-[20px] text-[11px] font-medium italic border border-white/60">
                                                                    No specialized equipment listed.
                                                                </div>
                                                            ) : (
                                                                allEq.map((eq: string) => {
                                                                    const count = aggregatedEq[eq] ?? 0;
                                                                    const isSelected = selectedEquipment === eq;
                                                                    return (
                                                                        <button
                                                                            key={eq as string}
                                                                            type="button"
                                                                            onClick={() => handleEquipmentChange(eq as string)}
                                                                            className={clsx(
                                                                                "px-6 py-4 rounded-[20px] border transition-all flex items-center justify-between group",
                                                                                isSelected
                                                                                    ? "bg-charcoal text-white border-charcoal shadow-cloud-lg scale-[1.02]"
                                                                                    : "bg-white/40 border-white/60 text-charcoal/60 hover:bg-white/60 hover:text-charcoal"
                                                                            )}
                                                                        >
                                                                            <div className="text-left">
                                                                                <div className="uppercase tracking-widest text-[10px] font-bold mb-0.5">{eq as string}</div>
                                                                                <div className={clsx("text-[9px] font-medium uppercase tracking-[0.1em]", isSelected ? "text-sage" : "text-charcoal/30")}>
                                                                                    {count} Units Available
                                                                                </div>
                                                                            </div>
                                                                            {isSelected ? <CheckCircle className="w-5 h-5 text-sage" /> : <div className="w-5 h-5 rounded-full border border-charcoal/10 group-hover:border-sage transition-colors" />}
                                                                        </button>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-5">
                                                        <label className="text-[10px] font-bold text-charcoal/30 uppercase tracking-[0.2em]">Number of Attendees</label>
                                                        <div className="bg-white/40 p-6 rounded-[28px] border border-white/60 space-y-6">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-4">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                                                        className="w-12 h-12 rounded-2xl bg-white border border-charcoal/5 flex items-center justify-center hover:shadow-sm active:scale-90 transition-all text-charcoal"
                                                                    >
                                                                        <Minus className="w-5 h-5" />
                                                                    </button>
                                                                    <div className="w-12 text-center">
                                                                        <span className="text-3xl font-serif font-bold text-charcoal">{quantity}</span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
                                                                        className="w-12 h-12 rounded-2xl bg-white border border-charcoal/5 flex items-center justify-center hover:shadow-sm active:scale-90 transition-all text-charcoal"
                                                                    >
                                                                        <Plus className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-[9px] font-bold text-charcoal/20 uppercase tracking-widest">Capacity</div>
                                                                    <div className="text-sm font-serif font-bold text-sage">{maxQuantity} Max</div>
                                                                </div>
                                                            </div>
                                                            <p className="text-[9px] font-medium text-charcoal/40 uppercase tracking-widest leading-relaxed">
                                                                Quantity applies the session fee per person. For individual sessions, keep at 1.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pricing Summary */}
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
                                                        <div className="bg-charcoal text-white p-8 rounded-[32px] shadow-cloud-lg space-y-5 relative overflow-hidden">
                                                            <div className="absolute top-0 right-0 w-32 h-32 bg-sage/10 blur-[60px] rounded-full" />

                                                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                                                                <span>Session Investment</span>
                                                                <span>{quantity} Person{quantity > 1 ? 's' : ''}</span>
                                                            </div>

                                                            <div className="space-y-3 pt-4 border-t border-white/5">
                                                                <div className="flex justify-between text-xs font-medium">
                                                                    <span className="text-white/60 font-bold uppercase tracking-widest text-[9px]">Base Fee <span className="text-white/20 italic font-normal ml-2">({selectedEquipment})</span></span>
                                                                    <span className="text-sage">₱{sessionFee.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between text-[10px] text-white/20 font-bold uppercase tracking-widest pl-4">
                                                                    <span>↳ Instructor Portfolio</span>
                                                                    <span>₱{instructorRate.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between text-[10px] text-white/20 font-bold uppercase tracking-widest pl-4">
                                                                    <span>↳ Studio Curation</span>
                                                                    <span>₱{studioRate.toLocaleString()}</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs font-medium pt-2">
                                                                    <span className="text-white/60 font-bold uppercase tracking-widest text-[9px]">Platform Curation</span>
                                                                    <span className="text-sage">₱{serviceFee.toLocaleString()}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex justify-between items-end pt-6 border-t border-white/10 mt-6">
                                                                <div>
                                                                    <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-1">Grand Total</div>
                                                                    <div className="text-4xl font-serif font-bold text-white tracking-tighter">₱{total.toLocaleString()}</div>
                                                                </div>
                                                                <button
                                                                    onClick={handleBooking}
                                                                    disabled={isBooking || !selectedEquipment}
                                                                    className="bg-sage text-white px-10 py-5 rounded-[24px] text-[11px] font-bold uppercase tracking-widest hover:bg-white hover:text-charcoal transition-all shadow-cloud-lg active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-3"
                                                                >
                                                                    {isBooking ? (
                                                                        <>
                                                                            <Loader2 className="w-5 h-5 animate-spin" />
                                                                            Authenticating...
                                                                        </>
                                                                    ) : (
                                                                        <>Confirm Request <ArrowRight className="w-4 h-4" /></>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
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
