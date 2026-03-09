'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, setHours, setMinutes, getDay, parse, differenceInMinutes, isPast } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Trash2, MapPin, X, User, Box, ArrowUpRight, MessageSquare, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { toManilaDateStr, getManilaTodayStr } from '@/lib/timezone'
import { deleteAvailability, addAvailability } from '@/app/(dashboard)/instructor/schedule/actions'
import InstructorScheduleGenerator from './InstructorScheduleGenerator'

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
    currentDate?: Date // Made optional with default
}

export default function InstructorScheduleCalendar({ availability, bookings = [], currentDate = new Date() }: InstructorScheduleCalendarProps) {
    const router = useRouter()
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedBooking, setSelectedBooking] = useState<any>(null)

    // Single Add Form State
    const [singleDate, setSingleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [singleTime, setSingleTime] = useState('09:00')
    const [singleEndTime, setSingleEndTime] = useState('10:00')
    const [locations, setLocations] = useState<string[]>(['BGC - High Street'])
    const [equipment, setEquipment] = useState<string[]>(['Reformer'])

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
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 9 PM
    const ROW_HEIGHT = 120 // Increased from 80 for better readability

    const handlePrevWeek = () => {
        const newDate = subWeeks(currentDate, 1)
        router.push(`?date=${toManilaDateStr(newDate)}`)
    }

    const handleNextWeek = () => {
        const newDate = addWeeks(currentDate, 1)
        router.push(`?date=${toManilaDateStr(newDate)}`)
    }

    const handleToday = () => {
        router.push('?date=' + getManilaTodayStr())
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this availability?')) return;
        setIsSubmitting(true)
        await deleteAvailability(id)
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/50 shadow-xl shadow-charcoal/5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <h2 className="text-3xl font-serif text-charcoal hidden md:block min-w-[200px] tracking-tight">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30 group-focus-within:text-rose-gold transition-colors" />
                            <input
                                type="date"
                                value={format(currentDate, 'yyyy-MM-dd')}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        router.push(`?date=${e.target.value}`)
                                    }
                                }}
                                className="pl-10 pr-4 py-2 border border-cream-200 rounded-xl text-xs font-black bg-white/60 text-charcoal outline-none focus:ring-2 focus:ring-rose-gold/20 focus:bg-white transition-all cursor-pointer uppercase tracking-widest"
                                title="Select any specific date"
                            />
                        </div>
                        <div className="flex items-center bg-alabaster/50 backdrop-blur-sm rounded-xl p-1 border border-cream-100">
                            <button onClick={handlePrevWeek} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white rounded-lg transition-all text-charcoal/60 hover:text-charcoal text-[10px] font-black uppercase tracking-widest" title="Previous Week">
                                <ChevronLeft className="w-3.5 h-3.5" /> PREV
                            </button>
                            <button onClick={handleToday} className="px-5 py-1.5 text-[10px] font-black text-charcoal uppercase tracking-widest hover:bg-white rounded-lg transition-all border-x border-cream-100 mx-1" title="Go to Current week">
                                TODAY
                            </button>
                            <button onClick={handleNextWeek} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white rounded-lg transition-all text-charcoal/60 hover:text-charcoal text-[10px] font-black uppercase tracking-widest" title="Next Week">
                                NEXT <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => { setAddMode('single'); setIsAddModalOpen(true); }}
                        className="bg-rose-gold text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] hover:brightness-110 transition-all flex items-center gap-2.5 shadow-md shadow-rose-gold/20"
                    >
                        <Plus className="w-3.5 h-3.5 stroke-[3px]" /> ADD SLOT
                    </button>
                    <button
                        onClick={() => { setAddMode('bulk'); setIsAddModalOpen(true); }}
                        className="bg-white/80 border border-cream-200 text-charcoal px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-white transition-all flex items-center gap-2.5 shadow-sm"
                    >
                        <CalendarIcon className="w-3.5 h-3.5" /> BULK GENERATE
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="glass-card overflow-hidden">
                <div className="min-w-[900px]">
                    <div className="grid grid-cols-8 border-b border-cream-100 bg-alabaster/50">
                        <div className="p-5 text-[10px] font-black text-charcoal/40 border-r border-cream-100 sticky left-0 bg-alabaster/80 backdrop-blur-md z-20 w-24 text-center uppercase tracking-[0.2em]">EPOCH</div>
                        {days.map(day => (
                            <div key={day.toString()} className={clsx("p-5 text-center border-r border-cream-100 last:border-r-0 min-w-[110px] transition-colors duration-500", isSameDay(day, new Date()) ? "bg-rose-gold/5" : "")}>
                                <div className="text-[10px] text-charcoal/40 font-black uppercase tracking-[0.2em] mb-2">{format(day, 'EEE')}</div>
                                <div className={clsx("text-2xl font-serif", isSameDay(day, new Date()) ? "text-rose-gold" : "text-charcoal")}>{format(day, 'd')}</div>
                            </div>
                        ))}
                    </div>

                    <div className="divide-y divide-cream-50 relative">
                        {hours.map(hour => (
                            <div key={hour} className="grid grid-cols-8" style={{ minHeight: `${ROW_HEIGHT}px` }}>
                                <div className="p-4 text-[10px] text-charcoal/30 font-black border-r border-cream-100 text-center sticky left-0 bg-white/80 backdrop-blur-md z-20 w-24 flex items-center justify-center tracking-widest">
                                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                </div>

                                {days.map(day => {
                                    const dayStr = toManilaDateStr(day)
                                    const startTotalCell = hour * 60

                                    const startingSlots = availability.filter(a => {
                                        if (a.date) {
                                            if (a.date !== dayStr) return false
                                        } else {
                                            if (a.day_of_week !== getDay(day)) return false
                                        }
                                        const startH = parseInt(a.start_time.split(':')[0])
                                        return startH === hour
                                    })

                                    const startingBookings = bookings.filter(b => {
                                        const slot = b.slots;
                                        if (!slot?.date || !slot?.start_time) return false;
                                        if (slot.date !== dayStr) return false;
                                        if (['cancelled_refunded', 'rejected', 'expired'].includes(b.status)) return false;
                                        const startH = parseInt(slot.start_time.split(':')[0]);
                                        return startH === hour;
                                    })

                                    const isPastCell = isPast(setMinutes(setHours(day, hour + 1), 0))

                                    return (
                                        <div key={day.toString() + hour} className={clsx("border-r border-cream-50 last:border-r-0 relative group p-0", isPastCell && "bg-alabaster/20")} style={{ minHeight: `${ROW_HEIGHT}px` }}>
                                            <div
                                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-sage/5 cursor-pointer z-0"
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
                                                    if (!acc[key]) {
                                                        acc[key] = {
                                                            primarySlot: slot,
                                                            allSlots: [slot],
                                                            locations: [slot.location_area],
                                                            equipment: [...(slot.equipment || [])]
                                                        }
                                                    } else {
                                                        acc[key].allSlots.push(slot)
                                                        if (!acc[key].locations.includes(slot.location_area)) {
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
                                                    const extraLocCount = locations.length - 1;
                                                    const primaryEq = equipment.length > 0 ? equipment[0] : null;
                                                    const extraEqCount = equipment.length > 1 ? equipment.length - 1 : 0;

                                                    return (
                                                        <div
                                                            key={slot.id}
                                                            className={clsx(
                                                                "absolute rounded-xl text-[10px] hover:shadow-xl hover:scale-[1.02] transition-all duration-500 cursor-pointer overflow-hidden border z-10 p-3 group/slot flex flex-col gap-2",
                                                                isPastCell
                                                                    ? "bg-alabaster/40 border-cream-100 text-charcoal/20 opacity-50"
                                                                    : "bg-white border-rose-gold/20 text-charcoal shadow-sm",
                                                                duration < 45 && "py-1.5 px-3 justify-center"
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
                                                                <div className="flex items-center gap-2 font-black text-[9px] text-charcoal uppercase tracking-widest shrink-0">
                                                                    <Clock className={clsx(duration < 45 ? "w-3 h-3" : "w-3.5 h-3.5", isPastCell ? "text-charcoal/10" : "text-rose-gold")} />
                                                                    <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    <div className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1 bg-alabaster px-2 py-0.5 rounded-lg border border-cream-100">
                                                                        <MapPin className="w-2.5 h-2.5 text-charcoal/30" />
                                                                        <span className="truncate max-w-[80px]">{locations[0].split(' - ')[1] || locations[0]}</span>
                                                                    </div>
                                                                    {extraLocCount > 0 && duration >= 45 && (
                                                                        <div className="text-[8px] font-black text-rose-gold bg-rose-gold/5 px-2 py-0.5 rounded-lg border border-rose-gold/20">+{extraLocCount} AREAS</div>
                                                                    )}
                                                                </div>

                                                                {primaryEq && duration >= 45 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5 mt-auto">
                                                                        <div className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1 bg-sage/5 text-sage px-2 py-0.5 rounded-lg border border-sage/10">
                                                                            <Box className="w-2.5 h-2.5" />
                                                                            <span>{primaryEq}</span>
                                                                        </div>
                                                                        {extraEqCount > 0 && (
                                                                            <div className="text-[8px] font-black text-charcoal/40">+{extraEqCount} NEXT</div>
                                                                        )}
                                                                    </div>
                                                                )}
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
                                                            "absolute rounded-xl text-[10px] shadow-lg border z-20 p-4 overflow-hidden transition-all duration-500 hover:scale-[1.03] cursor-pointer group/booking flex flex-col",
                                                            isPastCell
                                                                ? "bg-alabaster/60 border-cream-100 text-charcoal/20 opacity-80"
                                                                : booking.status === 'approved'
                                                                    ? "bg-sage/10 border-sage/30 text-charcoal"
                                                                    : "bg-gold/10 border-gold/30 text-charcoal",
                                                            duration < 45 && "flex-row items-center gap-3 py-1.5 px-3"
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
                                                                <div className="text-[8px] font-black uppercase tracking-widest text-charcoal/40">{booking.status === 'approved' ? 'RESERVED' : 'VERIFICATION'}</div>
                                                                <div className="text-[9px] font-bold text-charcoal truncate">{studioName}</div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className={clsx(
                                                                        "text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-lg border",
                                                                        booking.status === 'approved' ? "bg-sage/20 border-sage/30 text-sage" : "bg-gold/20 border-gold/30 text-gold"
                                                                    )}>
                                                                        {booking.status === 'approved' ? 'RESERVED' : 'VERIFICATION'}
                                                                    </div>
                                                                    <ArrowUpRight className="w-3.5 h-3.5 text-charcoal/20 group-hover/booking:text-charcoal transition-colors" />
                                                                </div>
                                                                <div className="text-[10px] font-black uppercase tracking-widest text-charcoal mb-1 flex items-center gap-2">
                                                                    <MapPin className="w-3 h-3 text-charcoal/20" />
                                                                    <span className="truncate">{studioName}</span>
                                                                </div>
                                                                <div className="text-[10px] font-medium text-charcoal/60 italic flex items-center gap-2 mt-auto">
                                                                    <User className="w-3 h-3 text-charcoal/20" />
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
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-charcoal/40 backdrop-blur-xl animate-in fade-in duration-500"
                    onClick={() => setIsAddModalOpen(false)}
                >
                    <div
                        className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl border border-white/50 animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-2xl font-serif text-charcoal">
                                    {addMode === 'bulk' ? 'Recursive Sequence' : 'Temporal Alignment'}
                                </h3>
                                <p className="text-[10px] text-charcoal/40 font-black uppercase tracking-[0.2em] mt-1">
                                    {addMode === 'bulk' ? 'GENERATING RECURRING SCHEDULE BLOX' : 'DEFINING A SINGLE OPERATIONAL SLOT'}
                                </p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-alabaster rounded-2xl text-charcoal/40 hover:text-charcoal hover:bg-cream-100 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {addMode === 'bulk' ? (
                            <InstructorScheduleGenerator initialAvailability={[]} />
                        ) : (
                            <form onSubmit={handleCreateSingle} className="space-y-8">
                                <div className="glass-card p-8 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] mb-3">Calendar Date</label>
                                        <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-5 py-3 border border-cream-100 rounded-2xl bg-white/60 text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-rose-gold/10 focus:bg-white focus:border-rose-gold/30 transition-all uppercase tracking-widest cursor-pointer" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] mb-3">Initiation</label>
                                            <input name="startTime" type="time" required value={singleTime} onChange={(e) => setSingleTime(e.target.value)} className="w-full px-5 py-3 border border-cream-100 rounded-2xl bg-white/60 text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-rose-gold/10 focus:bg-white focus:border-rose-gold/30 transition-all uppercase tracking-widest cursor-pointer" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] mb-3">Termination</label>
                                            <input name="endTime" type="time" required value={singleEndTime} onChange={(e) => setSingleEndTime(e.target.value)} className="w-full px-5 py-3 border border-cream-100 rounded-2xl bg-white/60 text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-rose-gold/10 focus:bg-white focus:border-rose-gold/30 transition-all uppercase tracking-widest cursor-pointer" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em]">Geographic Deployment</h4>
                                    <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Object.entries(GROUPED_AREAS).map(([city, cityLocations]) => {
                                            const allSelected = cityLocations.every(loc => locations.includes(loc));
                                            return (
                                                <div key={city} className="glass-card p-6 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-charcoal uppercase tracking-[0.15em]">{city}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCityGroup(cityLocations)}
                                                            className="text-[9px] font-black text-rose-gold hover:text-charcoal transition-colors uppercase tracking-widest underline decoration-rose-gold/20 underline-offset-4"
                                                        >
                                                            {allSelected ? 'DESELECT SEQUENCE' : 'ACTIVATE ALL'}
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {cityLocations.map(area => {
                                                            const isSelected = locations.includes(area);
                                                            const displayName = area.split(' - ')[1] || area;
                                                            return (
                                                                <button
                                                                    key={area}
                                                                    type="button"
                                                                    onClick={() => toggleLocation(area)}
                                                                    className={clsx(
                                                                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 border",
                                                                        isSelected
                                                                            ? "bg-rose-gold text-white border-rose-gold shadow-lg shadow-rose-gold/20"
                                                                            : "bg-white/60 text-charcoal/40 border-cream-100 hover:border-rose-gold/30 hover:text-charcoal"
                                                                    )}
                                                                >
                                                                    {displayName}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em]">Equipment Matrix</h4>
                                    <div className="flex flex-wrap gap-3 p-6 bg-alabaster/50 rounded-[2rem] border border-cream-100">
                                        {['Reformer', 'Tower', 'Cadillac', 'Chair', 'Mat', 'Barre'].map(eq => {
                                            const isSelected = equipment.includes(eq);
                                            return (
                                                <button
                                                    key={eq}
                                                    type="button"
                                                    onClick={() => toggleEquipment(eq)}
                                                    className={clsx(
                                                        "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 border",
                                                        isSelected
                                                            ? "bg-sage text-white border-sage shadow-lg shadow-sage/20"
                                                            : "bg-white text-charcoal/40 border-cream-100 hover:border-sage/30 hover:text-charcoal"
                                                    )}
                                                >
                                                    {eq}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 bg-charcoal text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-charcoal/10 active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'PROCESSING...' : 'COMMIT SLOT'}
                                    </button>
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-10 py-4 rounded-2xl text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] hover:text-charcoal hover:bg-alabaster transition-all">
                                        ABORT
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && editingSlot && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-charcoal/40 backdrop-blur-xl animate-in fade-in duration-500"
                    onClick={() => setIsEditModalOpen(false)}
                >
                    <div
                        className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl border border-white/50 animate-in zoom-in-95 duration-500 overflow-y-auto max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-2xl font-serif text-charcoal">Edit Constraints</h3>
                                <p className="text-[10px] text-charcoal/40 font-black uppercase tracking-[0.2em] mt-1">MODIFYING DEPLOYED OPERATIONAL BLOC</p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-alabaster rounded-2xl text-charcoal/40 hover:text-charcoal hover:bg-cream-100 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-8">
                            <div className="glass-card p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] mb-3">Re-entry Date</label>
                                    <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-5 py-3 border border-cream-100 rounded-2xl bg-white/60 text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-rose-gold/10 focus:bg-white focus:border-rose-gold/30 transition-all uppercase tracking-widest cursor-pointer" />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] mb-3">Modified Start</label>
                                        <input name="startTime" type="time" required value={singleTime} onChange={(e) => setSingleTime(e.target.value)} className="w-full px-5 py-3 border border-cream-100 rounded-2xl bg-white/60 text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-rose-gold/10 focus:bg-white focus:border-rose-gold/30 transition-all uppercase tracking-widest cursor-pointer" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] mb-3">Modified End</label>
                                        <input name="endTime" type="time" required value={singleEndTime} onChange={(e) => setSingleEndTime(e.target.value)} className="w-full px-5 py-3 border border-cream-100 rounded-2xl bg-white/60 text-charcoal font-black text-[10px] outline-none focus:ring-4 focus:ring-rose-gold/10 focus:bg-white focus:border-rose-gold/30 transition-all uppercase tracking-widest cursor-pointer" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] ml-4">Deployment Area</label>
                                <select
                                    value={locations[0] || 'BGC'}
                                    onChange={(e) => setLocations([e.target.value])}
                                    className="w-full px-6 py-4 border border-cream-100 rounded-[2rem] bg-white text-[10px] font-black text-charcoal outline-none focus:ring-4 focus:ring-rose-gold/10 focus:border-rose-gold/30 transition-all uppercase tracking-[0.15em] cursor-pointer appearance-none shadow-sm"
                                    name="location"
                                >
                                    {AREAS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em] ml-4">Equipment Apparatus</label>
                                <div className="flex flex-wrap gap-3 p-6 bg-alabaster/50 rounded-[2rem] border border-cream-100">
                                    {['Reformer', 'Tower', 'Cadillac', 'Chair', 'Mat', 'Barre'].map(eq => {
                                        const isSelected = equipment.includes(eq);
                                        return (
                                            <button
                                                key={eq}
                                                type="button"
                                                onClick={() => toggleEquipment(eq)}
                                                className={clsx(
                                                    "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 border",
                                                    isSelected
                                                        ? "bg-sage text-white border-sage shadow-lg shadow-sage/20"
                                                        : "bg-white text-charcoal/40 border-cream-100 hover:border-sage/30 hover:text-charcoal"
                                                )}
                                            >
                                                {eq}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-10 border-t border-cream-100">
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-charcoal text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-charcoal/10 active:scale-[0.98] disabled:opacity-50">
                                    {isSubmitting ? 'SYNCHRONIZING...' : 'UPDATE ARCHIVE'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false)
                                        handleDelete(editingSlot.id)
                                    }}
                                    disabled={isSubmitting}
                                    className="px-8 py-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> PURGE
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Booking Detail Modal */}
            {selectedBooking && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-charcoal/60 backdrop-blur-2xl animate-in fade-in duration-500"
                    onClick={() => setSelectedBooking(null)}
                >
                    <div
                        className="bg-white/90 backdrop-blur-3xl rounded-[3rem] w-full max-w-2xl shadow-3xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={clsx(
                            "px-10 py-10 flex justify-between items-center text-white relative",
                            selectedBooking.status === 'approved' ? "bg-sage" : "bg-gold"
                        )}>
                            <div className="relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2 block">
                                    {selectedBooking.status === 'approved' ? 'RESERVATION CONFIRMED' : 'RESERVATION PENDING'}
                                </span>
                                <h3 className="text-3xl font-serif tracking-tight">
                                    {selectedBooking.status === 'approved' ? 'Session Locked' : 'Verification Required'}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedBooking(null)} className="p-4 bg-white/20 hover:bg-white/30 rounded-2xl transition-all relative z-10">
                                <X className="w-6 h-6" />
                            </button>
                            {/* Decorative background circle */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        </div>

                        <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            {/* Session Metadata */}
                            <div className="glass-card p-8">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-sage/10 rounded-2xl">
                                        <Clock className="w-6 h-6 text-sage" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-charcoal/40 uppercase tracking-[0.2em]">Temporal Coordinate</p>
                                        <p className="text-lg font-serif mt-0.5 text-charcoal">
                                            {format(new Date(selectedBooking.slots.date), 'PPPP')}
                                        </p>
                                        <p className="text-xs font-black text-charcoal/60 uppercase tracking-widest mt-1">
                                            <span className="font-serif italic text-sm">{selectedBooking.slots.start_time.slice(0, 5)}</span> — <span className="font-serif italic text-sm">{selectedBooking.slots.end_time.slice(0, 5)}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Studio Environment */}
                                <div className="glass-card p-8 group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="p-3 bg-rose-gold/10 rounded-xl group-hover:bg-rose-gold/20 transition-colors">
                                            <MapPin className="w-5 h-5 text-rose-gold" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-charcoal/40 uppercase tracking-widest">Environment</p>
                                            <h4 className="font-serif text-charcoal text-lg truncate w-[160px]">{selectedBooking.slots.studios?.name}</h4>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        <p className="text-[10px] text-charcoal/60 leading-relaxed italic">{selectedBooking.slots.studios?.location || 'Location details within secure perimeter'}</p>
                                        <p className="text-[9px] font-black text-charcoal/30 uppercase tracking-widest">{selectedBooking.slots.studios?.email}</p>
                                    </div>
                                </div>

                                {/* Client Information */}
                                <div className="glass-card p-8 group">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-cream-100 overflow-hidden border border-cream-200 flex-shrink-0">
                                            <img
                                                src={selectedBooking.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBooking.client?.full_name || 'C')}&background=F5F2EB&color=2C3230`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-charcoal/40 uppercase tracking-widest">Subscriber</p>
                                            <h4 className="font-serif text-charcoal text-lg truncate w-[160px]">{selectedBooking.client?.full_name}</h4>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-charcoal/60 uppercase tracking-widest">
                                            <MessageSquare className="w-3.5 h-3.5 text-charcoal/20" />
                                            {selectedBooking.client?.phone || 'ANONYMIZED LINE'}
                                        </div>
                                        <p className="text-[9px] font-black text-charcoal/30 uppercase tracking-widest">{selectedBooking.client?.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Medical / Status */}
                            {selectedBooking.client?.medical_conditions && (
                                <div className="p-8 bg-red-50/50 rounded-[2rem] border border-red-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                        <h4 className="text-[10px] font-black text-red-700 uppercase tracking-[0.2em]">PHYSICAL CONTRAINDICATIONS</h4>
                                    </div>
                                    <p className="text-[11px] text-red-600/80 italic leading-relaxed">{selectedBooking.client.medical_conditions}</p>
                                </div>
                            )}

                            {/* Booking Specifics */}
                            <div className="glass-card p-8 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-cream-200 shadow-sm">
                                            <Box className="w-5 h-5 text-rose-gold" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-wider block">Equipment</span>
                                            <span className="text-sm font-bold text-charcoal-900">
                                                {selectedBooking.price_breakdown?.equipment || 'Standard Set'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-wider block">Earnings</span>
                                        <span className="text-xl font-serif text-sage">₱{(selectedBooking.price_breakdown?.instructor_fee || 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                {selectedBooking.notes && (
                                    <div className="pt-6 border-t border-cream-100">
                                        <span className="text-[10px] font-black text-charcoal/40 uppercase tracking-wider block mb-2">Session Notes</span>
                                        <p className="text-sm text-charcoal-600 italic leading-relaxed">"{selectedBooking.notes}"</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-10 py-8 bg-cream-50/50 border-t border-cream-100 flex gap-4">
                            <button
                                onClick={() => router.push(`/instructor/messages?userId=${selectedBooking.client_id}`)}
                                className="flex-1 bg-charcoal text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-charcoal/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                            >
                                <MessageSquare className="w-4 h-4" /> INITIATE COMMS
                            </button>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="px-10 py-4 bg-alabaster text-charcoal/40 hover:text-charcoal rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
