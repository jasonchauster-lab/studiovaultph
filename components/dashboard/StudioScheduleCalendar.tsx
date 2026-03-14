'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, startOfDay, isPast, startOfMonth, endOfMonth, addDays, subDays, addMonths, subMonths, getDay, setHours, setMinutes } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Users, User, Calendar as CalendarIcon, Clock, Trash2, Edit2, X, Sparkles, MapPin, Box, ArrowUpRight, Pencil, Copy, AlertCircle } from 'lucide-react'
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
        created_at: string;
        updated_at: string;
        equipment?: string;
        quantity?: number;
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

    // Profile Detail Modal State
    const [selectedProfile, setSelectedProfile] = useState<any>(null)

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

    // Centralized Scroll Lock for all modals
    useEffect(() => {
        if (isAddModalOpen || isEditModalOpen || isBucketModalOpen || selectedProfile) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isAddModalOpen, isEditModalOpen, isBucketModalOpen, selectedProfile]);

    const calculateAge = (birthday: string) => {
        if (!birthday) return null
        const birthDate = new Date(birthday)
        const ageDifMs = Date.now() - birthDate.getTime()
        const ageDate = new Date(ageDifMs)
        return Math.abs(ageDate.getUTCFullYear() - 1970)
    }

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
                    onAddSlot={(date) => { 
                        setSingleDate(format(date, 'yyyy-MM-dd'));
                        setAddMode('single'); 
                        setIsAddModalOpen(true); 
                    }}
                    onRecurringSchedule={() => { setAddMode('bulk'); setIsAddModalOpen(true); }}
                    onSlotClick={(session) => {
                        // In mobile view, session.id is the group key (date-time)
                        const key = session.id;
                        const groupSlots = slots.filter(s => `${s.date}-${s.start_time}` === key);
                        
                        if (groupSlots.length > 0) {
                            // Always open bucket modal to show booking details (user can edit from there)
                            setBucketSlots(groupSlots);
                            const first = groupSlots[0];
                            const hour = parseInt(first.start_time.split(':')[0], 10);
                            setBucketTime({ date: parseISO(first.date), hour });
                            setIsBucketModalOpen(true);
                        }
                    }}
                    initialSessions={(() => {
                        const groups: Record<string, typeof slots> = {};
                        slots.forEach(s => {
                            const key = `${s.date}-${s.start_time}`;
                            if (!groups[key]) groups[key] = [];
                            groups[key].push(s);
                        });

                        return Object.entries(groups).map(([key, groupSlots]) => {
                            const first = groupSlots[0];
                            const allBookings = groupSlots.flatMap(s => s.bookings || []);
                            const activeBookings = allBookings.filter(b => ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || ''));

                            const instructors = new Set<string>();
                            const classNames = new Set<string>();
                            activeBookings.forEach(b => {
                                if (b.instructor?.full_name) instructors.add(b.instructor.full_name);
                            });

                            let totalBooked = 0;
                            let totalQty = 0;
                            const eqRatios: string[] = [];

                            const equipmentMap: Record<string, { booked: number, total: number }> = {};
                            groupSlots.forEach(s => {
                                if (s.equipment) {
                                    Object.entries(s.equipment).forEach(([eq, qty]) => {
                                        if (!equipmentMap[eq]) equipmentMap[eq] = { booked: 0, total: qty };
                                        else equipmentMap[eq].total += qty;

                                        const bookedForThisEq = s.bookings?.filter(b =>
                                            ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '') &&
                                            (b.price_breakdown?.equipment?.toUpperCase() === eq.toUpperCase() || b.equipment?.toUpperCase() === eq.toUpperCase())
                                        ).length || 0;
                                        equipmentMap[eq].booked += bookedForThisEq;
                                        classNames.add(eq);
                                    });
                                }
                            });

                            Object.values(equipmentMap).forEach(m => {
                                totalBooked += m.booked;
                                totalQty += m.total;
                            });

                            const displayTitle = activeBookings.length === 0
                                ? (Array.from(classNames).join(' / ') || "Studio Session")
                                : activeBookings.length === 1
                                    ? (activeBookings[0].client?.full_name || "Booked Session")
                                    : `${activeBookings[0].client?.full_name || "Client"} + ${activeBookings.length - 1} more`;

                            const instructorNames = Array.from(instructors);
                            const footerText = instructorNames.length > 0
                                ? `With ${instructorNames.join(', ')}`
                                : "Instructor: Unassigned";

                            return {
                                id: key,
                                start_time: first.start_time,
                                end_time: first.end_time,
                                date: first.date,
                                type: displayTitle,
                                location: footerText,
                                is_booked: totalBooked > 0,
                                displayRatio: `${totalBooked}/${totalQty}`,
                                displayTitle: displayTitle
                            };
                        });
                    })()}
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
                            <button onClick={handlePrev} className="p-2 hover:bg-burgundy/10 rounded-full transition-all text-muted-burgundy hover:text-burgundy" title="Previous">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={handleToday} className="px-3 py-1.5 text-[10px] font-bold text-muted-burgundy hover:text-burgundy uppercase tracking-widest transition-all" title="Go to Current Date">
                                Today
                            </button>
                            <button onClick={handleNext} className="p-2 hover:bg-burgundy/10 rounded-full transition-all text-muted-burgundy hover:text-burgundy" title="Next">
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
                                    view === 'day' ? "bg-buttermilk text-burgundy shadow-tight" : "text-muted-burgundy hover:text-burgundy"
                                )}
                            >
                                Day
                            </button>
                            <button
                                onClick={() => setView('week')}
                                className={clsx(
                                    "px-4 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest",
                                    view === 'week' ? "bg-buttermilk text-burgundy shadow-tight" : "text-muted-burgundy hover:text-burgundy"
                                )}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => setView('month')}
                                className={clsx(
                                    "px-4 py-1.5 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest",
                                    view === 'month' ? "bg-buttermilk text-burgundy shadow-tight" : "text-muted-burgundy hover:text-burgundy"
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
                            className="h-10 border-2 border-burgundy text-burgundy bg-white px-6 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-burgundy/5 transition-all flex items-center gap-2 shadow-tight active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> ADD SLOT
                        </button>
                        <button
                            onClick={() => { setAddMode('bulk'); setIsAddModalOpen(true); }}
                            className="px-6 py-2.5 text-[10px] bg-burgundy text-buttermilk rounded-lg font-bold tracking-[0.2em] flex items-center gap-2 hover:brightness-110 shadow-tight active:scale-95 transition-all"
                        >
                            <CalendarIcon className="w-4 h-4" /> BULK GENERATE
                        </button>
                    </div>
                </div>




                {/* Calendar Grid */}
                <div className="bg-white border border-border-grey shadow-tight overflow-hidden rounded-[8px]">
                    <div className="overflow-x-auto">
                    <div className={clsx("min-w-[800px] xl:min-w-full", view === 'month' && "min-w-0")}>
                            {view !== 'month' && (
                                <div className={clsx(
                                    "grid border-b border-border-grey bg-off-white",
                                    view === 'day' ? "grid-cols-[100px_1fr]" : "grid-cols-[100px_repeat(7,1fr)]"
                                )}>
                                    <div className="p-4 text-[10px] font-bold tracking-[0.2em] text-charcoal border-r border-border-grey sticky left-0 bg-white z-20 uppercase">TIME</div>
                                    {days.map((day: Date) => (
                                        <div key={day.toString()} className={clsx("p-4 text-center border-r border-border-grey last:border-r-0 transition-colors relative", isSameDay(day, new Date()) ? "bg-buttermilk/30" : "")}>
                                            <div className="text-[10px] text-muted-burgundy uppercase mb-2 font-black tracking-[0.2em]">{format(day, 'EEE')}</div>
                                            <div className={clsx("text-2xl font-serif font-black", isSameDay(day, new Date()) ? "text-burgundy" : "text-burgundy")}>{format(day, 'd')}</div>
                                            {isSameDay(day, new Date()) && (
                                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-burgundy rounded-t-full" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="divide-y divide-border-grey relative overflow-hidden">
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
                                                        : `calc(100px + ${days.findIndex(d => isSameDay(d, new Date()))} * (100% - 100px) / 7)`,
                                                    width: view === 'day'
                                                        ? 'calc(100% - 100px)'
                                                        : `calc((100% - 100px) / 7)`
                                                }}
                                            >
                                                <div className="w-[12px] h-[12px] bg-burgundy rounded-full -ml-[6px] ring-2 ring-white shadow-sm" />
                                                <div className="h-[3px] w-full bg-burgundy shadow-[0_0_12px_rgba(67,48,46,0.4)]" />
                                            </div>
                                        )}

                                        {hours.map(hour => (
                                            <div key={hour} className={clsx(
                                                "grid min-h-[80px]",
                                                view === 'day' ? "grid-cols-[100px_1fr]" : "grid-cols-[100px_repeat(7,1fr)]"
                                            )}>
                                                <div className="p-4 text-[10px] text-muted-burgundy font-bold border-r border-border-grey text-center sticky left-0 bg-white z-20 uppercase tracking-tighter">
                                                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                                </div>

                                                {days.map((day: Date) => {
                                                    const dayStr = toManilaDateStr(day)
                                                    const cellSlots = slotMap[`${dayStr}-${hour}`] || []
                                                    const isPastCell = isPast(new Date(dayStr + "T" + hour.toString().padStart(2, '0') + ":59:59+08:00"))
                                                    const isToday = isSameDay(day, new Date())

                                                    return (
                                                        <div key={day.toString() + hour} className={clsx("border-r border-border-grey last:border-r-0 relative group p-1 min-h-[100px] transition-all", isPastCell ? "bg-off-white" : isToday ? "bg-buttermilk/10" : "")} style={{ colorScheme: 'light' }}>
                                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-5 bg-burgundy pointer-events-none z-0" />
                                                            <button
                                                                className="absolute top-2 right-2 p-1 rounded-full bg-burgundy/10 text-burgundy opacity-0 group-hover:opacity-100 transition-all hover:bg-burgundy hover:text-white z-20"
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

                                                            {cellSlots.length > 0 && (() => {
                                                                const allActiveBookings = cellSlots.flatMap(s => s.bookings || []).filter(b =>
                                                                    ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '')
                                                                );

                                                                const equipmentCounts: Record<string, { booked: number, total: number }> = {};
                                                                const instructors = new Set<string>();
                                                                const classNames = new Set<string>();

                                                                cellSlots.forEach(s => {
                                                                    if (s.equipment && typeof s.equipment === 'object') {
                                                                        Object.entries(s.equipment).forEach(([eq, count]) => {
                                                                            if (!equipmentCounts[eq]) equipmentCounts[eq] = { booked: 0, total: count };
                                                                            else equipmentCounts[eq].total += count;

                                                                            const bookedForThisEq = s.bookings?.filter(b =>
                                                                                ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '') &&
                                                                                (b.price_breakdown?.equipment?.toUpperCase() === eq.toUpperCase() || b.equipment?.toUpperCase() === eq.toUpperCase())
                                                                            ).length || 0;
                                                                            equipmentCounts[eq].booked += bookedForThisEq;
                                                                            classNames.add(eq);
                                                                        });
                                                                    }
                                                                });

                                                                allActiveBookings.forEach(b => {
                                                                    if (b.instructor?.full_name) instructors.add(b.instructor.full_name);
                                                                });

                                                                const isBooked = allActiveBookings.length > 0;
                                                                const hasPending = allActiveBookings.some(b => b.status?.toLowerCase() === 'pending');

                                                                const displayTitle = allActiveBookings.length === 0
                                                                    ? (Array.from(classNames).join(' / ') || "Studio Session")
                                                                    : allActiveBookings.length === 1
                                                                        ? (allActiveBookings[0].client?.full_name || "Booked Session")
                                                                        : `${allActiveBookings[0].client?.full_name || "Client"} + ${allActiveBookings.length - 1} more`;

                                                                return (
                                                                    <div
                                                                        className={clsx(
                                                                            "p-2 border-l-4 border-solid transition-all duration-300 hover:shadow-card hover:scale-[1.01] shadow-tight group/slot relative overflow-hidden cursor-pointer rounded-lg h-full flex flex-col justify-between",
                                                                            isPastCell ? "bg-off-white border-border-grey" :
                                                                                hasPending ? "bg-orange-50/50 border-orange-200" :
                                                                                    isBooked ? "bg-[#43302E] border-[#2C1F1D]" : "bg-[#FDFBF7] border-[#EADED7]"
                                                                        )}
                                                                        onClick={() => {
                                                                            setBucketSlots(cellSlots);
                                                                            setBucketTime({ date: day, hour });
                                                                            setIsBucketModalOpen(true);
                                                                        }}
                                                                    >
                                                                        <div>
                                                                            <div className="flex justify-between items-start mb-1">
                                                                                <h4 className={clsx("text-[9.5px] font-semibold uppercase tracking-tight truncate max-w-[85%]", isPastCell || (!isBooked && !hasPending) ? "text-[#43302E]" : "text-[#F5F2E9]")}>
                                                                                    {displayTitle}
                                                                                </h4>
                                                                                <Edit2 className={clsx("w-2.5 h-2.5 opacity-0 group-hover/slot:opacity-100 transition-opacity", isPastCell || (!isBooked && !hasPending) ? "text-[#43302E]/40" : "text-[#F5F2E9]/40")} />
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {Object.entries(equipmentCounts).map(([eq, counts]) => (
                                                                                    <span key={eq} className={clsx("text-[7.5px] font-bold uppercase tracking-tighter flex items-center gap-1 px-1.5 py-0.5 rounded border", isPastCell || (!isBooked && !hasPending) ? "text-[#43302E]/80 border-border-grey bg-white/50" : "text-white/90 border-white/20 bg-white/10")}>
                                                                                        <Box className="w-2 h-2 opacity-40 shrink-0" />
                                                                                        <span>{counts.booked}/{counts.total} {eq.split(' ')[0]}</span>
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <div className={clsx("mt-1 pt-1 border-t", isPastCell || (!isBooked && !hasPending) ? "border-[#43302E]/5" : "border-white/10")}>
                                                                            <p className={clsx("text-[8px] font-black uppercase tracking-tight truncate flex items-center gap-1", isPastCell || (!isBooked && !hasPending) ? "text-[#43302E]/70" : "text-[#F5F2E9]/80")}>
                                                                                <User className="w-2 h-2 opacity-50" />
                                                                                {instructors.size > 0 ? Array.from(instructors).join(', ') : 'Unassigned'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
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
                                                
                                                // Count all active bookings for this slot (equipment-agnostic for monthly overview)
                                                const booked = current.bookings?.filter(b =>
                                                    ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '')
                                                ).length || 0;
                                                const total = Math.max(current.quantity || 1, booked);

                                                const key = `${time}-${type}`;
                                                if (!acc.some((s: any) => s.key === key)) {
                                                    acc.push({ ...current, key, displayType: type, booked, total });
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
                                                            isSameDay(day, new Date()) ? "text-burgundy underline underline-offset-4 decoration-buttermilk decoration-4" : "text-burgundy"
                                                        )}>
                                                            {format(day, 'd')}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {uniqueDisplaySlots.slice(0, 3).map((s: any) => (
                                                            <div 
                                                                key={s.key} 
                                                                className="text-[8px] font-bold text-slate truncate uppercase tracking-tighter flex items-center justify-between gap-1 hover:bg-burgundy/10 p-0.5 rounded transition-colors cursor-pointer"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const matchingSlots = daySlotsData.filter(slot => 
                                                                        slot.start_time.slice(0, 5) === s.start_time.slice(0, 5) && 
                                                                        (slot.equipment ? Object.keys(slot.equipment)[0] : 'Open') === s.displayType
                                                                    );
                                                                    setBucketSlots(matchingSlots);
                                                                    setBucketTime({ date: day, hour: parseInt(s.start_time.split(':')[0], 10) });
                                                                    setIsBucketModalOpen(true);
                                                                }}
                                                            >
                                                                <span className="truncate">• {s.start_time.slice(0, 5)} {s.displayType}</span>
                                                                <span className="shrink-0 font-bold text-[#43302E]/60 uppercase tracking-tighter bg-[#43302E]/5 px-1 rounded">
                                                                    {s.booked}/{s.total}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {displaySlotsCount > 3 && (
                                                            <div className="text-[8px] font-black text-muted-burgundy uppercase tracking-widest pt-1">
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
                                            <div className="space-y-3">
                                                <p className="text-[10px] text-slate font-bold uppercase tracking-widest">Booked Equipment</p>
                                                <div className="flex items-center gap-2">
                                                    <Box className="w-4 h-4 text-forest/40" />
                                                    <span className="text-sm font-bold text-charcoal">
                                                        {activeBooking.equipment || activeBooking.price_breakdown?.equipment || 'Standard'} ({activeBooking.quantity || 1})
                                                    </span>
                                                </div>
                                            </div>
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

                                    <div className="flex flex-col sm:flex-row gap-4 pt-10 border-t border-border-grey">
                                        <button type="submit" disabled={isSubmitting} className="flex-1 bg-charcoal text-white py-4 md:py-5 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-tight active:scale-95 flex items-center justify-center gap-3">
                                            <Edit2 className="w-4 h-4" /> {isSubmitting ? 'PROCESSING...' : 'UPDATE SLOT'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={isSubmitting}
                                            className="flex-1 px-8 py-4 md:py-5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-red-100 transition-all flex items-center justify-center gap-3 border border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4" /> DELETE
                                        </button>
                                    </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Bucket Management Modal */}
                {isBucketModalOpen && bucketTime && (() => {
                    const allBookings = bucketSlots.flatMap(s => s.bookings || []);
                    const activeBookings = allBookings.filter(b => ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || ''));
                    const instructorsMap = new Map<string, any>();
                    activeBookings.forEach(b => {
                        if (b.instructor?.full_name) instructorsMap.set(b.instructor.full_name, b.instructor);
                    });

                    const bookingsByEquipment: Record<string, typeof activeBookings> = {};
                    activeBookings.forEach(b => {
                        const eq = b.price_breakdown?.equipment || b.equipment || 'Other';
                        if (!bookingsByEquipment[eq]) bookingsByEquipment[eq] = [];
                        bookingsByEquipment[eq].push(b);
                    });

                    const primarySlot = bucketSlots[0];

                    return (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-charcoal/40 animate-in fade-in duration-300" onClick={() => setIsBucketModalOpen(false)}>
                            <div className="bg-white rounded-xl p-8 md:p-12 max-w-2xl w-full shadow-card border border-border-grey animate-in zoom-in-95 duration-500 max-h-[90vh] overflow-y-auto will-change-transform" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-start mb-10">
                                    <div>
                                        <h3 className="text-3xl font-serif text-[#43302E] tracking-tighter">
                                            {format(bucketTime.date, 'EEEE, MMM d')} &bull; {bucketTime.hour > 12 ? `${bucketTime.hour - 12} PM` : bucketTime.hour === 12 ? '12 PM' : `${bucketTime.hour} AM`}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-4">
                                            <div className="bg-off-white p-2.5 rounded-lg border border-border-grey shadow-tight text-[#43302E]">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] text-[#43302E]/60 font-bold uppercase tracking-[0.2em]">Staffing</p>
                                                <div className="flex flex-wrap gap-x-2">
                                                    {instructorsMap.size > 0 ? (
                                                        Array.from(instructorsMap.values()).map((instructor, idx) => (
                                                            <button
                                                                key={instructor.full_name + idx}
                                                                onClick={() => setSelectedProfile(instructor)}
                                                                className="text-[14px] font-bold text-[#43302E] tracking-tight hover:text-forest transition-colors flex items-center gap-1"
                                                            >
                                                                {instructor.full_name}{idx < instructorsMap.size - 1 ? ',' : ''}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <p className="text-[14px] font-bold text-[#43302E] tracking-tight">Unassigned</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button onClick={() => { if (primarySlot) { setIsBucketModalOpen(false); onSlotClick(primarySlot); } }} className="p-3 bg-white hover:bg-off-white rounded-lg text-[#43302E] transition-all border border-border-grey shadow-tight" title="Edit">
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => { if (primarySlot) { setIsBucketModalOpen(false); setSingleDate(primarySlot.date); setSingleTime(primarySlot.start_time); setSingleEndTime(primarySlot.end_time); const newEq: Record<string, number> = {}; if (primarySlot.equipment) Object.assign(newEq, primarySlot.equipment); setAddMode('single'); setIsAddModalOpen(true); } }} className="p-3 bg-white hover:bg-off-white rounded-lg text-[#43302E] transition-all border border-border-grey shadow-tight" title="Duplicate">
                                            <Copy className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setIsBucketModalOpen(false)} className="p-3 bg-off-white hover:bg-white rounded-lg text-slate hover:text-charcoal transition-all border border-border-grey shadow-tight">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    {Object.entries(bookingsByEquipment).map(([eqType, bookings]) => (
                                        <div key={eqType} className="space-y-4">
                                            <h4 className="text-[11px] font-bold text-[#43302E]/60 uppercase tracking-[0.3em] flex items-center gap-3">
                                                <Box className="w-4 h-4 text-[#43302E]/30" />
                                                {eqType}S
                                                <span className="h-px flex-1 bg-border-grey" />
                                            </h4>

                                            <div className="grid gap-3">
                                                {bookings.map(b => (
                                                    <div
                                                        key={b.id}
                                                        onClick={() => setSelectedProfile(b.client)}
                                                        className="flex items-center justify-between p-4 bg-white border border-border-grey rounded-xl shadow-tight group hover:border-forest/40 hover:bg-forest/5 transition-all cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-off-white flex items-center justify-center overflow-hidden border border-border-grey shadow-inner">
                                                                {b.client?.avatar_url ? (
                                                                    <img src={b.client.avatar_url} alt="" className="object-cover w-full h-full" />
                                                                ) : (
                                                                    <User className="w-5 h-5 text-slate" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-[13px] font-bold text-[#43302E]">{b.client?.full_name || 'Anonymous Client'}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <p className="text-[9px] font-bold text-[#43302E]/40 uppercase tracking-widest">{b.status}</p>
                                                                    <span className="text-[#43302E]/20 text-[8px]">•</span>
                                                                    <div className="flex items-center gap-1 text-[9px] font-bold text-forest/60 uppercase tracking-widest">
                                                                        <Box className="w-2.5 h-2.5 opacity-40" />
                                                                        {b.equipment || b.price_breakdown?.equipment || 'Standard'} ({b.quantity || 1})
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <ArrowUpRight className="w-4 h-4 text-[#43302E]/20" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Event History Section */}
                                    <div className="pt-6 border-t border-border-grey/50">
                                        <h4 className="text-[11px] font-bold text-[#43302E]/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                            <Clock className="w-4 h-4" />
                                            Event History
                                        </h4>
                                        <div className="space-y-3">
                                            {allBookings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(b => (
                                                <div key={b.id} className="text-[10px] space-y-1">
                                                    <div className="flex items-center justify-between font-bold text-[#43302E]/60">
                                                        <span>{b.client?.full_name || 'Client'}</span>
                                                        <span className="uppercase tracking-tighter text-[8px] bg-off-white px-2 py-0.5 rounded border border-border-grey/50">
                                                            {b.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 text-[#43302E]/40 font-medium">
                                                        <p>Booked on {format(new Date(b.created_at), 'MMM d, h:mm a')}</p>
                                                        {['cancelled_refunded', 'cancelled_charged', 'rejected'].includes(b.status?.toLowerCase()) && (
                                                            <p className="text-red-900/40 italic">
                                                                Cancelled on {format(new Date(b.updated_at), 'MMM d, h:mm a')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 pt-10 border-t border-border-grey flex justify-between items-center">
                                    <p className="text-[10px] text-slate font-bold uppercase tracking-widest">
                                        {bucketSlots.length} Active Slot(s) in this block
                                    </p>
                                    <button
                                        onClick={() => {
                                            setIsBucketModalOpen(false);
                                            setSingleDate(format(bucketTime.date, 'yyyy-MM-dd'));
                                            setSingleTime(`${bucketTime.hour.toString().padStart(2, '0')}:00`);
                                            setSingleEndTime(`${(bucketTime.hour + 1).toString().padStart(2, '0')}:00`);
                                            setAddMode('single');
                                            setIsAddModalOpen(true);
                                        }}
                                        className="bg-[#43302E] text-white px-8 py-4 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-tight active:scale-95 flex items-center gap-3"
                                    >
                                        <Plus className="w-4 h-4" /> Add Slot
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Profile Detail Modal */}
                {selectedProfile && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedProfile(null)}>
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 p-8 md:p-12 relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setSelectedProfile(null)} className="absolute top-6 right-6 p-2 hover:bg-charcoal/5 rounded-full transition-colors text-charcoal/20 hover:text-charcoal">
                                <X className="w-5 h-5" />
                            </button>

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
                                            <h4 className="text-[10px] font-black text-red-800 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                                                <AlertCircle className="w-4 h-4" /> PHYSICAL CONDITIONS
                                            </h4>
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

                            <button
                                onClick={() => setSelectedProfile(null)}
                                className="w-full py-6 bg-charcoal text-white rounded-[12px] text-[10px] font-black uppercase tracking-[0.4em] hover:brightness-[1.2] transition-all shadow-md active:scale-95"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                )}

        </div>
    );
}
