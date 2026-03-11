'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, setHours, setMinutes, getDay, parse, differenceInMinutes, isPast, addDays, subDays, startOfMonth, endOfMonth, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Trash2, MapPin, X, User, Box, ArrowUpRight, MessageSquare, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, Check, Pencil, Copy } from 'lucide-react'
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
    const [selectedProfile, setSelectedProfile] = useState<any>(null)
    const [selectedStudio, setSelectedStudio] = useState<any>(null)
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
    const { availabilityMap, recurringMap, bookingMap, historyMap } = useMemo(() => {
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

        const calendarBookings = bookings.filter(b => {
            const slot = b.slots
            return slot?.date && ['approved', 'completed', 'pending'].includes(b.status)
        })

        const historicalBookings = bookings.filter(b => {
            const slot = b.slots
            return slot?.date && ['cancelled_refunded', 'cancelled_charged', 'rejected'].includes(b.status)
        })

        calendarBookings.forEach(b => {
            const slot = b.slots
            if (!slot?.date || !slot?.start_time) return
            const startH = parseInt(slot.start_time.split(':')[0])
            const key = `${slot.date}-${startH}`
            if (!bMap[key]) bMap[key] = []
            bMap[key].push(b)
        })

        const hMap: Record<string, any[]> = {}
        historicalBookings.forEach(b => {
            const slot = b.slots
            if (!slot?.date || !slot?.start_time) return
            const startH = parseInt(slot.start_time.split(':')[0])
            const key = `${slot.date}-${startH}`
            if (!hMap[key]) hMap[key] = []
            hMap[key].push(b)
        })

        return { availabilityMap: aMap, recurringMap: rMap, bookingMap: bMap, historyMap: hMap }
    }, [availability, bookings])

    // Helper functions
    const calculateAge = (dob: string) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    // Scroll Lock for all modals
    useEffect(() => {
        const anyModalOpen = isAddModalOpen || selectedBooking || activeChat || selectedProfile || selectedStudio;
        if (anyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isAddModalOpen, selectedBooking, activeChat, selectedProfile, selectedStudio]);

    const getSlotDateTime = (date: string | undefined, time: string | undefined) => {
        if (!date || !time) return new Date(0)
        return new Date(`${date}T${time}+08:00`)
    }

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
    const [currentSlotHistory, setCurrentSlotHistory] = useState<any[]>([])

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
                        className="h-12 border-2 border-burgundy text-burgundy bg-white px-8 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-burgundy/5 transition-all flex items-center gap-3 shadow-tight active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> ADD SLOT
                    </button>
                    <button
                        onClick={() => { setAddMode('bulk'); setIsAddModalOpen(true); }}
                        className="px-8 py-3 text-[10px] tracking-[0.2em] bg-burgundy text-buttermilk rounded-lg font-bold flex items-center gap-3 hover:brightness-110 shadow-tight active:scale-95 transition-all"
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
                                                <div className="w-[12px] h-[12px] bg-burgundy rounded-full -ml-[6px] ring-2 ring-white shadow-sm" />
                                                <div className="h-[3px] w-full bg-burgundy shadow-[0_0_12px_rgba(67,48,46,0.4)]" />
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

                                                // --- LAYOUT LOGIC REFACTOR ---
                                                // 1. Group availability slots by time range (ignoring location differences for the card)
                                                const groupedByTime = startingSlots.reduce((acc, slot) => {
                                                    const key = `${slot.start_time.slice(0, 5)}-${slot.end_time.slice(0, 5)}`
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

                                                // 2. Determine which grouped slots are NOT booked
                                                const visibleSlots = Object.values(groupedByTime).filter(group => {
                                                    const slot = group.primarySlot;
                                                    const [sh, sm] = slot.start_time.split(':').map(Number);
                                                    const [eh, em] = slot.end_time.split(':').map(Number);
                                                    const sStart = sh * 60 + sm;
                                                    const sEnd = eh * 60 + em;

                                                    return !bookings.some(b => {
                                                        const bSlot = b.slots;
                                                        if (!bSlot?.date || !bSlot?.start_time || !bSlot?.end_time || bSlot.date !== dayStr) return false;
                                                        if (!['pending', 'approved', 'completed'].includes(b.status)) return false;
                                                        const [bsh, bsm] = bSlot.start_time.split(':').map(Number);
                                                        const [beh, bem] = bSlot.end_time.split(':').map(Number);
                                                        return (sStart < (beh * 60 + bem) && sEnd > (bsh * 60 + bsm));
                                                    });
                                                });

                                                // 3. Combine with starting bookings to get ALL visible items in this cell block
                                                const allVisibleItems = [
                                                    ...visibleSlots.map(g => ({ type: 'slot' as const, id: g.primarySlot.id, data: g, start: g.primarySlot.start_time, end: g.primarySlot.end_time })),
                                                    ...startingBookings.map(b => ({ type: 'booking' as const, id: b.id, data: b, start: b.slots.start_time, end: b.slots.end_time }))
                                                ];

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

                                                        {allVisibleItems.map((item) => {
                                                            const [sh, sm] = item.start.split(':').map(Number);
                                                            const [eh, em] = item.end.split(':').map(Number);
                                                            const startTotal = sh * 60 + sm;
                                                            const endTotal = eh * 60 + em;
                                                            const duration = endTotal - startTotal;
                                                            const topOffset = ((sh % 24 === hour ? sm : 0) / 60) * ROW_HEIGHT;
                                                            const heightPx = (duration / 60) * ROW_HEIGHT;

                                                            // Find items that visibly overlap with THIS block to determine width/split
                                                            const siblings = allVisibleItems.filter(other => {
                                                                const [osh, osm] = other.start.split(':').map(Number);
                                                                const [oeh, oem] = other.end.split(':').map(Number);
                                                                const oStart = osh * 60 + osm;
                                                                const oEnd = oeh * 60 + oem;
                                                                return (startTotal < oEnd && endTotal > oStart);
                                                            });

                                                            const totalItems = siblings.length;
                                                            const myIdx = siblings.findIndex(s => s.id === item.id);
                                                            const widthPercent = totalItems > 1 ? (100 / totalItems) : 100;
                                                            const leftPercent = totalItems > 1 ? (myIdx * 100 / totalItems) : 0;

                                                            if (item.type === 'slot') {
                                                                const { primarySlot: slot, locations, equipment } = item.data;
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
                                                                            width: `${widthPercent - 2}%`,
                                                                            left: `${leftPercent + 1}%`
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setEditingSlot(slot);
                                                                            setSingleDate(slot.date || format(day, 'yyyy-MM-dd'));
                                                                            setSingleTime(slot.start_time);
                                                                            setSingleEndTime(slot.end_time);
                                                                            setLocations(locations);
                                                                            setEquipment(equipment.length > 0 ? equipment : ['Reformer']);
                                                                            setCurrentSlotHistory(historyMap[`${dayStr}-${hour}`] || []);
                                                                            setIsEditModalOpen(true);
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
                                                            } else {
                                                                const booking = item.data;
                                                                const slotData = booking.slots;
                                                                const studioName = slotData.studios?.name || 'Partner Studio';

                                                                return (
                                                                    <div
                                                                        key={booking.id}
                                                                        className={clsx(
                                                                            "absolute rounded-lg text-[10px] z-20 p-4 overflow-hidden transition-all duration-300 hover:scale-[1.03] cursor-pointer group/booking flex flex-col shadow-tight border border-[#43302E]/10 bg-white",
                                                                            duration < 45 && "flex-row items-center justify-between py-2 px-3"
                                                                        )}
                                                                        style={{
                                                                            top: `${topOffset}px`,
                                                                            height: `${heightPx}px`,
                                                                            width: `${widthPercent - 2}%`,
                                                                            left: `${leftPercent + 1}%`
                                                                        }}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const slot = booking.slots;
                                                                            const startH = parseInt(slot.start_time.split(':')[0]);
                                                                            setCurrentSlotHistory(historyMap[`${slot.date}-${startH}`] || []);
                                                                            setSelectedBooking(booking);
                                                                        }}
                                                                    >
                                                                        <div className={clsx("flex justify-between items-start w-full", duration < 45 && "items-center")}>
                                                                            <div className="flex flex-col min-w-0">
                                                                                <span className="text-[10px] font-bold text-[#43302E] uppercase tracking-widest truncate">
                                                                                    {booking.client?.full_name || booking.price_breakdown?.equipment || 'Standard session'}
                                                                                </span>
                                                                                {duration >= 45 && (
                                                                                    <span className="text-[8px] font-medium text-[#43302E]/60 uppercase tracking-tighter mt-0.5 truncate">
                                                                                        {studioName}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[9px] font-black text-[#43302E] bg-buttermilk/40 px-1.5 py-0.5 rounded border border-[#43302E]/5 whitespace-nowrap">
                                                                                {booking.quantity || 1}/{booking.quantity || 1}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            }
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

                                        // 1. Get all availability entries ("The Plan")
                                        const dayAvailability = availability.filter(a => a.date === dayStr);
                                        const dayRecurring = availability.filter(a => !a.date && a.day_of_week === getDay(day));
                                        const allDayAvailability = [...dayAvailability, ...dayRecurring];

                                        // 2. Get all active bookings ("The Reality")
                                        const dayBookings = bookings.filter(b => {
                                            const s = b.slots;
                                            return s?.date === dayStr && ['approved', 'completed', 'pending'].includes(b.status);
                                        });

                                        // 3. Group everything by time and location/equipment
                                        const groups: Record<string, {
                                            time: string,
                                            loc: string,
                                            total: number,
                                            booked: number,
                                            equipment: string[]
                                        }> = {};

                                        // Process availability first to establish the base capacity
                                        allDayAvailability.forEach(a => {
                                            const time = a.start_time.slice(0, 5);
                                            const shortLoc = a.location_area.split(' - ')[0];
                                            const key = `${time}-${shortLoc}`;

                                            if (!groups[key]) {
                                                groups[key] = { time, loc: shortLoc, total: 0, booked: 0, equipment: a.equipment || [] };
                                            }
                                            groups[key].total += 1; // Each availability entry is 1 capacity unit
                                        });

                                        // Process bookings to match groups or create missing ones
                                        dayBookings.forEach(b => {
                                            const s = b.slots;
                                            const time = s.start_time.slice(0, 5);
                                            const shortLoc = s.location_area?.split(' - ')[0] || (b.price_breakdown as any)?.equipment || 'Session';
                                            const key = `${time}-${shortLoc}`;
                                            const bQty = b.quantity || 1;

                                            if (groups[key]) {
                                                groups[key].booked += bQty;
                                                // Ensure total capacity is at least as much as bookings
                                                if ((s.quantity || 1) > groups[key].total) {
                                                    groups[key].total = s.quantity || 1;
                                                }
                                                if (groups[key].booked > groups[key].total) {
                                                    groups[key].total = groups[key].booked;
                                                }
                                            } else {
                                                groups[key] = {
                                                    time,
                                                    loc: shortLoc,
                                                    total: Math.max(s.quantity || 1, bQty),
                                                    booked: bQty,
                                                    equipment: [(b.price_breakdown as any)?.equipment].filter(Boolean)
                                                };
                                            }
                                        });

                                        const sortedSessions = Object.values(groups).sort((a, b) => a.time.localeCompare(b.time));
                                        const totalCapacity = sortedSessions.reduce((sum, g) => sum + g.total, 0);

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
                                                    {totalCapacity > 0 && (
                                                        <span className="bg-forest/10 text-forest text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                                                            {totalCapacity} {totalCapacity === 1 ? 'Slot' : 'Slots'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1">
                                                    {sortedSessions.slice(0, 4).map((s) => (
                                                        <div key={`${s.time}-${s.loc}`} className="text-[8px] font-bold text-slate truncate uppercase tracking-tighter flex items-center justify-between">
                                                            <span className="truncate mr-2">• {s.time} {s.loc}</span>
                                                            <span className={clsx(
                                                                "shrink-0 font-black px-1 rounded",
                                                                s.booked >= s.total ? "text-forest bg-forest/5" : "text-slate/40"
                                                            )}>
                                                                {s.booked}/{s.total}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {sortedSessions.length > 4 && (
                                                        <div className="text-[8px] font-black text-forest uppercase tracking-widest pt-1">
                                                            + {sortedSessions.length - 4} more
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

                                {currentSlotHistory.length > 0 && (
                                    <div className="space-y-6 pt-6 border-t border-border-grey">
                                        <div className="flex items-center gap-3 ml-2">
                                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                                            <h4 className="text-[10px] font-bold text-slate uppercase tracking-[0.2em]">Cancellation History</h4>
                                        </div>
                                        <div className="space-y-3">
                                            {currentSlotHistory.map((h, i) => (
                                                <div key={h.id + i} className="p-5 bg-orange-50/50 border border-orange-100 rounded-xl flex flex-col gap-2 shadow-sm">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest">{h.client?.full_name || 'Client'}</span>
                                                        <span className="text-[8px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase tracking-tighter">
                                                            {h.status === 'rejected' ? 'REJECTED' : 'CANCELLED'}
                                                        </span>
                                                    </div>
                                                    {h.cancel_reason && (
                                                        <p className="text-[10px] text-slate italic leading-relaxed">"{h.cancel_reason}"</p>
                                                    )}
                                                    <div className="text-[8px] font-bold text-slate/40 uppercase tracking-widest">
                                                        BY {h.cancelled_by === h.instructor_id ? 'INSTRUCTOR' : 'CLIENT'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

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
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#43302E]/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setSelectedBooking(null)}
                    >
                        <div
                            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-[#43302E]/5 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Action Icons Proper Alignment */}
                            <div className="absolute top-6 right-8 flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        setEditingSlot(selectedBooking.slots);
                                        setIsEditModalOpen(true);
                                        setSelectedBooking(null);
                                    }}
                                    className="p-2 hover:bg-[#FFF1B5]/30 rounded-full text-[#43302E]/40 hover:text-[#43302E] transition-all"
                                    title="Edit Session"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    className="p-2 hover:bg-[#FFF1B5]/30 rounded-full text-[#43302E]/40 hover:text-[#43302E] transition-all"
                                    title="Duplicate Session"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        handleDelete(selectedBooking.slot_id);
                                        setSelectedBooking(null);
                                    }}
                                    className="p-2 hover:bg-red-50 rounded-full text-[#43302E]/40 hover:text-red-600 transition-all"
                                    title="Delete Session"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setSelectedBooking(null)}
                                    className="p-2 hover:bg-off-white rounded-full text-[#43302E]/40 hover:text-[#43302E] transition-all"
                                    title="Close"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Actual Content */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pt-2">
                                    <h3 className="text-3xl font-serif text-[#43302E] tracking-tighter">
                                        {selectedBooking.price_breakdown?.equipment || 'Standard Session'}
                                    </h3>
                                    {(() => {
                                        const isPastStart = getSlotDateTime(selectedBooking.slots?.date, selectedBooking.slots?.start_time) < now
                                        const isPastEnd = getSlotDateTime(selectedBooking.slots?.date, selectedBooking.slots?.end_time) < now

                                        let statusLabel = selectedBooking.status === 'approved' ? 'Confirmed' :
                                            selectedBooking.status === 'completed' ? 'Completed' : 'Pending'

                                        if (selectedBooking.status === 'approved' && isPastEnd) statusLabel = 'Completed'
                                        if (selectedBooking.status === 'pending' && isPastStart) statusLabel = 'Expired'

                                        return (
                                            <span className={clsx(
                                                "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm",
                                                statusLabel === 'Completed' ? "bg-forest/10 text-forest" :
                                                    statusLabel === 'Expired' ? "bg-red-50 text-red-600" :
                                                        "bg-[#FFF1B5] text-[#43302E]"
                                            )}>
                                                {statusLabel}
                                            </span>
                                        )
                                    })()}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-[#43302E]">
                                        <Clock className="w-4 h-4 opacity-40" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest">
                                            {format(new Date(selectedBooking.slots.date), 'EEEE, MMMM d')} • {selectedBooking.slots.start_time.slice(0, 5)} - {selectedBooking.slots.end_time.slice(0, 5)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[#43302E]">
                                        <MapPin className="w-4 h-4 opacity-40" />
                                        <button
                                            onClick={() => setSelectedStudio(selectedBooking.slots.studios)}
                                            className="text-[11px] font-bold uppercase tracking-widest underline decoration-[#43302E]/20 hover:decoration-forest hover:text-forest transition-all"
                                        >
                                            {selectedBooking.slots.studios?.name || 'Studio'} - {selectedBooking.slots.studios?.location || 'Studio Location'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Booked Section */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between border-b border-[#43302E]/10 pb-4">
                                    <h4 className="text-[10px] font-black text-[#43302E] uppercase tracking-[0.3em]">Booked</h4>
                                    <span className="text-[10px] font-black text-[#43302E]/40 uppercase tracking-widest">
                                        {currentSlotHistory.length} Cancelled
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div
                                        onClick={() => setSelectedProfile(selectedBooking.client)}
                                        className="flex items-center justify-between bg-[#FFF1B5]/20 p-4 rounded-xl border border-[#FFF1B5]/40 cursor-pointer hover:bg-[#FFF1B5]/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                                                <img
                                                    src={selectedBooking.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBooking.client?.full_name || 'C')}&background=F5F2EB&color=43302E`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-[#43302E] uppercase tracking-wider group-hover:text-forest transition-colors">{selectedBooking.client?.full_name}</p>
                                                <p className="text-[9px] font-medium text-[#43302E]/50 uppercase tracking-tighter">Verified Client</p>
                                            </div>
                                        </div>
                                        {(() => {
                                            const isPastStart = getSlotDateTime(selectedBooking.slots?.date, selectedBooking.slots?.start_time) < now
                                            const isPastEnd = getSlotDateTime(selectedBooking.slots?.date, selectedBooking.slots?.end_time) < now

                                            let statusLabel = selectedBooking.status === 'approved' ? 'Confirmed' :
                                                selectedBooking.status === 'completed' ? 'Completed' : 'Pending'

                                            if (selectedBooking.status === 'approved' && isPastEnd) statusLabel = 'Completed'
                                            if (selectedBooking.status === 'pending' && isPastStart) statusLabel = 'Expired'

                                            return (
                                                <span className={clsx(
                                                    "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
                                                    statusLabel === 'Completed' ? "bg-forest/5 text-forest border-forest/10" :
                                                        statusLabel === 'Expired' ? "bg-red-50 text-red-600 border-red-100" :
                                                            "bg-white text-[#43302E] border-[#43302E]/5"
                                                )}>
                                                    {statusLabel}
                                                </span>
                                            )
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Event History Section */}
                            <div className="pt-6 border-t border-[#43302E]/10 mt-6">
                                <h4 className="text-[10px] font-black text-[#43302E] uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                    <Clock className="w-4 h-4 opacity-40" />
                                    Event History
                                </h4>
                                <div className="space-y-3">
                                    <div className="text-[10px] space-y-1">
                                        <div className="flex items-center justify-between font-bold text-[#43302E]/60">
                                            <span>Current Session</span>
                                            <span className="uppercase tracking-tighter text-[8px] bg-[#F5F2EB] px-2 py-0.5 rounded border border-[#43302E]/10">
                                                {selectedBooking.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5 text-[#43302E]/40 font-medium">
                                            <p>Booked on {format(new Date(selectedBooking.created_at), 'MMM d, h:mm a')}</p>
                                            {['cancelled_refunded', 'cancelled_charged', 'rejected'].includes(selectedBooking.status?.toLowerCase()) && (
                                                <p className="text-red-900/40 italic">
                                                    Cancelled on {format(new Date(selectedBooking.updated_at), 'MMM d, h:mm a')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {currentSlotHistory.map(h => (
                                        <div key={h.id} className="text-[10px] space-y-1 opacity-60">
                                            <div className="flex items-center justify-between font-bold text-[#43302E]/60">
                                                <span>{h.client?.full_name || 'Previous Client'}</span>
                                                <span className="uppercase tracking-tighter text-[8px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">
                                                    {h.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-0.5 text-[#43302E]/40 font-medium">
                                                <p>Booked on {format(new Date(h.created_at || h.updated_at), 'MMM d, h:mm a')}</p>
                                                <p className="text-red-900/40 italic">
                                                    Cancelled on {format(new Date(h.updated_at), 'MMM d, h:mm a')}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setActiveChat({
                                        id: selectedBooking.id,
                                        recipientId: selectedBooking.client_id,
                                        name: selectedBooking.client?.full_name || 'Client'
                                    })}
                                    className="flex-1 bg-[#43302E] text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-125 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <MessageSquare className="w-4 h-4" /> Message Client
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Profile Detail Modal */}
            {selectedProfile && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedProfile(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 p-8 md:p-12 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedProfile(null)} className="absolute top-6 right-6 p-2 hover:bg-charcoal/5 rounded-full transition-colors text-charcoal/20 hover:text-charcoal"><X className="w-5 h-5" /></button>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="w-24 h-24 rounded-full overflow-hidden mb-6 border-4 border-white shadow-tight relative z-10">
                                <img src={selectedProfile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProfile.full_name || 'C')}&background=FDFDFD&color=D4AF37`} className="w-full h-full object-cover" />
                            </div>
                            <h3 className="text-3xl font-serif text-charcoal tracking-tighter mb-2">{selectedProfile.full_name}</h3>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate uppercase tracking-[0.3em]">{selectedProfile.email}</p>
                                {selectedProfile.date_of_birth && (
                                    <div className="inline-block px-3 py-1 bg-forest/5 rounded-full border border-forest/10 mt-2">
                                        <p className="text-[9px] font-black text-forest uppercase tracking-[0.2em]">{calculateAge(selectedProfile.date_of_birth)} YEARS OLD</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedProfile.bio && (
                            <div className="bg-white/40 p-6 rounded-[2rem] border border-white/60 mb-6 relative z-10">
                                <h4 className="text-[9px] font-black text-charcoal/20 uppercase tracking-[0.4em] mb-3">BIO</h4>
                                <p className="text-[11px] text-charcoal/60 leading-relaxed italic uppercase tracking-wider">"{selectedProfile.bio}"</p>
                            </div>
                        )}

                        <div className="mb-8">
                            {(() => {
                                const conditions = typeof selectedProfile.medical_conditions === 'string'
                                    ? selectedProfile.medical_conditions.split(',').map((c: string) => c.trim())
                                    : Array.isArray(selectedProfile.medical_conditions)
                                        ? selectedProfile.medical_conditions
                                        : [];

                                const displayConditions = conditions
                                    .map((c: string) => c === 'Others' ? selectedProfile.other_medical_condition : c)
                                    .filter(Boolean)
                                    .join(', ');

                                return displayConditions ? (
                                    <div className="bg-red-50 p-8 rounded-lg border border-red-200 relative z-10">
                                        <h4 className="text-[10px] font-black text-red-800 uppercase tracking-[0.3em] mb-4 flex items-center gap-3"><AlertTriangle className="w-4 h-4" /> PHYSICAL CONDITIONS</h4>
                                        <p className="text-[11px] text-red-900 font-black uppercase tracking-[0.2em] leading-relaxed">{displayConditions}</p>
                                    </div>
                                ) : (
                                    <div className="bg-green-50 p-8 rounded-lg border border-green-200 relative z-10">
                                        <h4 className="text-[10px] font-black text-forest uppercase tracking-[0.4em] mb-2">HEALTH STATUS</h4>
                                        <p className="text-[10px] text-forest/40 uppercase tracking-[0.2em] italic">No reported conditions.</p>
                                    </div>
                                );
                            })()}
                        </div>
                        <button onClick={() => setSelectedProfile(null)} className="w-full py-6 bg-charcoal text-white rounded-[12px] text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-md active:scale-95">CLOSE</button>
                    </div>
                </div>
            )}

            {/* Studio Detail Modal */}
            {selectedStudio && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedStudio(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 p-8 md:p-12 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedStudio(null)} className="absolute top-6 right-6 p-2 hover:bg-charcoal/5 rounded-full transition-colors text-charcoal/20 hover:text-charcoal"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden mb-6 border-4 border-white shadow-tight relative z-10 bg-white">
                                <img src={selectedStudio.logo_url || "/logo.png"} className="w-full h-full object-contain p-2" />
                            </div>
                            <h3 className="text-3xl font-serif text-charcoal tracking-tighter mb-2">{selectedStudio.name}</h3>
                            <p className="text-[10px] font-black text-slate uppercase tracking-[0.3em]">{selectedStudio.location}</p>
                        </div>

                        <div className="space-y-6 mb-10">
                            {selectedStudio.description && (
                                <div className="bg-off-white/50 p-6 rounded-2xl border border-border-grey/50">
                                    <h4 className="text-[9px] font-black text-charcoal/20 uppercase tracking-[0.4em] mb-3">ABOUT THE STUDIO</h4>
                                    <p className="text-[11px] text-charcoal/70 leading-relaxed">{selectedStudio.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center gap-4 p-4 bg-white border border-border-grey rounded-xl shadow-tight">
                                    <div className="w-10 h-10 rounded-lg bg-forest/5 flex items-center justify-center"><Clock className="w-5 h-5 text-forest/40" /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-charcoal/20 uppercase tracking-[0.2em]">CONTACT INFO</p>
                                        <p className="text-[11px] font-bold text-charcoal">{selectedStudio.email || 'No email provided'}</p>
                                        <p className="text-[11px] font-bold text-slate">{selectedStudio.phone || 'No phone provided'}</p>
                                    </div>
                                </div>
                                {selectedStudio.google_maps_url && (
                                    <a href={selectedStudio.google_maps_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white border border-border-grey rounded-xl shadow-tight hover:border-forest/40 hover:bg-forest/5 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-forest/5 flex items-center justify-center"><MapPin className="w-5 h-5 text-forest/40" /></div>
                                            <div>
                                                <p className="text-[9px] font-black text-charcoal/20 uppercase tracking-[0.2em]">LOCATION</p>
                                                <p className="text-[11px] font-bold text-charcoal group-hover:text-forest transition-colors">Open in Google Maps</p>
                                            </div>
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 text-charcoal/20 group-hover:text-forest transition-all" />
                                    </a>
                                )}
                            </div>
                        </div>

                        <button onClick={() => setSelectedStudio(null)} className="w-full py-6 bg-charcoal text-white rounded-[12px] text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-md active:scale-95">CLOSE</button>
                    </div>
                </div>
            )}

            {activeChat && (
                <ChatWindow
                    bookingId={activeChat.id}
                    recipientId={activeChat.recipientId}
                    recipientName={activeChat.name}
                    onClose={() => setActiveChat(null)}
                    currentUserId={currentUserId}
                    isExpired={false}
                    isOpen={true}
                />
            )}
        </div>
    )
}
