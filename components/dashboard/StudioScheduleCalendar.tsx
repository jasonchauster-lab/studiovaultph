'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, startOfDay, isPast, startOfMonth, endOfMonth, addDays, subDays, addMonths, subMonths, getDay, setHours, setMinutes } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Users, User, Calendar as CalendarIcon, Clock, Trash2, Edit2, X, Sparkles, MapPin, Box, ArrowUpRight } from 'lucide-react'
import clsx from 'clsx'
import { createSlot, deleteSlot, updateSlot } from '@/app/(dashboard)/studio/actions' // For single slot
import ScheduleManager from './ScheduleManager' // Bulk generator
import Image from 'next/image'
import { toManilaDateStr, getManilaTodayStr, toManilaDate } from '@/lib/timezone'
import MobileScheduleCalendar from './MobileScheduleCalendar'
import { useEffect } from 'react'

interface Slot {
    id: string
    date: string
    start_time: string
    end_time: string
    is_available: boolean
    equipment?: Record<string, number> // Changed from string[] to JSONB object
    quantity?: number // Total capacity
    bookings?: Array<{
        id: string;
        status: string;
        equipment?: string;
        price_breakdown?: any;
        client?: { full_name: string; avatar_url: string };
        instructor?: { full_name: string; avatar_url: string };
    }>
}

interface StudioScheduleCalendarProps {
    studioId: string
    slots: Slot[]
    currentDate: Date
    dayStrings?: string[]
    availableEquipment: string[]
}

