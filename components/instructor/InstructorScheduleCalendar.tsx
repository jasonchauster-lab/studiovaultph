'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, setHours, setMinutes, getDay, parse, differenceInMinutes, isPast, addDays, subDays, startOfMonth, endOfMonth, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Trash2, MapPin, X, User, Box, ArrowUpRight, MessageSquare, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, Check } from 'lucide-react'
import clsx from 'clsx'
import { toManilaDateStr, getManilaTodayStr, toManilaDate } from '@/lib/timezone'
import { deleteAvailability, addAvailability } from '@/app/(dashboard)/instructor/schedule/actions'
import InstructorScheduleGenerator from './InstructorScheduleGenerator'
import ChatWindow from '@/components/dashboard/ChatWindow'

interface Availability {
    id: string
    instructor_id: string
    day_of_week: number
    date: string | null
    start_time: string
    end_time: string
    location_area: string
    equipment?: string[]
    group_id?: string
}

interface InstructorScheduleCalendarProps {
    availability: Availability[]
    bookings?: any[]
    currentUserId: string
    currentDate?: Date // Made optional with default
}

export default function InstructorScheduleCalendar({ availability, bookings = [], currentUserId, currentDate = new Date() }: InstructorScheduleCalendarProps) {
    const router = useRouter()
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedBooking, setSelectedBooking] = useState<any>(null)
    const [activeChat, setActiveChat] = useState<{ id: string, recipientId: string, name: string } | null>(null)
    const [view, setView] = useState<'day' | 'week' | 'month'>('week')

    // Single Add Form State
    const [singleDate, setSingleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [singleTime, setSingleTime] = useState('09:00')
    const [singleEndTime, setSingleEndTime] = useState('10:00')
    const [locations, setLocations] = useState<string[]>([])
    const [equipment, setEquipment] = useState<string[]>(['Reformer'])
    const [expandedCities, setExpandedCities] = useState<string[]>(['BGC', 'Makati'])

    const toggleCityAccordion = (city: string) => {
        setExpandedCities(prev =>
            prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
        )
    }
    const toggleLocation = (loc: string) => {
        setLocations(prev =>
            prev.includes(loc)
                ? prev.filter(l => l !== loc)
                : [...prev, loc]
        )
    }

    const toggleEquipment = (eq: string) => {
        setEquipment(prev =>
            prev.includes(eq)
                ? prev.filter(e => e !== eq)
                : [...prev, eq]
        )
    }

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
    }

    // Calendar Calculations
    const days = useMemo(() => {
        if (view === 'day') return [startOfDay(currentDate)]
        if (view === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 })
            const end = endOfWeek(currentDate, { weekStartsOn: 1 })
            return eachDayOfInterval({ start, end })
        }
        if (view === 'month') {
            const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
            const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
            return eachDayOfInterval({ start, end })
        }
        return []
    }, [currentDate, view])

    const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 9 PM
    const ROW_HEIGHT = 120 // Increased from 80 for better readability

    // Memoized indexing for O(1) cell lookup
    const { availabilityMap, recurringMap, bookingMap } = useMemo(() => {
        const aMap: Record<string, Availability[]> = {}
        const rMap: Record<string, Availability[]> = {}
        const bMap: Record<string, any[]> = {}

        availability.forEach(a => {
            const startH = parseInt(a.start_time.split(':')[0])
            if (a.date) {
                const key = `${a.date}-${startH}`
                if (!aMap[key]) aMap[key] = []
                aMap[key].push(a)
            } else {
                const key = `${a.day_of_week}-${startH}`
                if (!rMap[key]) rMap[key] = []
                rMap[key].push(a)
            }
        })

        bookings.forEach(b => {
            const slot = b.slots
            if (!slot?.date || !slot?.start_time) return
            if (['cancelled_refunded', 'rejected', 'expired'].includes(b.status)) return
            const startH = parseInt(slot.start_time.split(':')[0])
            const key = `${slot.date}-${startH}`
            if (!bMap[key]) bMap[key] = []
            bMap[key].push(b)
        })

        return { availabilityMap: aMap, recurringMap: rMap, bookingMap: bMap }
    }, [availability, bookings])

    // Current Time Line Logic
    const [now, setNow] = useState(toManilaDate(new Date()))

    useEffect(() => {
        const timer = setInterval(() => {
            setNow(toManilaDate(new Date()))
        }, 60000) // Update every minute
        return () => clearInterval(timer)
    }, [])

    const currentTimePosition = useMemo(() => {
        const hours24 = now.getUTCHours()
        const minutes = now.getUTCMinutes()
        const totalMinutes = hours24 * 60 + minutes
        const startMinutes = 6 * 60
        const endMinutes = 22 * 60

        if (totalMinutes < startMinutes || totalMinutes > endMinutes) return null

        return ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100
    }, [now])

    const handlePrev = () => {
        let newDate;
        if (view === 'day') newDate = subDays(currentDate, 1)
        else if (view === 'week') newDate = subWeeks(currentDate, 1)
        else newDate = subWeeks(currentDate, 4) // Simplified month jump
        router.push(`?date=${toManilaDateStr(newDate)}`)
    }

    const handleNext = () => {
        let newDate;
        if (view === 'day') newDate = addDays(currentDate, 1)
        else if (view === 'week') newDate = addWeeks(currentDate, 1)
        else newDate = addWeeks(currentDate, 4) // Simplified month jump
        router.push(`?date=${toManilaDateStr(newDate)}`)
    }

    const handleToday = () => {
        router.push('?date=' + getManilaTodayStr())
    }

    const handleDelete = async (id: string, groupId?: string) => {
        const message = groupId
            ? 'Are you sure you want to delete this session for ALL selected areas?'
            : 'Are you sure you want to delete this availability?';
        if (!confirm(message)) return;
        setIsSubmitting(true)
        await deleteAvailability(id, groupId)
        setIsSubmitting(false)
        router.refresh()
    }

    const handleCreateSingle = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (locations.length === 0) {
            alert('Please select at least one location');
            return;
        }
        if (equipment.length === 0) {
            alert('Please select at least one equipment type');
            return;
        }

        setIsSubmitting(true)
        const { generateRecurringAvailability } = await import('@/app/(dashboard)/instructor/schedule/actions');

        const result = await generateRecurringAvailability({
            startDate: singleDate,
            endDate: singleDate,
            days: [new Date(singleDate).getDay()],
            startTime: singleTime,
            endTime: singleEndTime,
            locations: locations,
            equipment: equipment
        })

        setIsSubmitting(false)
        if (result.success) {
            setIsAddModalOpen(false)
            router.refresh()
        } else {
            alert(result.error)
        }
    }

    const [editingSlot, setEditingSlot] = useState<Availability | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingSlot) return;
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        // Append the equipment array as custom JSON to the form data
        formData.append('equipment', JSON.stringify(equipment));

        const { updateAvailability } = await import('@/app/(dashboard)/instructor/schedule/actions')
        const result = await updateAvailability(editingSlot.id, formData)

        setIsSubmitting(false)
        if (result.success) {
            setIsEditModalOpen(false)
            setEditingSlot(null)
            router.refresh()
        } else {
            alert(result.error)
        }
    }

    const openEditModal = (slot: Availability) => {
        setEditingSlot(slot)
        setSingleDate(slot.date || format(new Date(), 'yyyy-MM-dd'))
        setSingleTime(slot.start_time)
        setSingleEndTime(slot.end_time)
        setLocations([slot.location_area])
        setEquipment(slot.equipment || ['Reformer'])
        setIsEditModalOpen(true)
    }

    const AREAS = [
        'Alabang - Madrigal/Ayala Alabang', 'Alabang - Filinvest City', 'Alabang - Alabang Town Center Area', 'Alabang - Others',
        'BGC - High Street', 'BGC - Central Square/Uptown', 'BGC - Forbes Town', 'BGC - Others',
        'Ortigas - Ortigas Center', 'Ortigas - Greenhills', 'Ortigas - San Juan', 'Ortigas - Others',
        'Makati - CBD/Ayala', 'Makati - Poblacion/Rockwell', 'Makati - San Antonio/Gil Puyat', 'Makati - Others',
        'Mandaluyong - Ortigas South', 'Mandaluyong - Greenfield/Shaw', 'Mandaluyong - Boni/Pioneer',
        'QC - Tomas Morato', 'QC - Katipunan', 'QC - Eastwood', 'QC - Cubao', 'QC - Fairview/Commonwealth', 'QC - Novaliches', 'QC - Diliman', 'QC - Maginhawa/UP Village',
        'Paranaque - BF Homes', 'Paranaque - Moonwalk / Merville', 'Paranaque - Bicutan / Sucat', 'Paranaque - Others'
    ];

    const GROUPED_AREAS = AREAS.reduce((acc, loc) => {
        const city = loc.split(' - ')[0];
        if (!acc[city]) acc[city] = [];
        acc[city].push(loc);
        return acc;
    }, {} as Record<string, string[]>);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="earth-card p-10 bg-white shadow-tight relative overflow-hidden">
                {/* Background Tint */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-buttermilk/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                {/* Row 1: Title + Date Navigation */}
                <div className="flex flex-wrap items-center gap-4 relative z-10">
                    <h2 className="text-4xl font-serif text-charcoal hidden md:block min-w-[240px] tracking-tighter">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate group-focus-within:text-forest transition-colors" />
                            <input
                                type="date"
                                value={format(currentDate, 'yyyy-MM-dd')}
                                onChange={(e) => { if (e.target.value) router.push(`?date=${e.target.value}`) }}
                                className="pl-12 pr-6 py-4 border border-border-grey rounded-lg text-[10px] font-bold bg-white text-charcoal outline-none focus:ring-1 focus:ring-forest transition-all cursor-pointer uppercase tracking-[0.2em]"
                                title="Select any specific date"
                            />
                        </div>
                        <div className="flex items-center bg-off-white rounded-lg p-1 border border-border-grey shadow-tight">
                            <button onClick={handlePrev} className="flex items-center gap-1.5 px-4 py-2 hover:bg-white rounded-md transition-all text-slate hover:text-charcoal text-[10px] font-bold uppercase tracking-widest" title="Previous">
                                <ChevronLeft className="w-3.5 h-3.5" /> PREV
                            </button>
                            <button onClick={handleToday} className="px-6 py-2 text-[10px] font-bold text-charcoal uppercase tracking-widest hover:bg-white rounded-md transition-all border-x border-border-grey mx-1" title="Go to Today">
                                TODAY
                            </button>
                            <button onClick={handleNext} className="flex items-center gap-1.5 px-4 py-2 hover:bg-white rounded-md transition-all text-slate hover:text-charcoal text-[10px] font-bold uppercase tracking-widest" title="Next">
                                NEXT <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* View Switcher */}
                        <div className="flex items-center bg-white rounded-lg p-1 border border-border-grey shadow-tight ml-4">
                            {(['day', 'week', 'month'] as const).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={clsx(
                                        "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
                                        view === v
                                            ? "bg-buttermilk text-burgundy shadow-tight"
                                            : "text-slate hover:text-burgundy hover:bg-off-white"
                                    )}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Row 2: Action Buttons — centered */}
                <div className="flex justify-center items-center gap-4 mt-6 relative z-10">
                    <button
                        onClick={() => { setAddMode('single'); setIsAddModalOpen(true); }}
                        className="btn-forest px-8 py-3 text-[10px] tracking-[0.2em]"
                    >
                        <Plus className="w-4 h-4" /> ADD SLOT
                    </button>
                    <button
                        onClick={() => { setAddMode('bulk'); setIsAddModalOpen(true); }}
                        className="h-12 border-2 border-charcoal text-charcoal bg-white px-8 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-charcoal hover:text-white transition-all flex items-center gap-3 shadow-tight active:scale-95"
                    >
                        <CalendarIcon className="w-4 h-4" /> RECURRING SCHEDULE
                    </button>
                </div>
            </div>



            {/* Calendar Grid */}
            <div className="bg-white border border-border-grey shadow-tight overflow-hidden rounded-[8px]">
                <div className="overflow-x-auto">
                    <div className={clsx("min-w-[900px]", view === 'month' && "min-w-0")}>
                        {view !== 'month' ? (
                            <div className={clsx("grid border-b border-border-grey bg-off-white", view === 'day' ? "grid-cols-[112px_1fr]" : "grid-cols-8")}>
                                <div className="p-6 text-[10px] font-black text-charcoal border-r border-border-grey sticky left-0 bg-white z-20 w-28 text-center uppercase tracking-[0.3em] flex items-center justify-center"></div>
                                {days.map(day => (
                                    <div key={day.toString()} className={clsx("p-6 text-center border-r border-border-grey last:border-r-0 min-w-[120px] transition-all", isSameDay(day, new Date()) ? "bg-forest/5" : "")}>
                                        <div className="text-[10px] text-slate font-black uppercase tracking-[0.3em] mb-2">{format(day, 'EEE')}</div>
                                        <div className={clsx("text-3xl font-serif tracking-tighter", isSameDay(day, new Date()) ? "text-forest" : "text-charcoal")}>{format(day, 'd')}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 border-b border-border-grey bg-off-white">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                                    <div key={d} className="p-4 text-center text-[10px] font-black text-slate uppercase tracking-[0.3em] border-r border-border-grey last:border-r-0">
                                        {d}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="divide-y divide-border-grey relative">
                            {view !== 'month' && (
                                <>
                                    {/* Current Time Indicator */}
                                    {(() => {
                                        if (currentTimePosition === null) return null
                                        const todayIdx = days.findIndex(day => isSameDay(day, new Date()))
                                        if (todayIdx === -1) return null

                                        return (
                                            <div
                                                className="absolute z-30 pointer-events-none flex items-center transition-all duration-1000"
                                                style={{
                                                    top: `${currentTimePosition}%`,
                                                    left: view === 'day' ? '112px' : `${(todayIdx + 1) * 12.5}%`,
                                                    width: view === 'day' ? 'calc(100% - 112px)' : '12.5%'
                                                }}
                                            >
                                                <div className="w-2.5 h-2.5 bg-burgundy rounded-full -ml-[5px] ring-2 ring-white shadow-sm" />
                                                <div className="h-[2px] w-full bg-burgundy shadow-[0_0_8px_rgba(67,48,46,0.3)]" />
                                            </div>
                                        )
                                    })()}

                                    {hours.map(hour => (
                                        <div key={hour} className={clsx("grid", view === 'day' ? "grid-cols-[112px_1fr]" : "grid-cols-8")} style={{ minHeight: `${ROW_HEIGHT}px` }}>
                                            <div className="p-4 text-[10px] text-slate font-black border-r border-border-grey text-center sticky left-0 bg-white z-20 w-28 flex items-center justify-center tracking-[0.2em]">
                                                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                            </div>

                                            {days.map(day => {
                                                const dayStr = toManilaDateStr(day)
                                                const dow = getDay(day)

                                                const startingSlots = [
                                                    ...(availabilityMap[`${dayStr}-${hour}`] || []),
                                                    ...(recurringMap[`${dow}-${hour}`] || [])
                                                ]

                                                const startingBookings = bookingMap[`${dayStr}-${hour}`] || []
                                                const isPastCell = isPast(setMinutes(setHours(day, hour + 1), 0))

                                                return (
                                                    <div key={day.toString() + hour} className={clsx("border-r border-border-grey last:border-r-0 relative group p-0", isPastCell && "bg-gray-50")} style={{ minHeight: `${ROW_HEIGHT}px` }}>
                                                        <div
                                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 bg-forest/5 cursor-pointer z-0"
                                                            onClick={() => {
                                                                setSingleDate(format(day, 'yyyy-MM-dd'))
                                                                setSingleTime(`${hour.toString().padStart(2, '0')}:00`)
                                                                setSingleEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`)
                                                                setAddMode('single')
                                                                setIsAddModalOpen(true)
                                                            }}
                                                        />
                                                        {(() => {
                                                            const groupedSlots = startingSlots.reduce((acc, slot) => {
                                                                const key = `${slot.start_time}-${slot.end_time}`
                                                                const shortLoc = slot.location_area.split(' - ')[0]

                                                                if (!acc[key]) {
                                                                    acc[key] = {
                                                                        primarySlot: slot,
                                                                        allSlots: [slot],
                                                                        locations: [slot.location_area],
                                                                        equipment: [...(slot.equipment || [])]
                                                                    }
                                                                } else {
                                                                    acc[key].allSlots.push(slot)
                                                                    if (!acc[key].locations.some(l => l.split(' - ')[0] === shortLoc)) {
                                                                        acc[key].locations.push(slot.location_area)
                                                                    }
                                                                    if (slot.equipment) {
                                                                        slot.equipment.forEach(eq => {
                                                                            if (!acc[key].equipment.includes(eq)) acc[key].equipment.push(eq)
                                                                        })
                                                                    }
                                                                }
                                                                return acc
                                                            }, {} as Record<string, { primarySlot: Availability, allSlots: Availability[], locations: string[], equipment: string[] }>)

                                                            return Object.values(groupedSlots).map(({ primarySlot: slot, allSlots, locations, equipment }) => {
                                                                const startMin = parseInt(slot.start_time.split(':')[1])
                                                                const [endH, endM] = slot.end_time.split(':').map(Number)
                                                                const startTotal = hour * 60 + startMin
                                                                const endTotal = endH * 60 + endM
                                                                const duration = endTotal - startTotal
                                                                const topOffset = (startMin / 60) * ROW_HEIGHT
                                                                const heightPx = (duration / 60) * ROW_HEIGHT

                                                                const isBooked = bookings.some(b => {
                                                                    const bSlot = b.slots;
                                                                    if (!bSlot?.date || !bSlot?.start_time || !bSlot?.end_time) return false;
                                                                    if (bSlot.date !== dayStr) return false;
                                                                    if (['pending', 'approved'].includes(b.status)) {
                                                                        const [bsh, bsm] = bSlot.start_time.split(':').map(Number);
                                                                        const [beh, bem] = bSlot.end_time.split(':').map(Number);
                                                                        const bStartTotal = bsh * 60 + bsm;
                                                                        const bEndTotal = beh * 60 + bem;
                                                                        return (startTotal < bEndTotal && endTotal > bStartTotal);
                                                                    }
                                                                    return false;
                                                                });

                                                                if (isBooked) return null;

                                                                const siblings = [
                                                                    ...Object.values(groupedSlots).map(g => g.primarySlot),
                                                                    ...startingBookings.map(sb => sb.slots)
                                                                ].filter(s => {
                                                                    if (!s || !s.start_time) return false;
                                                                    const [sh, sm] = s.start_time.split(':').map(Number);
                                                                    const [eh, em] = s.end_time.split(':').map(Number);
                                                                    const sStart = sh * 60 + sm;
                                                                    const sEnd = eh * 60 + em;
                                                                    return (startTotal < sEnd && endTotal > sStart);
                                                                });

                                                                const totalItems = siblings.length;
                                                                const myIdx = siblings.findIndex(s => s.id === slot.id);
                                                                const primaryEq = equipment.length > 0 ? equipment[0] : null;
                                                                const extraEqCount = equipment.length > 1 ? equipment.length - 1 : 0;

                                                                return (
                                                                    <div
                                                                        key={slot.id}
                                                                        className={clsx(
                                                                            "absolute rounded-lg text-[10px] hover:shadow-card hover:scale-[1.01] transition-all duration-300 cursor-pointer overflow-hidden border z-10 p-4 group/slot flex flex-col gap-3 session-block-earth",
                                                                            isPastCell
                                                                                ? "bg-off-white border-border-grey text-slate"
                                                                                : "bg-green-50/50 border-green-200 text-green-900",
                                                                            duration < 45 && "py-2 px-4 justify-center"
                                                                        )}
                                                                        style={{
                                                                            top: `${topOffset}px`,
                                                                            height: `${heightPx}px`,
                                                                            width: totalItems > 1 ? `${(100 / totalItems) - 2}%` : '96%',
                                                                            left: totalItems > 1 ? `${(myIdx * 100) / totalItems + 1}%` : '2%'
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setEditingSlot(slot); setSingleDate(slot.date || format(day, 'yyyy-MM-dd')); setSingleTime(slot.start_time); setSingleEndTime(slot.end_time); setLocations(locations); setEquipment(equipment.length > 0 ? equipment : ['Reformer']); setIsEditModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <div className={clsx("flex items-center gap-2", duration < 45 ? "flex-row" : "flex-col items-start")}>
                                                                            <div className="flex items-center gap-2 font-bold text-[10px] text-charcoal uppercase tracking-[0.2em] shrink-0">
                                                                                <Clock className={clsx(duration < 45 ? "w-3 h-3" : "w-4 h-4", isPastCell ? "text-slate/30" : "text-forest")} />
                                                                                <span className={isPastCell ? "text-slate" : "text-charcoal"}>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                                                            </div>

                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                {locations.map((loc, idx) => (
                                                                                    <div key={loc + idx} className="text-[9px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 bg-pastel-blue text-burgundy px-3 py-1 rounded-md border border-pastel-blue/20">
                                                                                        <MapPin className="w-3 h-3 text-burgundy/40" />
                                                                                        <span className="truncate max-w-[100px]">{loc.split(' - ')[0]}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>

                                                                        </div>
                                                                    </div>
                                                                )
                                                            })
                                                        })()}

                                                        {startingBookings.map((booking) => {
                                                            const slotData = booking.slots;
                                                            const [s_startH, s_startM] = slotData.start_time.split(':').map(Number);
                                                            const [s_endH, s_endM] = slotData.end_time.split(':').map(Number);
                                                            const startTotal = s_startH * 60 + s_startM;
                                                            const endTotal = s_endH * 60 + s_endM;
                                                            const duration = endTotal - startTotal;
                                                            const topOffset = (s_startM / 60) * ROW_HEIGHT;
                                                            const heightPx = (duration / 60) * ROW_HEIGHT;

                                                            const studioName = slotData.studios?.name || 'Partner Studio';
                                                            const clientName = booking.client?.full_name || 'Anonymous Client';

                                                            const siblings = [
                                                                ...startingSlots.filter(s => {
                                                                    const isBooked = bookings.some(b => {
                                                                        const bSlot = b.slots;
                                                                        if (!bSlot?.date || !bSlot?.start_time || !bSlot?.end_time) return false;
                                                                        if (bSlot.date !== dayStr) return false;
                                                                        if (['pending', 'approved'].includes(b.status)) {
                                                                            const [bsh, bsm] = bSlot.start_time.split(':').map(Number);
                                                                            const [beh, bem] = bSlot.end_time.split(':').map(Number);
                                                                            const bStart = bsh * 60 + bsm; const bEnd = beh * 60 + bem;
                                                                            const [ssh, ssm] = s.start_time.split(':').map(Number);
                                                                            const [seh, sem] = s.end_time.split(':').map(Number);
                                                                            const sStart = ssh * 60 + ssm; const sEnd = seh * 60 + sem;
                                                                            return (sStart < bEnd && sEnd > bStart);
                                                                        }
                                                                        return false;
                                                                    });
                                                                    return !isBooked;
                                                                }),
                                                                ...startingBookings.map(sb => sb.slots)
                                                            ].filter(s => {
                                                                if (!s || !s.start_time) return false;
                                                                const [sh, sm] = s.start_time.split(':').map(Number);
                                                                const [eh, em] = s.end_time.split(':').map(Number);
                                                                const sStart = sh * 60 + sm;
                                                                const sEnd = eh * 60 + em;
                                                                return (startTotal < sEnd && endTotal > sStart);
                                                            });

                                                            const totalItems = siblings.length;
                                                            const myIdx = siblings.findIndex(s => s.id === booking.slot_id);

                                                            return (
                                                                <div
                                                                    key={booking.id}
                                                                    className={clsx(
                                                                        "absolute rounded-lg text-[10px] bg-buttermilk border border-burgundy/10 z-20 p-5 overflow-hidden transition-all duration-300 hover:scale-[1.03] cursor-pointer group/booking flex flex-col shadow-tight",
                                                                        isPastCell
                                                                            ? "bg-off-white text-slate/40"
                                                                            : booking.status === 'approved'
                                                                                ? "border-l-4 border-l-burgundy"
                                                                                : "border-l-4 border-l-orange-400",
                                                                        duration < 45 && "flex-row items-center gap-4 py-2 px-4"
                                                                    )}
                                                                    style={{
                                                                        top: `${topOffset}px`,
                                                                        height: `${heightPx}px`,
                                                                        width: totalItems > 1 ? `${(100 / totalItems) - 2}%` : '96%',
                                                                        left: totalItems > 1 ? `${(myIdx * 100) / totalItems + 1}%` : '2%'
                                                                    }}
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedBooking(booking); }}
                                                                >
                                                                    {duration < 45 ? (
                                                                        <div className="flex flex-col justify-center">
                                                                            <div className={clsx(
                                                                                "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md w-fit mb-1",
                                                                                booking.status === 'approved' ? "text-forest bg-green-50" : "text-orange-700 bg-orange-50 border border-orange-100"
                                                                            )}>
                                                                                {booking.status === 'approved' ? 'BOOKED' : 'PENDING'}
                                                                            </div>
                                                                            <div className="text-[9px] font-bold text-charcoal truncate">{studioName}</div>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <div className={clsx(
                                                                                    "status-pill-earth inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold transition-all",
                                                                                    booking.status === 'approved' ? "bg-burgundy text-buttermilk" : "bg-orange-50 text-orange-700 border-orange-100 shadow-sm"
                                                                                )}>
                                                                                    {booking.status === 'approved' ? 'BOOKED' : 'PENDING'}
                                                                                </div>
                                                                                <ArrowUpRight className="w-4 h-4 text-slate/20 group-hover/booking:text-charcoal transition-all" />
                                                                            </div>
                                                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal mb-2 flex items-center gap-2.5">
                                                                                <MapPin className="w-4 h-4 text-slate/40" />
                                                                                <span className="truncate">{studioName}</span>
                                                                            </div>
                                                                            <div className="text-[10px] font-medium text-slate italic flex items-center gap-2.5 mt-auto">
                                                                                <User className="w-4 h-4 text-slate/40" />
                                                                                <span className="truncate">{clientName}</span>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ))}
                                </>
                            )}

                            {view === 'month' && (
                                <div className="grid grid-cols-7 divide-x divide-y divide-border-grey">
                                    {days.map((day) => {
                                        const dayStr = toManilaDateStr(day);
                                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                                        const daySessions = availability.filter(a => a.date === dayStr);
                                        const dayRecurring = availability.filter(a => !a.date && a.day_of_week === getDay(day));

                                        // Deduplicate sessions for display (one per time block/location)
                                        const allDaySessions = [...daySessions, ...dayRecurring].sort((a, b) => a.start_time.localeCompare(b.start_time));
                                        const uniqueSessions = allDaySessions.reduce((acc, current) => {
                                            const time = current.start_time.slice(0, 5);
                                            const loc = current.location_area.split(' - ')[0];
                                            const key = `${time}-${loc}`;
                                            if (!acc.some((s: any) => s.key === key)) {
                                                acc.push({ ...current, key });
                                            }
                                            return acc;
                                        }, [] as any[]);

                                        const displaySessionsCount = uniqueSessions.length;

                                        return (
                                            <div
                                                key={day.toString()}
                                                className={clsx(
                                                    "min-h-[140px] p-4 transition-all hover:bg-forest/5 cursor-pointer",
                                                    !isCurrentMonth && "bg-off-white opacity-40",
                                                    isSameDay(day, new Date()) && "bg-forest/5"
                                                )}
                                                onClick={() => {
                                                    setSingleDate(dayStr);
                                                    setView('day');
                                                }}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className={clsx(
                                                        "text-xs font-serif font-bold",
                                                        isSameDay(day, new Date()) ? "text-forest" : "text-charcoal"
                                                    )}>
                                                        {format(day, 'd')}
                                                    </span>
                                                    {displaySessionsCount > 0 && (
                                                        <span className="bg-forest/10 text-forest text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                                                            {displaySessionsCount} {displaySessionsCount === 1 ? 'Slot' : 'Slots'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    {uniqueSessions.slice(0, 3).map((s: any) => (
                                                        <div key={s.key} className="text-[8px] font-bold text-slate truncate uppercase tracking-tighter">
                                                            • {s.start_time.slice(0, 5)} {s.location_area.split(' - ')[0]}
                                                        </div>
                                                    ))}
                                                    {displaySessionsCount > 3 && (
                                                        <div className="text-[8px] font-black text-forest uppercase tracking-widest pt-1">
                                                            + {displaySessionsCount - 3} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Single Slot Add Modal */}
            {
                isAddModalOpen && addMode === 'single' && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-charcoal/40 animate-in fade-in duration-300"
                        onClick={() => setIsAddModalOpen(false)}
                    >
                        <div
                            className="bg-white rounded-xl p-12 max-w-2xl w-full shadow-card border border-border-grey animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh] will-change-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-12">
                                <div>
                                    <h3 className="text-3xl font-serif text-charcoal tracking-tighter">
                                        Add Time Slot
                                    </h3>
                                    <p className="text-[10px] text-slate font-bold uppercase tracking-[0.4em] mt-2">
                                        DEFINE A SINGLE SESSION TIME AND LOCATION
                                    </p>
                                </div>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-4 bg-off-white hover:bg-white rounded-lg text-slate hover:text-charcoal transition-all border border-border-grey shadow-tight">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSingle} className="space-y-6">
                                <div className="earth-card p-6 space-y-6 bg-off-white border border-border-grey shadow-tight">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">Calendar Date</label>
                                        <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-5 py-4 border border-border-grey rounded-lg bg-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-widest cursor-pointer" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">Start Time</label>
                                            <input name="startTime" type="time" required value={singleTime} onChange={(e) => setSingleTime(e.target.value)} className="w-full px-5 py-4 border border-border-grey rounded-lg bg-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-widest cursor-pointer" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">End Time</label>
                                            <input name="endTime" type="time" required value={singleEndTime} onChange={(e) => setSingleEndTime(e.target.value)} className="w-full px-5 py-4 border border-border-grey rounded-lg bg-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-widest cursor-pointer" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] ml-2">Geographic Deployment</h4>
                                    <div className="space-y-3">
                                        {Object.entries(GROUPED_AREAS).map(([city, cityLocations]) => {
                                            const selectedInCity = cityLocations.filter(loc => locations.includes(loc));
                                            const allSelected = selectedInCity.length === cityLocations.length;
                                            const isExpanded = expandedCities.includes(city);

                                            return (
                                                <div key={city} className="earth-card overflow-hidden bg-white border border-border-grey shadow-tight">
                                                    {/* Accordion Header */}
                                                    <div
                                                        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-off-white transition-all border-b border-border-grey/30"
                                                        onClick={() => toggleCityAccordion(city)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">{city}</span>
                                                            {selectedInCity.length > 0 && (
                                                                <span className="text-[9px] font-bold text-[#4B5563] bg-[#F3F4F6] px-2.5 py-1 rounded-full uppercase tracking-widest border border-gray-200">
                                                                    {selectedInCity.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-6 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleCityGroup(cityLocations);
                                                                }}
                                                                className="text-[9px] font-bold text-slate hover:text-charcoal transition-colors uppercase tracking-[0.2em] underline decoration-slate/20 underline-offset-8 whitespace-nowrap"
                                                            >
                                                                {allSelected ? 'DESELECT' : 'SELECT ALL'}
                                                            </button>
                                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate flex-shrink-0" />}
                                                        </div>
                                                    </div>

                                                    {/* Accordion Content */}
                                                    {isExpanded && (
                                                        <div className="px-6 py-6 bg-off-white/40 animate-in slide-in-from-top-2 duration-300">
                                                            <div className="grid grid-cols-1 gap-y-4">
                                                                {cityLocations.map(area => {
                                                                    const isSelected = locations.includes(area);
                                                                    const displayName = area.split(' - ')[1] || area;
                                                                    return (
                                                                        <div
                                                                            key={area}
                                                                            onClick={() => toggleLocation(area)}
                                                                            className="flex items-center gap-4 cursor-pointer group/loc"
                                                                        >
                                                                            <div className={clsx(
                                                                                "w-5 h-5 rounded border flex items-center justify-center transition-all duration-300",
                                                                                isSelected
                                                                                    ? "bg-forest border-forest text-white"
                                                                                    : "bg-white border-border-grey group-hover/loc:border-forest/50"
                                                                            )}>
                                                                                {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                                                                            </div>
                                                                            <span className={clsx(
                                                                                "text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300",
                                                                                isSelected ? "text-charcoal" : "text-slate group-hover/loc:text-forest"
                                                                            )}>
                                                                                {displayName}
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] ml-2">Equipment</h4>
                                    <div className="flex flex-wrap gap-2.5 p-5 bg-off-white rounded-xl border border-border-grey shadow-tight">
                                        {['Reformer', 'Tower', 'Cadillac', 'Chair', 'Mat', 'Barre'].map(eq => {
                                            const isSelected = equipment.includes(eq);
                                            return (
                                                <button
                                                    key={eq}
                                                    type="button"
                                                    onClick={() => toggleEquipment(eq)}
                                                    className={clsx(
                                                        "px-5 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all duration-300 border",
                                                        isSelected
                                                            ? "bg-forest text-white border-forest shadow-tight"
                                                            : "bg-white text-slate border-border-grey hover:border-forest/30 hover:text-forest shadow-sm"
                                                    )}
                                                >
                                                    {eq}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-6 pt-10">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 bg-charcoal text-white py-5 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-tight active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'PROCESSING...' : 'CONFIRM SLOT'}
                                    </button>
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-12 py-5 rounded-lg text-[10px] font-bold text-slate uppercase tracking-[0.3em] hover:text-charcoal hover:bg-off-white transition-all border border-transparent hover:border-border-grey">
                                        CANCEL
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Bulk Generate Modal */}
            {
                isAddModalOpen && addMode === 'bulk' && (
                    <div
                        className="fixed inset-0 z-[200] flex items-start justify-center p-6 bg-charcoal/40 overflow-y-auto animate-in fade-in duration-300"
                        onClick={() => setIsAddModalOpen(false)}
                    >
                        <div
                            className="bg-white rounded-xl p-10 max-w-3xl w-full shadow-card border border-border-grey animate-in zoom-in-95 duration-500 my-8 will-change-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-3xl font-serif text-charcoal tracking-tighter">Recurring Schedule</h3>
                                    <p className="text-[10px] text-slate font-bold uppercase tracking-[0.4em] mt-2">SET UP YOUR WEEKLY AVAILABILITY</p>
                                </div>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-4 bg-off-white hover:bg-white rounded-lg text-slate hover:text-charcoal transition-all border border-border-grey shadow-tight">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <InstructorScheduleGenerator initialAvailability={[]} />
                        </div>
                    </div>
                )
            }

            {/* Edit Modal */}
            {
                isEditModalOpen && editingSlot && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-charcoal/40 animate-in fade-in duration-300"
                        onClick={() => setIsEditModalOpen(false)}
                    >
                        <div
                            className="bg-white rounded-xl p-12 max-w-2xl w-full shadow-card border border-border-grey animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh] will-change-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-12">
                                <div>
                                    <h3 className="text-3xl font-serif text-charcoal tracking-tighter">Edit Slot</h3>
                                    <p className="text-[10px] text-slate font-bold uppercase tracking-[0.4em] mt-2">UPDATE SESSION TIME OR LOCATION</p>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-4 bg-off-white hover:bg-white rounded-lg text-slate hover:text-charcoal transition-all border border-border-grey shadow-tight">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="earth-card p-6 space-y-6 bg-off-white border border-border-grey shadow-tight">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">Date</label>
                                        <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-5 py-4 border border-border-grey rounded-lg bg-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-widest cursor-pointer" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">Start Time</label>
                                            <input name="startTime" type="time" required value={singleTime} onChange={(e) => setSingleTime(e.target.value)} className="w-full px-5 py-4 border border-border-grey rounded-lg bg-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-widest cursor-pointer" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">End Time</label>
                                            <input name="endTime" type="time" required value={singleEndTime} onChange={(e) => setSingleEndTime(e.target.value)} className="w-full px-5 py-4 border border-border-grey rounded-lg bg-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-widest cursor-pointer" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] ml-2">Geographic Deployment</h4>
                                    <div className="space-y-3">
                                        {Object.entries(GROUPED_AREAS).map(([city, cityLocations]) => {
                                            const selectedInCity = cityLocations.filter(loc => locations.includes(loc));
                                            const allSelected = selectedInCity.length === cityLocations.length;
                                            const isExpanded = expandedCities.includes(city);

                                            return (
                                                <div key={city} className="earth-card overflow-hidden bg-white border border-border-grey shadow-tight">
                                                    {/* Accordion Header */}
                                                    <div
                                                        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-off-white transition-all border-b border-border-grey/30"
                                                        onClick={() => toggleCityAccordion(city)}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">{city}</span>
                                                            {selectedInCity.length > 0 && (
                                                                <span className="text-[9px] font-bold text-[#4B5563] bg-[#F3F4F6] px-2.5 py-1 rounded-full uppercase tracking-widest border border-gray-200">
                                                                    {selectedInCity.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-6 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleCityGroup(cityLocations);
                                                                }}
                                                                className="text-[9px] font-bold text-slate hover:text-charcoal transition-colors uppercase tracking-[0.2em] underline decoration-slate/20 underline-offset-8 whitespace-nowrap"
                                                            >
                                                                {allSelected ? 'DESELECT' : 'SELECT ALL'}
                                                            </button>
                                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-slate flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate flex-shrink-0" />}
                                                        </div>
                                                    </div>

                                                    {/* Accordion Content */}
                                                    {isExpanded && (
                                                        <div className="px-6 py-6 bg-off-white/40 animate-in slide-in-from-top-2 duration-300">
                                                            <div className="grid grid-cols-1 gap-y-4">
                                                                {cityLocations.map(area => {
                                                                    const isSelected = locations.includes(area);
                                                                    const displayName = area.split(' - ')[1] || area;
                                                                    return (
                                                                        <div
                                                                            key={area}
                                                                            onClick={() => toggleLocation(area)}
                                                                            className="flex items-center gap-4 cursor-pointer group/loc"
                                                                        >
                                                                            <div className={clsx(
                                                                                "w-5 h-5 rounded border flex items-center justify-center transition-all duration-300",
                                                                                isSelected
                                                                                    ? "bg-forest border-forest text-white"
                                                                                    : "bg-white border-border-grey group-hover/loc:border-forest/50"
                                                                            )}>
                                                                                {isSelected && <CheckCircle className="w-3.5 h-3.5" />}
                                                                            </div>
                                                                            <span className={clsx(
                                                                                "text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300",
                                                                                isSelected ? "text-charcoal" : "text-slate group-hover/loc:text-forest"
                                                                            )}>
                                                                                {displayName}
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] ml-2">Equipment</label>
                                    <div className="flex flex-wrap gap-2.5 p-5 bg-off-white rounded-xl border border-border-grey shadow-tight">
                                        {['Reformer', 'Tower', 'Cadillac', 'Chair', 'Mat', 'Barre'].map(eq => {
                                            const isSelected = equipment.includes(eq);
                                            return (
                                                <button
                                                    key={eq}
                                                    type="button"
                                                    onClick={() => toggleEquipment(eq)}
                                                    className={clsx(
                                                        "px-5 py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all duration-300 border",
                                                        isSelected
                                                            ? "bg-forest text-white border-forest shadow-tight"
                                                            : "bg-white text-slate border-border-grey hover:border-forest/30 hover:text-forest shadow-sm"
                                                    )}
                                                >
                                                    {eq}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-6 pt-12 border-t border-border-grey">
                                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-charcoal text-white py-5 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-tight active:scale-95 disabled:opacity-50">
                                        {isSubmitting ? 'SAVING...' : 'UPDATE SLOT'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditModalOpen(false)
                                            handleDelete(editingSlot.id, editingSlot.group_id)
                                        }}
                                        disabled={isSubmitting}
                                        className="px-10 py-5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-red-100 transition-all flex items-center justify-center gap-3 border border-red-200"
                                    >
                                        <Trash2 className="w-5 h-5" /> DELETE
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Booking Detail Modal */}
            {
                selectedBooking && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-charcoal/40 animate-in fade-in duration-300"
                        onClick={() => setSelectedBooking(null)}
                    >
                        <div
                            className="bg-white rounded-xl w-full max-w-2xl shadow-card overflow-hidden animate-in zoom-in-95 duration-500 border border-border-grey will-change-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className={clsx(
                                "px-12 py-12 flex justify-between items-center text-charcoal relative border-b border-border-grey",
                                selectedBooking.status === 'approved' ? "bg-green-50" : "bg-orange-50"
                            )}>
                                <div className="relative z-10">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate/40 mb-3 block">
                                        {selectedBooking.status === 'approved' ? 'RESERVATION CONFIRMED' : 'RESERVATION PENDING'}
                                    </span>
                                    <h3 className="text-4xl font-serif tracking-tighter">
                                        {selectedBooking.status === 'approved' ? 'Session Locked' : 'Verification Required'}
                                    </h3>
                                </div>
                                <button onClick={() => setSelectedBooking(null)} className="p-5 bg-white hover:bg-off-white rounded-lg transition-all relative z-10 border border-border-grey shadow-tight">
                                    <X className="w-6 h-6 text-slate/40 hover:text-charcoal" />
                                </button>
                                {/* Decorative background circle */}
                                <div className="absolute top-0 right-0 w-80 h-80 bg-white/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                            </div>

                            <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar bg-white">
                                {/* Session Metadata */}
                                <div className="earth-card p-8 bg-off-white border border-border-grey shadow-tight">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-green-100 rounded-lg">
                                            <Clock className="w-6 h-6 text-forest" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Session Schedule</p>
                                            <p className="text-lg font-serif mt-0.5 text-charcoal">
                                                {format(new Date(selectedBooking.slots.date), 'PPPP')}
                                            </p>
                                            <p className="text-xs font-bold text-slate uppercase tracking-widest mt-1">
                                                <span className="font-serif italic text-sm">{selectedBooking.slots.start_time.slice(0, 5)}</span> — <span className="font-serif italic text-sm">{selectedBooking.slots.end_time.slice(0, 5)}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Studio Environment */}
                                    <div className="earth-card p-8 bg-white border border-border-grey shadow-tight group">
                                        <div className="flex items-center gap-6 mb-6">
                                            <div className="p-4 bg-off-white rounded-lg group-hover:bg-off-white transition-all border border-border-grey shadow-tight">
                                                <MapPin className="w-6 h-6 text-forest" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate uppercase tracking-[0.3em]">Studio</p>
                                                <h4 className="font-serif text-charcoal text-xl tracking-tighter truncate w-[200px]">{selectedBooking.slots.studios?.name}</h4>
                                            </div>
                                        </div>
                                        <div className="space-y-3 mt-4">
                                            <p className="text-[11px] text-slate leading-relaxed italic">{selectedBooking.slots.studios?.location || 'Location details within secure perimeter'}</p>
                                            <p className="text-[10px] font-bold text-slate uppercase tracking-[0.3em]">{selectedBooking.slots.studios?.email}</p>
                                        </div>
                                    </div>

                                    {/* Client Information */}
                                    <div className="earth-card p-8 bg-white border border-border-grey shadow-tight group">
                                        <div className="flex items-center gap-6 mb-6">
                                            <div className="w-16 h-16 rounded-lg bg-off-white overflow-hidden border border-border-grey flex-shrink-0 shadow-tight">
                                                <img
                                                    src={selectedBooking.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBooking.client?.full_name || 'C')}&background=F5F5F5&color=333333`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-slate uppercase tracking-[0.3em]">Client</p>
                                                <h4 className="font-serif text-charcoal text-xl tracking-tighter truncate w-[200px]">{selectedBooking.client?.full_name}</h4>
                                            </div>
                                        </div>
                                        <div className="space-y-3 mt-4">
                                            {selectedBooking.client?.phone && (
                                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate uppercase tracking-[0.3em]">
                                                    <MessageSquare className="w-4 h-4 text-slate/20" />
                                                    {selectedBooking.client.phone}
                                                </div>
                                            )}
                                            <p className="text-[10px] font-bold text-slate uppercase tracking-[0.3em]">{selectedBooking.client?.email}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Medical / Status */}
                                {selectedBooking.client?.medical_conditions && (
                                    <div className="p-8 bg-red-50 rounded-lg border border-red-100">
                                        <div className="flex items-center gap-3 mb-4">
                                            <AlertTriangle className="w-5 h-5 text-red-500" />
                                            <h4 className="text-[10px] font-bold text-red-700 uppercase tracking-[0.2em]">PHYSICAL CONDITIONS</h4>
                                        </div>
                                        <p className="text-[11px] text-red-600 italic leading-relaxed">
                                            {Array.isArray(selectedBooking.client.medical_conditions)
                                                ? selectedBooking.client.medical_conditions.join(', ')
                                                : selectedBooking.client.medical_conditions.split(',').join(', ')}
                                        </p>
                                    </div>
                                )}

                                {/* Booking Specifics */}
                                <div className="earth-card p-8 space-y-6 bg-white border border-border-grey shadow-tight">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-off-white flex items-center justify-center border border-border-grey shadow-tight">
                                                <Box className="w-6 h-6 text-[#4B5563]" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-bold text-slate uppercase tracking-[0.3em] block">Equipment</span>
                                                <span className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em]">
                                                    {selectedBooking.price_breakdown?.equipment || 'Standard Set'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate uppercase tracking-[0.3em] block">Earnings</span>
                                            <span className="text-2xl font-serif text-forest tracking-tighter">₱{(selectedBooking.price_breakdown?.instructor_fee || 0).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {selectedBooking.notes && (
                                        <div className="pt-6 border-t border-border-grey">
                                            <span className="text-[10px] font-bold text-slate uppercase tracking-wider block mb-2">Session Notes</span>
                                            <p className="text-sm text-slate italic leading-relaxed">"{selectedBooking.notes}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-12 py-10 bg-off-white border-t border-border-grey flex gap-6">
                                <button
                                    onClick={() => setActiveChat({
                                        id: selectedBooking.id,
                                        recipientId: selectedBooking.client_id,
                                        name: selectedBooking.client?.full_name || 'Client'
                                    })}
                                    className="flex-1 bg-charcoal text-white py-5 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] shadow-tight hover:brightness-[1.2] active:scale-95 transition-all flex items-center justify-center gap-4"
                                >
                                    <MessageSquare className="w-5 h-5" /> MESSAGE CLIENT
                                </button>
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="px-12 py-5 bg-white text-slate hover:text-charcoal rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] transition-all border border-border-grey"
                                >
                                    CLOSE
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeChat && (
                    <ChatWindow
                        bookingId={activeChat.id}
                        recipientId={activeChat.recipientId}
                        recipientName={activeChat.name}
                        onClose={() => setActiveChat(null)}
                        currentUserId={currentUserId}
                        isExpired={false}
                        isOpen={true}
                    />
                )
            }
        </div >
    )
}
