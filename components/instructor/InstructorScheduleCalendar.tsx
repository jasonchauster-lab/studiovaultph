'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, setHours, setMinutes, getDay, parse, differenceInMinutes, isPast, addDays, subDays, startOfMonth, endOfMonth, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Trash2, MapPin, X, User, Box, ArrowUpRight, MessageSquare, AlertTriangle, ChevronDown, ChevronUp, CheckCircle, Check, Pencil, Copy } from 'lucide-react'
import clsx from 'clsx'
import { toManilaDateStr, getManilaTodayStr, toManilaDate, getSlotDateTime } from '@/lib/timezone'
import { deleteAvailability, addAvailability } from '@/app/(dashboard)/instructor/schedule/actions'
import InstructorScheduleGenerator from './InstructorScheduleGenerator'
import ChatWindow from '@/components/dashboard/ChatWindow'
import Link from 'next/link'
import MobileScheduleCalendar from '@/components/dashboard/MobileScheduleCalendar'

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
    instructorProfile: {
        id: string;
        teaching_equipment?: string[];
        rates?: Record<string, number>;
    } | null;
}

export default function InstructorScheduleCalendar({ 
    availability, 
    bookings = [], 
    currentUserId, 
    currentDate = new Date(),
    instructorProfile
}: InstructorScheduleCalendarProps) {
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
    const [equipment, setEquipment] = useState<string[]>([])
    const [expandedCities, setExpandedCities] = useState<string[]>(['BGC', 'Makati'])

    const isProfileComplete = !!(
        instructorProfile?.teaching_equipment && 
        instructorProfile.teaching_equipment.length > 0 && 
        instructorProfile.rates && 
        Object.keys(instructorProfile.rates).length > 0
    );

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
            if (!a.start_time) return;
            const startH = parseInt(a.start_time.split(':')[0])
            if (isNaN(startH)) return;
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
            if (isNaN(startH)) return;
            const key = `${slot.date}-${startH}`
            if (!bMap[key]) bMap[key] = []
            bMap[key].push(b)
        })

        const hMap: Record<string, any[]> = {}
        historicalBookings.forEach(b => {
            const slot = b.slots
            if (!slot?.date || !slot?.start_time) return
            const startH = parseInt(slot.start_time.split(':')[0])
            if (isNaN(startH)) return;
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
        if (isSubmitting) return;
        if (!isProfileComplete) return;

        if (locations.length === 0) {
            alert('Please select at least one location');
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
            equipment: instructorProfile?.teaching_equipment || []
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

    const handleUpdate = async (id: string, formData: FormData) => {
        setIsSubmitting(true);

        const { updateAvailability } = await import('@/app/(dashboard)/instructor/schedule/actions')
        const result = await updateAvailability(id, formData)

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
        // Use slot's equipment if it has it, otherwise profile's
        setEquipment(slot.equipment || instructorProfile?.teaching_equipment || [])
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
        const city = loc?.split(' - ')[0] || loc || 'Studio';
        if (!acc[city]) acc[city] = [];
        acc[city].push(loc);
        return acc;
    }, {} as Record<string, string[]>);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {!isProfileComplete && (
                <div className="earth-card p-6 bg-burgundy/5 border border-burgundy/10 flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-burgundy/10 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-burgundy" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-burgundy uppercase tracking-[0.2em]">Profile Incomplete</p>
                            <p className="text-[10px] text-burgundy/60 uppercase tracking-[0.1em] font-bold">Please set your teaching equipment and rates to start adding sessions.</p>
                        </div>
                    </div>
                    <Link 
                        href="/instructor/profile" 
                        className="px-6 py-3 bg-burgundy text-buttermilk rounded-lg text-[9px] font-black uppercase tracking-[0.3em] hover:brightness-110 transition-all shadow-tight"
                    >
                        COMPLETE PROFILE
                    </Link>
                </div>
            )}

            <div className="lg:hidden">
                <MobileScheduleCalendar
                    onAddSlot={() => { setAddMode('single'); setIsAddModalOpen(true); }}
                    onRecurringSchedule={() => { setAddMode('bulk'); setIsAddModalOpen(true); }}
                    onSlotClick={(session) => {
                        // For instructor, session.id is either a booking ID or a slot ID
                        const booking = bookings.find(b => b.id === session.id);
                        if (booking) {
                            setSelectedBooking(booking);
                        } else {
                            const slot = availability.find(s => s.id === session.id);
                            if (slot) {
                                setEditingSlot(slot);
                                setSingleDate(slot.date || format(new Date(), 'yyyy-MM-dd'));
                                setSingleTime(slot.start_time.slice(0, 5));
                                setSingleEndTime(slot.end_time.slice(0, 5));
                                setIsEditModalOpen(true);
                            }
                        }
                    }}
                    initialSessions={(() => {
                        const items: any[] = [];
                        
                        // Add bookings
                        bookings.forEach(b => {
                            if (['pending', 'approved', 'completed'].includes(b.status)) {
                                items.push({
                                    id: b.id,
                                    title: b.client?.full_name || 'Booking',
                                    date: b.slots.date,
                                    start_time: b.slots.start_time,
                                    end_time: b.slots.end_time,
                                    type: 'booking',
                                    status: b.status
                                });
                            }
                        });

                        // Add availability slots
                        availability.forEach(s => {
                            if (s.date) {
                                items.push({
                                    id: s.id,
                                    title: 'Available',
                                    date: s.date,
                                    start_time: s.start_time,
                                    end_time: s.end_time,
                                    type: 'availability'
                                });
                            }
                        });

                        return items;
                    })()}
                />
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block space-y-10">
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
                        onClick={() => { 
                            setAddMode('single'); 
                            setIsAddModalOpen(true); 
                        }}
                        className={clsx(
                            "h-12 border-2 px-8 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-3 shadow-tight active:scale-95",
                            isProfileComplete 
                                ? "border-burgundy text-burgundy bg-white hover:bg-burgundy/5" 
                                : "border-burgundy/30 text-burgundy/60 bg-white hover:bg-burgundy/[0.02]"
                        )}
                    >
                        <Plus className="w-4 h-4" /> ADD SLOT
                    </button>
                    <button
                        onClick={() => { 
                            setAddMode('bulk'); 
                            setIsAddModalOpen(true); 
                        }}
                        className={clsx(
                            "px-8 py-3 text-[10px] tracking-[0.2em] rounded-lg font-bold flex items-center gap-3 transition-all",
                            isProfileComplete
                                ? "bg-burgundy text-buttermilk hover:brightness-110 shadow-tight active:scale-95"
                                : "bg-burgundy/70 text-buttermilk/70 hover:brightness-110 shadow-tight active:scale-95"
                        )}
                    >
                        <CalendarIcon className="w-4 h-4" /> RECURRING SCHEDULE
                    </button>
                </div>
            </div>



            {/* Calendar Grid */}
            <div className="bg-white border border-border-grey shadow-tight overflow-hidden rounded-[8px]">
                <div className="overflow-x-auto">
                    <div className={clsx("min-w-[800px] xl:min-w-full", view === 'month' && "min-w-0")}>
                        {view !== 'month' ? (
                            <div className={clsx("grid border-b border-border-grey bg-off-white", view === 'day' ? "grid-cols-[100px_1fr]" : "grid-cols-[100px_repeat(7,1fr)]")}>
                                <div className="p-6 text-[10px] font-black text-charcoal border-r border-border-grey sticky left-0 bg-white z-20 w-[100px] text-center uppercase tracking-[0.3em] flex items-center justify-center"></div>
                                {days.map(day => (
                                    <div key={day.toString()} className={clsx("p-6 text-center border-r border-border-grey last:border-r-0 transition-all relative", isSameDay(day, new Date()) ? "bg-buttermilk/20" : "")}>
                                        <div className="text-[10px] text-slate font-black uppercase tracking-[0.3em] mb-2">{format(day, 'EEE')}</div>
                                        <div className={clsx("text-3xl font-serif font-black tracking-tighter", isSameDay(day, new Date()) ? "text-burgundy" : "text-charcoal")}>{format(day, 'd')}</div>
                                        {isSameDay(day, new Date()) && (
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-burgundy rounded-t-full" />
                                        )}
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
                                                    left: view === 'day' ? '100px' : `calc(100px + ${todayIdx} * (100% - 100px) / 7)`,
                                                    width: view === 'day' ? 'calc(100% - 100px)' : 'calc((100% - 100px) / 7)'
                                                }}
                                            >
                                                <div className="w-[12px] h-[12px] bg-burgundy rounded-full -ml-[6px] ring-2 ring-white shadow-sm" />
                                                <div className="h-[3px] w-full bg-burgundy shadow-[0_0_12px_rgba(67,48,46,0.4)]" />
                                            </div>
                                        )
                                    })()}

                                    {hours.map(hour => (
                                        <div key={hour} className={clsx("grid", view === 'day' ? "grid-cols-[100px_1fr]" : "grid-cols-[100px_repeat(7,1fr)]")} style={{ minHeight: `${ROW_HEIGHT}px` }}>
                                            <div className="p-4 text-[10px] text-slate font-black border-r border-border-grey text-center sticky left-0 bg-white z-20 w-[100px] flex items-center justify-center tracking-[0.2em]">
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
                                                    const shortLoc = slot.location_area?.split(' - ')[0] || slot.location_area || 'Studio'

                                                    if (!acc[key]) {
                                                        acc[key] = {
                                                            primarySlot: slot,
                                                            allSlots: [slot],
                                                            locations: [slot.location_area],
                                                            equipment: [...(slot.equipment || [])]
                                                        }
                                                    } else {
                                                        acc[key].allSlots.push(slot)
                                                        if (!acc[key].locations.some(l => (l?.split(' - ')[0] || l) === shortLoc)) {
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
                                                    ...startingBookings.map(b => {
                                                        const slot = Array.isArray(b.slots) ? b.slots[0] : b.slots;
                                                        return { 
                                                            type: 'booking' as const, 
                                                            id: b.id, 
                                                            data: b, 
                                                            start: slot?.start_time || '00:00:00', 
                                                            end: slot?.end_time || '00:00:00' 
                                                        };
                                                    })
                                                ];

                                                const isToday = isSameDay(day, new Date())

                                                return (
                                                    <div key={day.toString() + hour} className={clsx("border-r border-border-grey last:border-r-0 relative group p-1 min-h-[100px]", isPastCell ? "bg-gray-50" : isToday ? "bg-buttermilk/10" : "")} style={{ minHeight: `${ROW_HEIGHT}px` }}>
                                                        <div
                                                            className={clsx(
                                                                "absolute inset-0 transition-all duration-700 bg-forest/5 cursor-pointer z-0 flex items-center justify-center",
                                                                "opacity-0 lg:group-hover:opacity-100", // Hidden on large, shown on hover
                                                                "md:opacity-10 md:hover:opacity-100" // Always slightly visible on small/tablet
                                                            )}
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setSingleDate(format(day, 'yyyy-MM-dd'))
                                                                setSingleTime(`${hour.toString().padStart(2, '0')}:00`)
                                                                setSingleEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`)
                                                                setAddMode('single')
                                                                setIsAddModalOpen(true)
                                                            }}
                                                        >
                                                            <Plus className="w-5 h-5 text-forest/20 lg:hidden" />
                                                        </div>

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
                                                                return (                                                                    <div
                                                                        key={slot.id}
                                                                        className={clsx(
                                                                            "absolute rounded-lg text-[10px] hover:shadow-card hover:scale-[1.01] transition-all duration-300 cursor-pointer overflow-hidden border z-10 p-2 group/slot flex flex-col justify-between session-block-earth",
                                                                            isPastCell
                                                                                ? "bg-off-white border-border-grey text-slate"
                                                                                : "bg-green-50/50 border-green-200 text-green-900",
                                                                            duration < 45 && "py-2 px-3 justify-center"
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
                                                                    >                                                                        <div className={clsx("flex items-center gap-1.5", duration < 45 ? "flex-row" : "flex-col items-start")}>
                                                                            <div className="flex items-center gap-1 font-bold text-[8px] text-charcoal/60 uppercase tracking-tighter shrink-0">
                                                                                <Clock className={clsx(duration < 45 ? "w-2 h-2" : "w-2.5 h-2.5", "text-burgundy/30")} />
                                                                                <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                                                            </div>
                                                                            <div className="flex flex-wrap items-center gap-1">
                                                                                {locations.map((loc, idx) => (
                                                                                    <div key={(loc || 'loc') + idx} className="text-[7.5px] font-bold uppercase tracking-tight flex items-center gap-1 text-slate px-1.5 py-0.5 rounded border border-border-grey bg-white/50">
                                                                                        <MapPin className="w-2.5 h-2.5 text-slate/40" />
                                                                                        <span className="truncate max-w-[80px]">{loc?.split(' - ')[0] || loc || 'Studio'}</span>
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
                                                                            "absolute rounded-lg text-[10px] z-20 p-2 overflow-hidden transition-all duration-300 hover:scale-[1.03] cursor-pointer group/booking flex flex-col justify-between shadow-tight border border-burgundy/10 bg-white",
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
                                                                            const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots;
                                                                            if (slot?.start_time && slot?.date) {
                                                                                const startH = parseInt(slot.start_time.split(':')[0]);
                                                                                setCurrentSlotHistory(historyMap[`${slot.date}-${startH}`] || []);
                                                                            }
                                                                            setSelectedBooking(booking);
                                                                        }}
                                                                    >
                                                                        <div className={clsx("flex justify-between items-start w-full", duration < 45 && "items-center")}>
                                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                                <span className="text-[8.5px] font-black text-burgundy uppercase tracking-tight truncate">
                                                                                    {booking.client?.full_name || 'Session'}
                                                                                </span>
                                                                                {duration >= 45 && (
                                                                                    <>
                                                                                        <span className="text-[7px] font-black text-burgundy/60 uppercase tracking-tighter mt-0.5 truncate">
                                                                                            {studioName}
                                                                                        </span>
                                                                                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                                                                            {slotData.studios?.location && (
                                                                                                <div className="text-[7.5px] font-bold uppercase tracking-tight flex items-center gap-1 text-slate px-1.5 py-0.5 rounded border border-border-grey bg-white/50">
                                                                                                    <MapPin className="w-2.5 h-2.5 shrink-0 text-slate/40" />
                                                                                                    <span className="truncate max-w-[60px]">{slotData.studios.location.split(' - ')[0] || 'Studio'}</span>
                                                                                                </div>
                                                                                            )}
                                                                                            {Array.isArray(slotData.equipment) && slotData.equipment.map((eq: string, idx: number) => (
                                                                                                <div key={eq + idx} className="text-[7.5px] font-bold uppercase tracking-tight flex items-center gap-1 text-burgundy/60 px-1.5 py-0.5 rounded border border-burgundy/10 bg-buttermilk/10">
                                                                                                    <Box className="w-2.5 h-2.5 shrink-0" />
                                                                                                    <span className="truncate max-w-[60px]">{eq}</span>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[8px] font-black text-burgundy bg-buttermilk/40 px-1 py-0.5 rounded border border-burgundy/5 whitespace-nowrap ml-2">
                                                                                {Math.min(booking.quantity || 1, 1)}/1
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

                                        // 3. Group everything by time and equipment
                                        const groups: Record<string, {
                                            time: string,
                                            total: number,
                                            booked: number,
                                            equipment: string[],
                                            processedSlotIds: Set<string>,
                                            ref?: any
                                        }> = {};
                                        
                                        const getShortEquipment = (eqs: string[] | undefined) => (eqs && eqs.length > 0) ? eqs[0] : 'Session';

                                        allDayAvailability.forEach(a => {
                                            const time = a.start_time.slice(0, 5);
                                            // Key by time only to consolidate multiple availability locations into one "slot" for the instructor
                                            const key = time;

                                            if (!groups[key]) {
                                                groups[key] = { 
                                                    time, 
                                                    total: 1, 
                                                    booked: 0, 
                                                    equipment: ['Session'], 
                                                    processedSlotIds: new Set(),
                                                    ref: a // Store reference to availability
                                                };
                                            }
                                            
                                            // Ensure total is capped at 1 for instructor-only view
                                            groups[key].total = 1;
                                        });

                                        dayBookings.forEach(b => {
                                            const s = b.slots;
                                            const time = s.start_time.slice(0, 5);
                                            const key = time;
                                            const bQty = b.quantity || 1;

                                            if (groups[key]) {
                                                groups[key].booked = Math.max(groups[key].booked, bQty);
                                                // Always cap at 1 for instructor perspective
                                                groups[key].total = 1;
                                            } else {
                                                groups[key] = {
                                                    time,
                                                    total: 1,
                                                    booked: bQty,
                                                    equipment: ['Session'],
                                                    processedSlotIds: new Set(),
                                                    ref: b // Store reference to booking
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
                                                    router.push(`?date=${dayStr}`);
                                                }}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className={clsx(
                                                        "text-xs font-serif font-bold",
                                                        isSameDay(day, new Date()) ? "text-forest" : "text-charcoal"
                                                    )}>
                                                        {format(day, 'd')}
                                                    </span>
                                                </div>
                                                <div className="space-y-1">
                                                    {sortedSessions.slice(0, 4).map((s) => (
                                                        <div 
                                                            key={`${s.time}`} 
                                                            className="text-[8px] font-bold text-slate truncate uppercase tracking-tighter flex items-center justify-between hover:bg-forest/10 p-0.5 rounded transition-colors cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (s.booked > 0 && s.ref?.client) {
                                                                    setSelectedBooking(s.ref);
                                                                } else if (s.ref) {
                                                                    openEditModal(s.ref);
                                                                }
                                                            }}
                                                        >
                                                            <span className="truncate mr-2">• {s.time} SESSION</span>
                                                            <span className="shrink-0 font-bold text-[#43302E]/60 uppercase tracking-tighter bg-[#43302E]/5 px-1 rounded">
                                                                {Math.min(s.booked, 1)}/1
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
            </div>

            {/* Modals & Chat */}

            {/* Modals & Chat */}

            {/* Modals & Chat */}

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

                        {!isProfileComplete && (
                            <div className="mb-10 p-6 bg-red-50 border border-red-100 rounded-xl flex items-start gap-4">
                                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-[10px] font-bold text-red-800 uppercase tracking-widest mb-1">Incomplete Profile</p>
                                    <p className="text-[10px] text-red-600/80 leading-relaxed uppercase tracking-wider">
                                        Please fill out your <Link href="/instructor/profile" className="underline font-bold hover:text-red-800">teaching equipment</Link> and <Link href="/instructor/profile" className="underline font-bold hover:text-red-800">rates</Link> in your profile to be able to set your schedule.
                                    </p>
                                </div>
                            </div>
                        )}

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
                                                                    const displayName = area?.split(' - ')[1] || area || 'Studio';
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

                                {/* Equipment picker removed - automatically uses profile equipment */}

                                <div className="flex gap-6 pt-10">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !isProfileComplete}
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
                            <InstructorScheduleGenerator 
                                initialAvailability={[]} 
                                teachingEquipment={instructorProfile?.teaching_equipment || []}
                            />
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

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target as HTMLFormElement);
                                formData.set('equipment', JSON.stringify(instructorProfile?.teaching_equipment || []));
                                handleUpdate(editingSlot.id, formData);
                            }} className="space-y-6">
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
                                                                    const displayName = area?.split(' - ')[1] || area || 'Studio';
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

                                {/* Equipment picker removed - automatically uses profile equipment */}

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
                            {/* Header Cluster (Status + Actions) */}
                            <div className="absolute top-6 right-8 flex items-center gap-4">
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

                                <div className="flex items-center gap-1">
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
                            </div>

                            {(() => {
                                const slot = selectedBooking.slots;
                                const startH = slot?.start_time ? parseInt(slot.start_time.split(':')[0]) : -1;
                                const key = slot?.date && startH !== -1 ? `${slot.date}-${startH}` : '';
                                const currentSlotHistory = key ? (historyMap[key] || []) : [];
                                
                                return (
                                    <>

                            {/* Actual Content */}
                            <div className="space-y-6 px-8 pt-10">
                                <div className="flex items-center pt-2">
                                    <h3 className="text-3xl font-serif text-[#43302E] tracking-tighter text-left">
                                        {selectedBooking.price_breakdown?.equipment || 'Standard Session'}
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-[#43302E]">
                                        <Clock className="w-4 h-4 opacity-40 shrink-0" />
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-left">
                                            {(() => {
                                                if (!selectedBooking.slots?.date) return 'Session Time';
                                                try {
                                                    const dateObj = new Date(selectedBooking.slots.date);
                                                    if (isNaN(dateObj.getTime())) return 'Session Time';
                                                    return `${format(dateObj, 'EEEE, MMMM d')} • ${selectedBooking.slots.start_time?.slice(0, 5) || '00:00'} - ${selectedBooking.slots.end_time?.slice(0, 5) || '00:00'}`;
                                                } catch (e) {
                                                    return 'Session Time';
                                                }
                                            })()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[#43302E]">
                                        <MapPin className="w-4 h-4 opacity-40 shrink-0" />
                                        <div className="flex items-baseline gap-2 flex-1 min-w-0">
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-left truncate">
                                                {selectedBooking.slots?.studios?.name || 'Studio'} - {selectedBooking.slots?.studios?.location || 'Studio Location'}
                                            </span>
                                            <a
                                                href={selectedBooking.slots?.studios?.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedBooking.slots?.studios?.name || ''} ${selectedBooking.slots?.studios?.location || ''}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-[10px] font-bold text-[#43302E] underline decoration-[#43302E]/20 hover:text-forest hover:decoration-forest transition-all shrink-0 whitespace-nowrap"
                                            >
                                                View on Maps
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {(() => {
                                    const qty = selectedBooking.quantity || 1;
                                    const equipment = Array.isArray(selectedBooking.slots?.equipment) && selectedBooking.slots.equipment.length > 0
                                        ? selectedBooking.slots.equipment[0]
                                        : (selectedBooking.price_breakdown?.equipment || 'SESSION');
                                    
                                    return (
                                        <div className="pt-6 border-t border-[#E5E7EB] flex items-center justify-between">
                                            <span className="text-[10px] font-black text-[#43302E] uppercase tracking-[0.3em]">
                                                {qty} {equipment} BOOKED
                                            </span>
                                            <span className="text-[10px] font-black text-[#6B5A58] uppercase tracking-widest">
                                                {currentSlotHistory.length} CANCELLED
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Booked Section */}
                            <div className="space-y-6 px-8">
                                <div className="flex items-center justify-between border-b border-[#43302E]/10 pb-4">
                                    <h4 className="text-[10px] font-black text-[#43302E] uppercase tracking-[0.3em]">
                                        {(() => {
                                            const qty = selectedBooking.quantity || 1;
                                            const equipment = Array.isArray(selectedBooking.slots?.equipment) && selectedBooking.slots.equipment.length > 0
                                                ? selectedBooking.slots.equipment[0]
                                                : (selectedBooking.price_breakdown?.equipment || 'SESSION');
                                            return `${qty} ${equipment} Booked`;
                                        })()}
                                    </h4>
                                    <span className="text-[10px] font-black text-[#43302E]/40 uppercase tracking-widest">
                                        {currentSlotHistory.length} Cancelled
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div
                                        onClick={() => selectedBooking.client && setSelectedProfile(selectedBooking.client)}
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
                            <div className="pt-6 border-t border-[#43302E]/10 mt-10 px-8">
                                <h4 className="text-[10px] font-black text-[#43302E] uppercase tracking-[0.3em] mb-4 flex items-center gap-3 text-left">
                                    <Clock className="w-4 h-4 opacity-40" />
                                    Event History
                                </h4>
                                <div className="space-y-3">
                                    <div className="text-[10px] space-y-1 text-left">
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
                                        <div key={h.id} className="text-[10px] space-y-1 opacity-60 text-left">
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

                            <div className="flex gap-4 pt-4 px-8 pb-8">
                                <button
                                    onClick={() => {
                                        setActiveChat({
                                            id: selectedBooking.id,
                                            recipientId: selectedBooking.client_id,
                                            name: selectedBooking.client?.full_name || 'Client'
                                        });
                                        setSelectedBooking(null);
                                    }}
                                    className="flex-1 bg-[#43302E] text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:brightness-125 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <MessageSquare className="w-4 h-4" /> Message Client
                                </button>
                            </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )
            }

            {/* Profile Detail Modal */}
            {selectedProfile && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-charcoal/40 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={() => setSelectedProfile(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 p-10 md:p-14 relative" onClick={e => e.stopPropagation()}>
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
                                 const conditions = Array.isArray(selectedProfile.medical_conditions)
                                     ? selectedProfile.medical_conditions
                                     : typeof selectedProfile.medical_conditions === 'string'
                                         ? selectedProfile.medical_conditions.split(',').map((c: string) => c.trim())
                                         : [];

                                 const displayConditions = conditions
                                     .map((c: any) => {
                                         if (!c) return null;
                                         const conditionStr = String(c);
                                         return conditionStr === 'Others' ? (selectedProfile.other_medical_condition || 'Other Conditions') : conditionStr;
                                     })
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
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 p-10 md:p-14 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedStudio(null)} className="absolute top-6 right-6 p-2 hover:bg-charcoal/5 rounded-full transition-colors text-charcoal/20 hover:text-charcoal"><X className="w-5 h-5" /></button>
                        <div className="flex flex-col items-center text-center mb-10">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden mb-6 border-4 border-white shadow-tight relative z-10 bg-white">
                                <img src={selectedStudio.logo_url || "/logo2.jpg"} className="w-full h-full object-contain p-2 mix-blend-multiply" />
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
                                {selectedStudio && (
                                    <a 
                                        href={selectedStudio.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedStudio.name} ${selectedStudio.location}`)}`}
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center justify-between p-4 bg-white border border-border-grey rounded-xl shadow-tight hover:border-forest/40 hover:bg-forest/5 transition-all group"
                                    >
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