export default function StudioScheduleCalendar({ studioId, slots, currentDate, dayStrings, availableEquipment }: StudioScheduleCalendarProps) {
    const router = useRouter()
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
    const [view, setView] = useState<'day' | 'week' | 'month'>('week')

    // Edit Modal State
    const [editingSlot, setEditingSlot] = useState<Slot | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    // Bucket Management Modal (Detailed View)
    const [isBucketModalOpen, setIsBucketModalOpen] = useState(false)
    const [bucketSlots, setBucketSlots] = useState<Slot[]>([])
    const [bucketTime, setBucketTime] = useState<{ date: Date, hour: number } | null>(null)

    // Calendar Calculations
    const days = useMemo(() => {
        if (view === 'day') return [currentDate]
        if (view === 'week') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 })
            const end = endOfWeek(currentDate, { weekStartsOn: 1 })
            return eachDayOfInterval({ start, end })
        }
        // Month view
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
        return eachDayOfInterval({ start, end })
    }, [currentDate, view])

    const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 9 PM

    // Memoized slot mapping for O(1) cell lookup
    const slotMap = useMemo(() => {
        const map: Record<string, Slot[]> = {};
        (slots || []).forEach(slot => {
            const startHour = parseInt(slot.start_time.split(':')[0], 10);
            const key = `${slot.date}-${startHour}`;
            if (!map[key]) map[key] = [];
            map[key].push(slot);
        });
        return map;
    }, [slots]);

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
        else newDate = subMonths(currentDate, 1)
        router.push(`?date=${toManilaDateStr(newDate)}`)
    }

    const handleNext = () => {
        let newDate;
        if (view === 'day') newDate = addDays(currentDate, 1)
        else if (view === 'week') newDate = addWeeks(currentDate, 1)
        else newDate = addMonths(currentDate, 1)
        router.push(`?date=${toManilaDateStr(newDate)}`)
    }

    const handleToday = () => {
        router.push('?date=' + getManilaTodayStr())
    }

    // Modal State for Single Slot
    const [singleDate, setSingleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [singleTime, setSingleTime] = useState('09:00')
    const [singleEndTime, setSingleEndTime] = useState('10:00')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleCreateSingle = async (formData: FormData) => {
        // Validate equipment selection
        if (availableEquipment.length > 0) {
            const hasEquipment = availableEquipment.some(eq => {
                const checked = formData.get(`eq_${eq}`) === 'on';
                const qty = parseInt(formData.get(`qty_${eq}`) as string) || 0;
                return checked && qty > 0;
            });

            if (!hasEquipment) {
                alert('Please select at least one piece of equipment with a quantity greater than 0.');
                return;
            }
        }

        setIsSubmitting(true)
        formData.append('studioId', studioId)
        const result = await createSlot(formData)
        setIsSubmitting(false)
        if (result.success) {
            setIsAddModalOpen(false)
        } else {
            alert(result.error)
        }
    }

    const handleDelete = async () => {
        if (!editingSlot) return;
        if (!confirm('Are you sure you want to delete this slot?')) return;

        setIsSubmitting(true)
        const result = await deleteSlot(editingSlot.id)
        setIsSubmitting(false)

        if (result.success) {
            setIsEditModalOpen(false)
            setEditingSlot(null)
        } else {
            alert(result.error)
        }
    }

    const handleUpdate = async (formData: FormData) => {
        if (!editingSlot) return;
        setIsSubmitting(true)
        const result = await updateSlot(editingSlot.id, formData)
        setIsSubmitting(false)

        if (result.success) {
            setIsEditModalOpen(false)
            setEditingSlot(null)
        } else {
            alert(result.error)
        }
    }

    const onSlotClick = (slot: Slot) => {
        setEditingSlot(slot)
        setSingleDate(slot.date)
        setSingleTime(slot.start_time.slice(0, 5))
        setSingleEndTime(slot.end_time.slice(0, 5))
        setIsEditModalOpen(true)
    }

    return (
        <div className="space-y-6">
            {/* Mobile-Only Google Schedule View */}
            <div className="lg:hidden">
                <MobileScheduleCalendar
                    currentDate={currentDate}
                    initialSessions={slots.map(s => ({
                        id: s.id,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        date: s.date,
                        type: s.equipment ? Object.keys(s.equipment).join(', ') : 'Open Space',
                        location: 'Studio Floor', // Since it's the studio's own dashboard
                        is_booked: (s.bookings?.length || 0) > 0
                    }))}
                />
            </div>

            {/* Desktop-Only Grid View */}
            <div className="hidden lg:block space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-3 bg-white p-6 rounded-xl border border-border-grey shadow-tight">
                    {/* Row 1: Title + Nav controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-serif text-charcoal hidden md:block min-w-[140px]">
                            {view === 'day' ? format(currentDate, 'MMMM d, yyyy') : format(currentDate, 'MMMM yyyy')}
                        </h2>
                        <div className="flex items-center bg-off-white border border-border-grey rounded-full p-1 shadow-tight">
                            <button onClick={handlePrev} className="p-2 hover:bg-forest/10 rounded-full transition-all text-slate hover:text-forest" title="Previous">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={handleToday} className="px-3 py-1.5 text-[10px] font-bold text-slate hover:text-charcoal uppercase tracking-widest transition-all" title="Go to Current Date">
                                Today
                            </button>
                            <button onClick={handleNext} className="p-2 hover:bg-forest/10 rounded-full transition-all text-slate hover:text-forest" title="Next">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <input
                            type="date"
                            value={format(currentDate, 'yyyy-MM-dd')}
                            onChange={(e) => { if (e.target.value) router.push(`?date=${e.target.value}`) }}
                            className="px-3 py-1.5 bg-white border border-border-grey rounded-full text-[10px] font-bold text-slate outline-none focus:ring-1 focus:ring-forest cursor-pointer shadow-tight hover:border-forest/50 transition-all uppercase tracking-tighter"
                            title="Select any specific date"
                        />

                        {/* View Switcher - Desktop Only */}
                        <div className="flex items-center ml-auto bg-off-white border border-border-grey rounded-lg p-1 shadow-tight">
                            <button
                                onClick={() => setView('day')}
                                className={clsx(
                                    "px-4 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest",
                                    view === 'day' ? "bg-forest text-white shadow-tight" : "text-slate hover:text-charcoal"
                                )}
                            >
                                Day
                            </button>
                            <button
                                onClick={() => setView('week')}
                                className={clsx(
                                    "px-4 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest",
                                    view === 'week' ? "bg-forest text-white shadow-tight" : "text-slate hover:text-charcoal"
                                )}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => setView('month')}
                                className={clsx(
                                    "px-4 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest",
                                    view === 'month' ? "bg-forest text-white shadow-tight" : "text-slate hover:text-charcoal"
                                )}
                            >
                                Month
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Action buttons — centered */}
                    <div className="flex justify-center gap-3">
                        <button
                            onClick={() => { setAddMode('single'); setIsAddModalOpen(true); }}
                            className="btn-forest px-6 py-2.5 text-[10px] tracking-[0.2em] flex items-center gap-2 rounded-lg font-bold shadow-tight"
                        >
                            <Plus className="w-4 h-4" /> ADD SLOT
                        </button>
                        <button
                            onClick={() => { setAddMode('bulk'); setIsAddModalOpen(true); }}
                            className="px-6 py-2.5 text-[10px] tracking-[0.2em] flex items-center gap-2 rounded-lg font-bold border border-charcoal text-charcoal bg-white hover:bg-off-white transition-all duration-300 shadow-tight active:scale-95"
                        >
                            <CalendarIcon className="w-4 h-4" /> BULK GENERATE
                        </button>
                    </div>
                </div>




                {/* Calendar Grid */}
                <div className="bg-white border border-border-grey shadow-tight overflow-hidden rounded-[8px]">
                    <div className="overflow-x-auto">
                        <div className={clsx("min-w-[900px]", view === 'month' && "min-w-0")}>
                            {view !== 'month' && (
                                <div className={clsx(
                                    "grid border-b border-border-grey bg-off-white",
                                    view === 'day' ? "grid-cols-[100px_1fr]" : "grid-cols-8"
                                )}>
                                    <div className="p-4 text-[10px] font-bold tracking-[0.2em] text-charcoal border-r border-border-grey sticky left-0 bg-white z-20 uppercase">TIME</div>
                                    {days.map((day: Date) => (
                                        <div key={day.toString()} className={clsx("p-4 text-center border-r border-border-grey last:border-r-0 min-w-[100px] transition-colors", isSameDay(day, new Date()) ? "bg-forest/5" : "")}>
                                            <div className="text-[10px] text-slate uppercase mb-2 font-bold tracking-[0.2em]">{format(day, 'EEE')}</div>
                                            <div className={clsx("text-2xl font-serif font-bold", isSameDay(day, new Date()) ? "text-forest" : "text-charcoal")}>{format(day, 'd')}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="divide-y divide-border-grey relative">
                                {view !== 'month' && (
                                    <>
                                        {/* Current Time Indicator — Improved to show only on today */}
                                        {currentTimePosition !== null && days.some(d => isSameDay(d, new Date())) && (
                                            <div
                                                className="absolute z-30 pointer-events-none flex items-center transition-all duration-1000"
                                                style={{
                                                    top: `${currentTimePosition}%`,
                                                    left: view === 'day'
                                                        ? '100px'
                                                        : `calc(100px + ${(days.findIndex(d => isSameDay(d, new Date()))) * (100 / 8)}%)`,
                                                    width: view === 'day'
                                                        ? 'calc(100% - 100px)'
                                                        : `calc((100% - 100px) / 7)`
                                                }}
                                            >
                                                <div className="w-2.5 h-2.5 bg-forest rounded-full -ml-[5px] ring-2 ring-white shadow-sm" />
                                                <div className="h-[2px] w-full bg-forest shadow-[0_0_8px_rgba(47,82,51,0.3)]" />
                                            </div>
                                        )}

                                        {hours.map(hour => (
                                            <div key={hour} className={clsx(
                                                "grid min-h-[80px]",
                                                view === 'day' ? "grid-cols-[100px_1fr]" : "grid-cols-8"
                                            )}>
                                                <div className="p-4 text-[10px] text-slate font-bold border-r border-border-grey text-center sticky left-0 bg-white z-20 uppercase tracking-tighter">
                                                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                                </div>

                                                {days.map((day: Date) => {
                                                    const dayStr = toManilaDateStr(day)
                                                    const cellSlots = slotMap[`${dayStr}-${hour}`] || []
                                                    const isPastCell = isPast(new Date(dayStr + "T" + hour.toString().padStart(2, '0') + ":59:59+08:00"))

                                                    return (
                                                        <div key={day.toString() + hour} className={clsx("border-r border-border-grey last:border-r-0 relative group p-2 min-h-[100px] transition-all", isPastCell && "bg-off-white")} style={{ colorScheme: 'light' }}>
                                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-forest pointer-events-none z-0" />
                                                            <button
                                                                className="absolute top-2 right-2 p-1 rounded-full bg-forest/10 text-forest opacity-0 group-hover:opacity-100 transition-all hover:bg-forest hover:text-white z-20"
                                                                onClick={() => {
                                                                    setSingleDate(toManilaDateStr(day))
                                                                    setSingleTime(`${hour.toString().padStart(2, '0')}:00`)
                                                                    setSingleEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`)
                                                                    setAddMode('single')
                                                                    setIsAddModalOpen(true)
                                                                }}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>

                                                            {cellSlots.length > 0 && (
                                                                <div className="space-y-1 relative z-10 cursor-pointer">
                                                                    {(() => {
                                                                        const equipmentCounts: Record<string, { free: number, total: number }> = {};
                                                                        cellSlots.forEach(s => {
                                                                            if (s.equipment && typeof s.equipment === 'object') {
                                                                                Object.entries(s.equipment).forEach(([eq, count]) => {
                                                                                    if (!equipmentCounts[eq]) equipmentCounts[eq] = { free: 0, total: 0 };
                                                                                    equipmentCounts[eq].total += count;
                                                                                    const bookedForThisEq = s.bookings?.filter(b =>
                                                                                        ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '') &&
                                                                                        (b.price_breakdown?.equipment?.toUpperCase() === eq.toUpperCase() || b.equipment?.toUpperCase() === eq.toUpperCase())
                                                                                    ).length || 0;
                                                                                    equipmentCounts[eq].free += Math.max(0, count - bookedForThisEq);
                                                                                });
                                                                            }
                                                                        });

                                                                        return Object.entries(equipmentCounts).map(([eqType, counts]) => {
                                                                            const isFullyBooked = counts.free === 0;
                                                                            const hasPending = cellSlots.some(s =>
                                                                                s.bookings?.some(b => b.status === 'pending' && (b.price_breakdown?.equipment?.toUpperCase() === eqType.toUpperCase() || b.equipment?.toUpperCase() === eqType.toUpperCase()))
                                                                            );

                                                                            return (
                                                                                <div
                                                                                    key={eqType}
                                                                                    className={clsx(
                                                                                        "p-3 border session-block-earth transition-all group/eq relative overflow-hidden cursor-pointer rounded-lg",
                                                                                        isPastCell ? "bg-off-white border-border-grey" :
                                                                                            hasPending ? "bg-orange-50/50 border-orange-200" :
                                                                                                isFullyBooked ? "bg-red-50/50 border-red-200" : "bg-green-50/50 border-green-200"
                                                                                    )}
                                                                                    onClick={() => {
                                                                                        setBucketSlots(cellSlots.filter(s => s.equipment?.[eqType]))
                                                                                        setBucketTime({ date: day, hour })
                                                                                        setIsBucketModalOpen(true)
                                                                                    }}
                                                                                >
                                                                                    <div className={clsx("text-[9px] font-bold uppercase tracking-[0.15em] flex justify-between items-center mb-1.5", isPastCell ? "text-slate/40" : "text-charcoal/60")}>
                                                                                        <span className="flex items-center gap-1.5">
                                                                                            <div className={clsx("w-1.5 h-1.5 rounded-full outline outline-offset-1 outline-transparent transition-all", isFullyBooked ? "bg-red-600" : hasPending ? "bg-orange-500 animate-pulse outline-orange-200" : "bg-green-600")} />
                                                                                            <span className={clsx("font-bold flex items-center gap-2", isFullyBooked ? "text-red-900" : hasPending ? "text-orange-900" : "text-green-900")}>
                                                                                                {eqType}
                                                                                                {hasPending && <span className="text-[7px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 tracking-tighter shadow-sm">PENDING</span>}
                                                                                            </span>
                                                                                        </span>
                                                                                        <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/eq:opacity-100 transition-opacity" />
                                                                                    </div>
                                                                                    <div className={clsx("text-[10px] font-bold tracking-tight", isPastCell ? "text-slate" : isFullyBooked ? "text-red-800" : hasPending ? "text-orange-800" : "text-green-800")}>
                                                                                        {counts.free} / {counts.total} <span className="text-[8px] uppercase tracking-wider ml-0.5 font-bold opacity-50">Free</span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        });
                                                                    })()}

                                                                    {cellSlots.some(s => !s.equipment || Object.keys(s.equipment).length === 0) && (() => {
                                                                        const openSlots = cellSlots.filter(s => !s.equipment || Object.keys(s.equipment).length === 0)
                                                                        const availableCount = openSlots.reduce((sum, s) => sum + (s.is_available ? (s.quantity || 1) : 0), 0)
                                                                        const totalCount = openSlots.reduce((sum, s) => sum + (s.quantity || 1), 0)
                                                                        const isFullyBooked = availableCount === 0
                                                                        const hasPending = openSlots.some(s => s.bookings?.some(b => b.status === 'pending'))

                                                                        return (
                                                                            <div
                                                                                className={clsx(
                                                                                    "p-3 border session-block-earth transition-all group/open relative overflow-hidden cursor-pointer rounded-lg",
                                                                                    isPastCell ? "bg-off-white border-border-grey" :
                                                                                        hasPending ? "bg-orange-50/50 border-orange-200" :
                                                                                            isFullyBooked ? "bg-red-50/50 border-red-200" : "bg-green-50/50 border-green-200"
                                                                                )}
                                                                                onClick={() => {
                                                                                    setBucketSlots(openSlots)
                                                                                    setBucketTime({ date: day, hour })
                                                                                    setIsBucketModalOpen(true)
                                                                                }}
                                                                            >
                                                                                <div className={clsx("text-[9px] font-bold uppercase tracking-[0.15em] flex justify-between items-center mb-1.5", isPastCell ? "text-slate/40" : "text-charcoal/60")}>
                                                                                    <span className="flex items-center gap-1.5">
                                                                                        <div className={clsx("w-1.5 h-1.5 rounded-full outline outline-offset-1 outline-transparent transition-all", isFullyBooked ? "bg-red-600" : hasPending ? "bg-orange-500 animate-pulse outline-orange-200" : "bg-green-600")} />
                                                                                        <span className={clsx("font-bold flex items-center gap-2", isFullyBooked ? "text-red-900" : hasPending ? "text-orange-900" : "text-green-900")}>
                                                                                            Open Space
                                                                                            {hasPending && <span className="text-[7px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200 tracking-tighter shadow-sm">PENDING</span>}
                                                                                        </span>
                                                                                    </span>
                                                                                    <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/open:opacity-100 transition-opacity" />
                                                                                </div>
                                                                                <div className={clsx("text-[10px] font-bold tracking-tight", isPastCell ? "text-slate/40" : "text-charcoal/80")}>
                                                                                    {availableCount} / {totalCount} <span className="text-[8px] uppercase tracking-wider ml-0.5 font-bold opacity-50">Free</span>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })()}
                                                                </div>
                                                            )}
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

                                            // Count unique display slots for this day
                                            const daySlotsData = slots.filter(s => s.date === dayStr).sort((a, b) => a.start_time.localeCompare(b.start_time));
                                            const uniqueDisplaySlots = daySlotsData.reduce((acc, current) => {
                                                const time = current.start_time.slice(0, 5);
                                                const type = current.equipment ? Object.keys(current.equipment)[0] : 'Open';
                                                const key = `${time}-${type}`;
                                                if (!acc.some((s: any) => s.key === key)) {
                                                    acc.push({ ...current, key, displayType: type });
                                                }
                                                return acc;
                                            }, [] as any[]);

                                            const displaySlotsCount = uniqueDisplaySlots.length;

                                            return (
                                                <div
                                                    key={day.toString()}
                                                    className={clsx(
                                                        "min-h-[140px] p-4 transition-all hover:bg-forest/5 cursor-pointer",
                                                        !isCurrentMonth && "bg-off-white opacity-40",
                                                        isSameDay(day, new Date()) && "bg-forest/5"
                                                    )}
                                                    onClick={() => {
                                                        const targetDate = format(day, 'yyyy-MM-dd')
                                                        router.push(`?date=${targetDate}`)
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
                                                        {displaySlotsCount > 0 && (
                                                            <span className="bg-forest/10 text-forest text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                                                                {displaySlotsCount} {displaySlotsCount === 1 ? 'Slot' : 'Slots'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {uniqueDisplaySlots.slice(0, 3).map((s: any) => (
                                                            <div key={s.key} className="text-[8px] font-bold text-slate truncate uppercase tracking-tighter">
                                                                • {s.start_time.slice(0, 5)} {s.displayType}
                                                            </div>
                                                        ))}
                                                        {displaySlotsCount > 3 && (
                                                            <div className="text-[8px] font-black text-forest uppercase tracking-widest pt-1">
                                                                + {displaySlotsCount - 3} more
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

                {/* Modal for Add Slot */}
                {isAddModalOpen && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-charcoal/40 animate-in fade-in duration-300"
                        onClick={() => setIsAddModalOpen(false)}
                    >
                        <div
                            className="bg-white rounded-xl p-12 max-w-2xl w-full shadow-card border border-border-grey animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh] will-change-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-3xl font-serif text-charcoal tracking-tighter">
                                        {addMode === 'bulk' ? 'Recurring Schedule' : 'Add Time Slot'}
                                    </h3>
                                    <p className="text-[10px] text-slate font-bold uppercase tracking-[0.4em] mt-2">
                                        {addMode === 'bulk' ? 'SET UP WEEKLY AVAILABILITY' : 'DEFINE A SINGLE SESSION TIME'}
                                    </p>
                                </div>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-4 bg-off-white hover:bg-white rounded-lg text-slate hover:text-charcoal transition-all border border-border-grey shadow-tight">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {addMode === 'bulk' ? (
                                <ScheduleManager studioId={studioId} availableEquipment={availableEquipment} />
                            ) : (
                                <form action={handleCreateSingle} className="space-y-8">
                                    <div className="earth-card p-8 bg-off-white border border-border-grey shadow-tight">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-3 ml-2">Calendar Date</label>
                                            <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-5 py-4 border border-border-grey rounded-lg bg-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-widest cursor-pointer" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 mt-6">
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

                                    {availableEquipment.length > 0 && (
                                        <div className="space-y-6">
                                            <h4 className="text-[10px] font-bold text-slate uppercase tracking-[0.2em] ml-2">Equipment Deployment</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {availableEquipment.map(eq => (
                                                    <div key={eq} className="earth-card p-6 bg-white border border-border-grey shadow-tight group flex items-center justify-between">
                                                        <div className="flex items-center gap-4">
                                                            <input
                                                                type="checkbox"
                                                                name={`eq_${eq}`}
                                                                id={`eq_${eq}`}
                                                                className="w-5 h-5 text-forest rounded border-border-grey focus:ring-forest cursor-pointer"
                                                            />
                                                            <label htmlFor={`eq_${eq}`} className="text-[11px] font-bold text-charcoal uppercase tracking-[0.1em] cursor-pointer">{eq}</label>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[9px] font-bold text-slate uppercase tracking-widest">Qty</span>
                                                            <input
                                                                name={`qty_${eq}`}
                                                                type="number"
                                                                min="1"
                                                                defaultValue="1"
                                                                className="w-16 px-3 py-2 border border-border-grey rounded-md bg-off-white text-[11px] font-bold text-charcoal focus:ring-1 focus:ring-forest outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-5 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-[10px] text-green-800 font-bold uppercase tracking-widest flex items-center gap-3">
                                            <Sparkles className="w-4 h-4 text-forest" />
                                            <span>Each selected equipment unit will have its own individual quantity within this slot.</span>
                                        </p>
                                    </div>

                                    <div className="flex gap-6 pt-10 border-t border-border-grey">
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
                            )}
                        </div>
                    </div>
                )}

                {/* Modal for Edit Slot */}
                {isEditModalOpen && editingSlot && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-charcoal/40 animate-in fade-in duration-300"
                        onClick={() => setIsEditModalOpen(false)}
                    >
                        <div
                            className="bg-white rounded-xl p-12 max-w-2xl w-full shadow-card border border-border-grey animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh] will-change-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* ... (Reuse existing form or refactor, keeping logic simple for now) ... */}
                            {/* Actually I will just keep the existing edit modal code here since I'm not deleting it yet, 
                             Logic above in replace_file_content was inserting *before* the end. 
                             I need to make sure I am appending the NEW modal.
                         */}
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-3xl font-serif text-charcoal tracking-tighter">Manage Slot</h3>
                                    <p className="text-[10px] text-slate font-bold uppercase tracking-[0.4em] mt-2">UPDATE SESSION PARAMETERS</p>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} className="p-4 bg-off-white hover:bg-white rounded-lg text-slate hover:text-charcoal transition-all border border-border-grey shadow-tight">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {(() => {
                                const activeBooking = editingSlot.bookings?.find(b => ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || ''));
                                if (!activeBooking) return null;
                                return (
                                    <div className="mb-10 p-8 bg-green-50 border border-green-100 rounded-lg space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h4 className="status-pill-earth px-4 py-1.5 rounded-full bg-green-100 text-green-900 text-[10px] font-bold uppercase tracking-widest">Active Booking</h4>
                                            <span className="text-[10px] font-bold text-slate uppercase tracking-widest">
                                                {activeBooking.status}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-8">
                                            {activeBooking.instructor && (
                                                <div className="space-y-3">
                                                    <p className="text-[10px] text-slate font-bold uppercase tracking-widest">Instructor</p>
                                                    <div className="flex items-center gap-3">
                                                        {activeBooking.instructor.avatar_url ? (
                                                            <Image src={activeBooking.instructor.avatar_url} alt="Instructor" width={32} height={32} className="rounded-lg w-8 h-8 object-cover border border-border-grey shadow-tight" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-border-grey shadow-tight">
                                                                <User className="w-4 h-4 text-slate" />
                                                            </div>
                                                        )}
                                                        <span className="text-sm font-bold text-charcoal">{activeBooking.instructor.full_name}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {activeBooking.client && (
                                                <div className="space-y-3">
                                                    <p className="text-[10px] text-slate font-bold uppercase tracking-widest">Client</p>
                                                    <div className="flex items-center gap-3">
                                                        {activeBooking.client.avatar_url ? (
                                                            <Image src={activeBooking.client.avatar_url} alt="Client" width={32} height={32} className="rounded-lg w-8 h-8 object-cover border border-border-grey shadow-tight" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-border-grey shadow-tight">
                                                                <Users className="w-4 h-4 text-slate" />
                                                            </div>
                                                        )}
                                                        <span className="text-sm font-bold text-charcoal">{activeBooking.client.full_name}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            <form action={handleUpdate} className="space-y-10">
                                <div className="earth-card p-10 bg-off-white border border-border-grey shadow-tight space-y-8">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-4 ml-6">Date</label>
                                        <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-8 py-5 border border-border-grey rounded-lg bg-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-[0.15em] cursor-pointer" style={{ colorScheme: 'light' }} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-4 ml-6">Start Hour</label>
                                            <input name="startTime" type="time" required value={singleTime} onChange={(e) => setSingleTime(e.target.value)} className="w-full px-8 py-5 border border-border-grey rounded-lg bg-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-[0.15em] cursor-pointer" style={{ colorScheme: 'light' }} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-4 ml-6">End Hour</label>
                                            <input name="endTime" type="time" required value={singleEndTime} onChange={(e) => setSingleEndTime(e.target.value)} className="w-full px-8 py-5 border border-border-grey rounded-lg bg-white text-charcoal font-bold text-[10px] outline-none focus:ring-1 focus:ring-forest transition-all uppercase tracking-[0.15em] cursor-pointer" style={{ colorScheme: 'light' }} />
                                        </div>
                                    </div>
                                </div>

                                {availableEquipment.length > 0 && (
                                    <div className="space-y-6">
                                        <label className="block text-[10px] font-bold text-slate uppercase tracking-[0.2em] ml-6">Equipment Deployment</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {availableEquipment.map(eq => (
                                                <div key={eq} className="earth-card p-6 bg-white border border-border-grey shadow-tight group flex items-center justify-between transition-all hover:border-forest/30">
                                                    <div className="flex items-center gap-4">
                                                        <input
                                                            type="checkbox"
                                                            name={`eq_${eq}`}
                                                            id={`edit_eq_${eq}`}
                                                            defaultChecked={editingSlot.equipment && !!(
                                                                editingSlot.equipment[eq] ||
                                                                editingSlot.equipment[eq.toUpperCase()] ||
                                                                editingSlot.equipment[eq.toLowerCase()]
                                                            )}
                                                            className="w-5 h-5 text-forest rounded border-border-grey focus:ring-forest cursor-pointer"
                                                        />
                                                        <label htmlFor={`edit_eq_${eq}`} className="text-[11px] font-bold text-charcoal uppercase tracking-[0.15em] cursor-pointer">{eq}</label>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[9px] font-bold text-slate uppercase tracking-widest">Qty</span>
                                                        <input
                                                            name={`qty_${eq}`}
                                                            type="number"
                                                            min="1"
                                                            defaultValue={
                                                                editingSlot.equipment?.[eq] ||
                                                                editingSlot.equipment?.[eq.toUpperCase()] ||
                                                                editingSlot.equipment?.[eq.toLowerCase()] ||
                                                                1
                                                            }
                                                            className="w-16 px-3 py-2 border border-border-grey rounded-md bg-off-white text-[11px] font-bold text-charcoal focus:ring-1 focus:ring-forest outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-6 pt-12 border-t border-border-grey">
                                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-charcoal text-white py-5 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-tight active:scale-95 flex items-center justify-center gap-4">
                                        <Edit2 className="w-5 h-5" /> {isSubmitting ? 'PROCESSING...' : 'UPDATE SLOT'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={isSubmitting}
                                        className="px-10 py-5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-red-100 transition-all flex items-center justify-center gap-4 border border-red-200"
                                    >
                                        <Trash2 className="w-5 h-5" /> DELETE
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Bucket Management Modal */}
                {isBucketModalOpen && bucketTime && (
                    <div
                        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-charcoal/40 animate-in fade-in duration-300"
                        onClick={() => setIsBucketModalOpen(false)}
                    >
                        <div
                            className="bg-white rounded-xl p-12 max-w-2xl w-full shadow-card border border-border-grey animate-in zoom-in-95 duration-500 max-h-[85vh] overflow-y-auto will-change-transform"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-3xl font-serif text-charcoal tracking-tighter">
                                        {format(bucketTime.date, 'EEEE, MMM d')} &bull; {bucketTime.hour > 12 ? `${bucketTime.hour - 12} PM` : bucketTime.hour === 12 ? '12 PM' : `${bucketTime.hour} AM`}
                                    </h3>
                                    <p className="text-[10px] text-slate font-bold uppercase tracking-[0.4em] mt-2">MANAGING {bucketSlots.length} ACTIVE SESSIONS</p>
                                </div>
                                <button onClick={() => setIsBucketModalOpen(false)} className="p-4 bg-off-white hover:bg-white rounded-lg text-slate hover:text-charcoal transition-all border border-border-grey shadow-tight">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {bucketSlots.map(slot => (
                                    <div key={slot.id} className="earth-card p-6 bg-off-white border border-border-grey rounded-lg flex items-center justify-between shadow-tight transition-all hover:bg-white group">
                                        <div className="flex items-center gap-5">
                                            <div className="bg-white p-3 rounded-lg border border-border-grey shadow-tight text-forest">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <div>
                                                    <p className="text-[11px] font-bold text-charcoal tracking-widest uppercase">
                                                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate uppercase tracking-[0.1em] mt-1">
                                                        {slot.equipment ? Object.entries(slot.equipment).map(([eq, qty]) => `${qty}x ${eq.toUpperCase()}`).join(', ') : 'OPEN SPACE'}
                                                    </p>
                                                </div>
                                                {(() => {
                                                    const activeBooking = slot.bookings?.find(b => ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || ''));
                                                    if (!activeBooking) return null;
                                                    return (
                                                        <div className="flex items-center gap-3 pt-3 mt-3 border-t border-border-grey/50">
                                                            {activeBooking.instructor && (
                                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-border-grey shadow-tight" title="Instructor">
                                                                    {activeBooking.instructor.avatar_url ? (
                                                                        <Image src={activeBooking.instructor.avatar_url} alt="Instructor" width={18} height={18} className="rounded-full w-4.5 h-4.5 object-cover" />
                                                                    ) : (
                                                                        <User className="w-4 h-4 text-slate" />
                                                                    )}
                                                                    <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest">{activeBooking.instructor.full_name || 'N/A'}</span>
                                                                </div>
                                                            )}
                                                            {activeBooking.client && (
                                                                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-border-grey shadow-tight" title="Client">
                                                                    {activeBooking.client.avatar_url ? (
                                                                        <Image src={activeBooking.client.avatar_url} alt="Client" width={18} height={18} className="rounded-full w-4.5 h-4.5 object-cover" />
                                                                    ) : (
                                                                        <Users className="w-4 h-4 text-slate" />
                                                                    )}
                                                                    <span className="text-[10px] font-bold text-charcoal uppercase tracking-widest">{activeBooking.client.full_name || 'N/A'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsBucketModalOpen(false);
                                                onSlotClick(slot);
                                            }}
                                            className="text-[10px] font-bold text-forest hover:text-charcoal uppercase tracking-widest underline decoration-forest/20 hover:decoration-forest underline-offset-8 transition-all px-4 py-2 hover:bg-white rounded-lg"
                                        >
                                            EDIT SESSION
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 pt-10 border-t border-border-grey flex justify-center">
                                <button
                                    onClick={() => {
                                        setIsBucketModalOpen(false);
                                        setSingleDate(format(bucketTime.date, 'yyyy-MM-dd'));
                                        setSingleTime(`${bucketTime.hour.toString().padStart(2, '0')}:00`);
                                        setSingleEndTime(`${(bucketTime.hour + 1).toString().padStart(2, '0')}:00`);
                                        setAddMode('single');
                                        setIsAddModalOpen(true);
                                    }}
                                    className="bg-charcoal text-white px-10 py-5 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-tight active:scale-95 flex items-center gap-4"
                                >
                                    <Plus className="w-5 h-5" /> ADD ANOTHER SESSION HERE
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
