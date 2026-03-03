'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, setHours, setMinutes, getDay, parse, differenceInMinutes } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Trash2, MapPin, X, User, Box, ArrowUpRight, MessageSquare } from 'lucide-react'
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

    const toggleLocation = (loc: string) => {
        setLocations(prev =>
            prev.includes(loc)
                ? prev.filter(l => l !== loc)
                : [...prev, loc]
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

        setIsSubmitting(true)
        const { generateRecurringAvailability } = await import('@/app/(dashboard)/instructor/schedule/actions');

        const result = await generateRecurringAvailability({
            startDate: singleDate,
            endDate: singleDate,
            days: [new Date(singleDate).getDay()],
            startTime: singleTime,
            endTime: singleEndTime,
            locations: locations // Pass array
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

    const handleUpdate = async (formData: FormData) => {
        if (!editingSlot) return
        setIsSubmitting(true)

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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <h2 className="text-xl font-serif text-charcoal-900 hidden md:block min-w-[140px]">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={format(currentDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                if (e.target.value) {
                                    router.push(`?date=${e.target.value}`)
                                }
                            }}
                            className="px-3 py-1 border border-cream-200 rounded-lg text-sm bg-white text-charcoal-700 outline-none focus:ring-2 focus:ring-charcoal-500 cursor-pointer"
                            title="Select any specific date"
                        />
                        <div className="flex items-center bg-cream-100 rounded-lg p-1">
                            <button onClick={handlePrevWeek} className="flex items-center gap-1 px-2 py-1 hover:bg-white rounded-md transition-all text-charcoal-600 text-xs font-medium" title="Previous Week">
                                <ChevronLeft className="w-4 h-4" /> Prev Week
                            </button>
                            <button onClick={handleToday} className="px-3 py-1 text-xs font-medium text-charcoal-700 hover:bg-white rounded-md transition-all border-x border-cream-200/50" title="Go to Current week">
                                Today
                            </button>
                            <button onClick={handleNextWeek} className="flex items-center gap-1 px-2 py-1 hover:bg-white rounded-md transition-all text-charcoal-600 text-xs font-medium" title="Next Week">
                                Next Week <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => { setAddMode('single'); setIsAddModalOpen(true); }}
                        className="bg-rose-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Slot
                    </button>
                    <button
                        onClick={() => { setAddMode('bulk'); setIsAddModalOpen(true); }}
                        className="bg-white border border-cream-300 text-charcoal-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-cream-50 transition-colors flex items-center gap-2"
                    >
                        <CalendarIcon className="w-4 h-4" /> Bulk Generate
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden overflow-x-auto">
                <div className="min-w-[800px]">
                    <div className="grid grid-cols-8 border-b border-cream-200 bg-cream-50">
                        <div className="p-4 text-xs font-medium text-charcoal-600 border-r border-cream-200 sticky left-0 bg-cream-50 z-20 w-20 text-center uppercase">TIME</div>
                        {days.map(day => (
                            <div key={day.toString()} className={clsx("p-3 text-center border-r border-cream-200 last:border-r-0 min-w-[100px]", isSameDay(day, new Date()) ? "bg-rose-gold/5" : "")}>
                                <div className="text-xs text-charcoal-500 uppercase mb-1">{format(day, 'EEE')}</div>
                                <div className={clsx("text-lg font-serif", isSameDay(day, new Date()) ? "text-rose-gold font-bold underline decoration-rose-gold/30 underline-offset-4" : "text-charcoal-900")}>{format(day, 'd')}</div>
                            </div>
                        ))}
                    </div>

                    <div className="divide-y divide-cream-100 relative">
                        {hours.map(hour => (
                            <div key={hour} className="grid grid-cols-8" style={{ minHeight: `${ROW_HEIGHT}px` }}>
                                <div className="p-2 text-xs text-charcoal-900 font-medium border-r border-cream-200 text-center sticky left-0 bg-white z-20 w-20 flex items-center justify-center">
                                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                </div>

                                {days.map(day => {
                                    const dayStr = toManilaDateStr(day)
                                    // Start of hour for this cell
                                    const cellStartTime = setMinutes(setHours(day, hour), 0)

                                    // Filter availability that STARTS in this hour
                                    const startingSlots = availability.filter(a => {
                                        if (a.date) {
                                            if (a.date !== dayStr) return false
                                        } else {
                                            if (a.day_of_week !== getDay(day)) return false
                                        }
                                        const startH = parseInt(a.start_time.split(':')[0])
                                        return startH === hour
                                    })

                                    // Filter bookings that START in this hour
                                    const startingBookings = bookings.filter(b => {
                                        const slot = b.slots;
                                        if (!slot?.date || !slot?.start_time) return false;
                                        if (slot.date !== dayStr) return false;
                                        // ONLY show active/pending/charged bookings. Hide refunded/cancelled ones.
                                        if (['cancelled_refunded', 'rejected', 'expired'].includes(b.status)) return false;

                                        const startH = parseInt(slot.start_time.split(':')[0]);
                                        return startH === hour;
                                    })

                                    return (
                                        <div key={day.toString() + hour} className="border-r border-cream-100 last:border-r-0 relative group p-0" style={{ minHeight: `${ROW_HEIGHT}px` }}>
                                            <div
                                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-charcoal-900/5 cursor-pointer z-0"
                                                onClick={() => {
                                                    setSingleDate(format(day, 'yyyy-MM-dd'))
                                                    setSingleTime(`${hour.toString().padStart(2, '0')}:00`)
                                                    setSingleEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`)
                                                    setAddMode('single')
                                                    setIsAddModalOpen(true)
                                                }}
                                            />
                                            {startingSlots.map((slot) => {
                                                const startMin = parseInt(slot.start_time.split(':')[1])
                                                const [endH, endM] = slot.end_time.split(':').map(Number)

                                                const startTotal = hour * 60 + startMin
                                                const endTotal = endH * 60 + endM
                                                const duration = endTotal - startTotal

                                                const topOffset = (startMin / 60) * ROW_HEIGHT
                                                const heightPx = (duration / 60) * ROW_HEIGHT

                                                // Check for ANY overlapping approved/pending booking
                                                const isBooked = bookings.some(b => {
                                                    const bSlot = b.slots;
                                                    if (!bSlot?.date || !bSlot?.start_time || !bSlot?.end_time) return false;
                                                    if (bSlot.date !== dayStr) return false;
                                                    if (['pending', 'approved'].includes(b.status)) {
                                                        const bStartH = parseInt(bSlot.start_time.split(':')[0]);
                                                        const bStartM = parseInt(bSlot.start_time.split(':')[1]);
                                                        const bEndH = parseInt(bSlot.end_time.split(':')[0]);
                                                        const bEndM = parseInt(bSlot.end_time.split(':')[1]);

                                                        const bStartTotal = bStartH * 60 + bStartM;
                                                        const bEndTotal = bEndH * 60 + bEndM;

                                                        // Check for overlap between slot [startTotal, endTotal] and booking [bStartTotal, bEndTotal]
                                                        return (startTotal < bEndTotal && endTotal > bStartTotal);
                                                    }
                                                    return false;
                                                });

                                                if (isBooked) return null; // Don't show availability if it's booked (booking will be shown instead)

                                                // Improved Overlap Logic for Width/Left Pos
                                                // Find all items (slots and bookings) that actually overlap in TIME with this specific slot
                                                const siblings = [
                                                    ...startingSlots,
                                                    ...startingBookings.map(sb => sb.slots)
                                                ].filter(s => {
                                                    if (!s && !s?.start_time) return false;
                                                    const [sh, sm] = s.start_time.split(':').map(Number);
                                                    const [eh, em] = s.end_time.split(':').map(Number);
                                                    const sStart = sh * 60 + sm;
                                                    const sEnd = eh * 60 + em;
                                                    return (startTotal < sEnd && endTotal > sStart);
                                                });

                                                const totalItems = siblings.length;
                                                const myIdx = siblings.findIndex(s => s.id === slot.id);

                                                return (
                                                    <div
                                                        key={slot.id}
                                                        className={clsx(
                                                            "absolute rounded-lg text-xs hover:shadow-xl transition-all cursor-pointer overflow-hidden border z-10 p-2.5 group/slot",
                                                            slot.date
                                                                ? "bg-white border-rose-gold text-charcoal-900 shadow-sm"
                                                                : "bg-teal-50 border-teal-200 text-teal-800 shadow-sm",
                                                            duration < 45 ? "flex flex-row items-center gap-2 py-1 px-2" : "flex flex-col"
                                                        )}
                                                        style={{
                                                            top: `${topOffset}px`,
                                                            height: `${heightPx}px`,
                                                            width: totalItems > 1 ? `${(100 / totalItems) - 2}%` : '96%',
                                                            left: totalItems > 1 ? `${(myIdx * 100) / totalItems + 1}%` : '2%'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            openEditModal(slot)
                                                        }}
                                                        title="Click to edit"
                                                    >
                                                        {duration < 45 ? (
                                                            <div className="flex flex-col h-full justify-center">
                                                                <div className="flex items-center gap-1 font-bold text-[9px] text-charcoal-900 leading-tight">
                                                                    <Clock className="w-2.5 h-2.5 flex-shrink-0 text-rose-gold" />
                                                                    <span className="truncate">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[8px] text-charcoal-500 truncate mt-0.5">
                                                                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                                                    <span className="truncate">{slot.location_area.split(' - ')[1] || slot.location_area}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="text-[10px] flex items-center gap-1.5 font-bold text-charcoal-900 mb-1.5">
                                                                    <Clock className="w-3.5 h-3.5 flex-shrink-0 text-rose-gold" />
                                                                    <span className="truncate">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                                                </div>
                                                                <div className="text-[10px] flex items-center gap-1.5 font-medium text-charcoal-600 leading-snug">
                                                                    <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-charcoal-400" />
                                                                    <span className="break-words line-clamp-2">{slot.location_area}</span>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )
                                            })}

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
                                                const clientName = booking.client?.full_name || 'A Client';

                                                // Improved Overlap Logic for Width/Left Pos
                                                const siblings = [
                                                    ...startingSlots.filter(s => {
                                                        // filter out slots that are replaced by bookings
                                                        const isBooked = bookings.some(b => {
                                                            const bSlot = b.slots;
                                                            if (!bSlot?.date || !bSlot?.start_time || !bSlot?.end_time) return false;
                                                            if (bSlot.date !== dayStr) return false;
                                                            if (['pending', 'approved'].includes(b.status)) {
                                                                const [bsh, bsm] = bSlot.start_time.split(':').map(Number);
                                                                const [beh, bem] = bSlot.end_time.split(':').map(Number);
                                                                const bStart = bsh * 60 + bsm;
                                                                const bEnd = beh * 60 + bem;
                                                                const [ssh, ssm] = s.start_time.split(':').map(Number);
                                                                const [seh, sem] = s.end_time.split(':').map(Number);
                                                                const sStart = ssh * 60 + ssm;
                                                                const sEnd = seh * 60 + sem;
                                                                return (sStart < bEnd && sEnd > bStart);
                                                            }
                                                            return false;
                                                        });
                                                        return !isBooked;
                                                    }),
                                                    ...startingBookings.map(sb => sb.slots)
                                                ].filter(s => {
                                                    if (!s && !s?.start_time) return false;
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
                                                            "absolute rounded-lg text-[10px] shadow-md border z-20 p-2.5 overflow-hidden transition-all hover:scale-[1.02] cursor-pointer group/booking",
                                                            booking.status === 'approved'
                                                                ? "bg-green-600 border-green-500 text-white shadow-green-900/10"
                                                                : "bg-amber-50 border-amber-400 text-white shadow-amber-900/10",
                                                            duration < 45 ? "flex flex-row items-center gap-2 py-1 px-2" : "flex flex-col"
                                                        )}
                                                        style={{
                                                            top: `${topOffset}px`,
                                                            height: `${heightPx}px`,
                                                            width: totalItems > 1 ? `${(100 / totalItems) - 2}%` : '96%',
                                                            left: totalItems > 1 ? `${(myIdx * 100) / totalItems + 1}%` : '2%'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedBooking(booking);
                                                        }}
                                                    >
                                                        {duration < 45 ? (
                                                            <div className="flex flex-col h-full justify-center">
                                                                <div className="flex items-center gap-1 font-bold text-[9px] white-space-nowrap">
                                                                    <span className="truncate">{booking.status === 'approved' ? 'BOOKED' : 'PENDING'}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[8px] opacity-90 truncate mt-0.5">
                                                                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                                                    <span className="truncate">{studioName}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="font-bold flex items-center justify-between mb-1.5">
                                                                    <span className="truncate tracking-wider text-[11px]">{booking.status === 'approved' ? 'BOOKED' : 'PENDING'}</span>
                                                                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover/booking:opacity-100 transition-opacity" />
                                                                </div>
                                                                <div className="flex items-center gap-1.5 font-semibold mb-1.5 text-[10px]">
                                                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                                    <span className="break-words line-clamp-2">{studioName}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 opacity-90 font-medium italic text-[10px]">
                                                                    <User className="w-3.5 h-3.5 shrink-0" />
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
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm"
                    onClick={() => setIsAddModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif text-charcoal-900">
                                {addMode === 'bulk' ? 'Recurring Schedule Generator' : 'Add Availability Slot'}
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {addMode === 'bulk' ? (
                            <InstructorScheduleGenerator initialAvailability={[]} />
                        ) : (
                            <form onSubmit={handleCreateSingle} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-2">Date</label>
                                    <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-4 py-2 border border-cream-300 rounded-xl bg-white text-charcoal-900 outline-none focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal-700 mb-2">Start Time</label>
                                        <input name="startTime" type="time" required value={singleTime} onChange={(e) => setSingleTime(e.target.value)} className="w-full px-4 py-2 border border-cream-300 rounded-xl bg-white text-charcoal-900 outline-none focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal-700 mb-2">End Time</label>
                                        <input name="endTime" type="time" required value={singleEndTime} onChange={(e) => setSingleEndTime(e.target.value)} className="w-full px-4 py-2 border border-cream-300 rounded-xl bg-white text-charcoal-900 outline-none focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-3">Locations (Multi-Select)</label>
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Object.entries(GROUPED_AREAS).map(([city, cityLocations]) => {
                                            const allSelected = cityLocations.every(loc => locations.includes(loc));
                                            return (
                                                <div key={city} className="space-y-2 border border-cream-200 p-3 rounded-xl bg-cream-50/50">
                                                    <div className="flex items-center justify-between">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCityGroup(cityLocations)}
                                                            className="font-bold text-sm text-charcoal-900 hover:text-rose-gold transition-colors text-left flex items-center gap-2"
                                                        >
                                                            {city}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleCityGroup(cityLocations)}
                                                            className="text-[10px] font-medium text-charcoal-500 hover:text-rose-gold transition-colors bg-white px-2 py-1 rounded-full border border-cream-200 shadow-sm"
                                                        >
                                                            {allSelected ? 'Deselect All' : 'Select All'}
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
                                                                        "px-4 py-1.5 rounded-full text-xs font-medium transition-all border",
                                                                        isSelected
                                                                            ? "bg-rose-gold text-white border-rose-gold shadow-sm"
                                                                            : "bg-white text-charcoal-600 border-cream-200 hover:border-rose-gold"
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
                                    <p className="text-[11px] text-charcoal-500 mt-4 italic">
                                        Note: Availability will be removed across all selected locations once a booking is confirmed.
                                    </p>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 bg-rose-gold text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create Slot'}
                                    </button>
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-charcoal-500 hover:text-charcoal-900 transition-colors border border-transparent hover:bg-cream-50">
                                        Cancel
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
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm"
                    onClick={() => setIsEditModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif text-charcoal-900">
                                Edit Availability
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form action={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">Date</label>
                                <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 outline-none" />
                                <p className="text-xs text-charcoal-500 mt-1">Change date to move this slot (will update day of week automatically).</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">Start Time</label>
                                    <input name="startTime" type="time" required value={singleTime} onChange={(e) => setSingleTime(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">End Time</label>
                                    <input name="endTime" type="time" required value={singleEndTime} onChange={(e) => setSingleEndTime(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-2">Location</label>
                                <select
                                    value={locations[0] || 'BGC'}
                                    onChange={(e) => setLocations([e.target.value])}
                                    className="w-full px-4 py-2 border border-cream-300 rounded-xl text-charcoal-900 outline-none bg-white focus:ring-2 focus:ring-rose-gold/20 focus:border-rose-gold transition-all"
                                    name="location"
                                >
                                    {AREAS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-cream-100 mt-6">
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-rose-gold text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all shadow-md active:scale-[0.98] disabled:opacity-50">
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false)
                                        handleDelete(editingSlot.id)
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-white text-charcoal-600 border border-cream-200 py-2.5 rounded-lg font-medium hover:bg-cream-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Availability
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Booking Detail Modal */}
            {selectedBooking && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-md animate-in fade-in duration-300"
                    onClick={() => setSelectedBooking(null)}
                >
                    <div
                        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className={clsx(
                            "px-8 py-6 flex justify-between items-center text-white relative overflow-hidden",
                            selectedBooking.status === 'approved' ? "bg-green-600" : "bg-amber-500"
                        )}>
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1 block">
                                    {selectedBooking.status === 'approved' ? 'Confirmed Session' : 'Pending Verification'}
                                </span>
                                <h3 className="text-2xl font-serif">Session Details</h3>
                            </div>
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="relative z-10 p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            {/* Decorative background circle */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Time & Location */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">Date & Time</span>
                                    <div className="flex items-center gap-2 text-charcoal-900 font-bold">
                                        <Clock className="w-4 h-4 text-rose-gold" />
                                        <span>{format(parseISO(selectedBooking.slots.date), 'EEE, MMM d')}</span>
                                    </div>
                                    <p className="text-sm text-charcoal-500 ml-6">
                                        {selectedBooking.slots.start_time.slice(0, 5)} - {selectedBooking.slots.end_time.slice(0, 5)}
                                    </p>
                                </div>
                                <div className="space-y-1.5 text-right">
                                    <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">Location</span>
                                    <div className="flex items-center justify-end gap-2 text-charcoal-900 font-bold">
                                        <MapPin className="w-4 h-4 text-rose-gold" />
                                        <span className="truncate max-w-[150px]">{selectedBooking.slots.studios.name}</span>
                                    </div>
                                    <p className="text-xs text-charcoal-500 italic">
                                        {selectedBooking.slots.studios.location}
                                    </p>
                                </div>
                            </div>

                            <hr className="border-cream-100" />

                            {/* Client Info */}
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-cream-100 overflow-hidden border-2 border-cream-200 flex-shrink-0">
                                    <img
                                        src={selectedBooking.client?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedBooking.client?.full_name || 'C')}&background=F5F2EB&color=2C3230`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1">
                                    <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block mb-1">Client 정보</span>
                                    <h4 className="text-lg font-bold text-charcoal-900">{selectedBooking.client?.full_name}</h4>
                                    <p className="text-sm text-charcoal-500">{selectedBooking.client?.email}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-3 bg-cream-50 text-charcoal-600 rounded-xl hover:bg-rose-gold hover:text-white transition-all shadow-sm border border-cream-200">
                                        <MessageSquare className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Booking Specifics */}
                            <div className="bg-cream-50/50 rounded-2xl p-6 border border-cream-100 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-cream-200 shadow-sm">
                                            <Box className="w-4 h-4 text-rose-gold" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">Equipment</span>
                                            <span className="text-sm font-bold text-charcoal-900">
                                                {selectedBooking.price_breakdown?.equipment || 'Standard Set'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block">Earnings</span>
                                        <span className="text-lg font-bold text-green-600">₱{(selectedBooking.price_breakdown?.instructor_fee || 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                {selectedBooking.notes && (
                                    <div className="pt-4 border-t border-cream-200/50">
                                        <span className="text-[10px] font-bold text-charcoal-400 uppercase tracking-wider block mb-1">Session Notes</span>
                                        <p className="text-sm text-charcoal-600 italic">"{selectedBooking.notes}"</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-6 bg-cream-50 border-t border-cream-200 flex gap-4">
                            <button
                                onClick={() => setSelectedBooking(null)}
                                className="flex-1 py-3 bg-charcoal-900 text-white rounded-xl font-bold hover:bg-charcoal-800 transition-colors shadow-lg shadow-charcoal-900/10"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
