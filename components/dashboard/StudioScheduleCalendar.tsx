'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, startOfDay, isPast } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Users, User, Calendar as CalendarIcon, Clock, Trash2, Edit2, X, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { createSlot, deleteSlot, updateSlot } from '@/app/(dashboard)/studio/actions' // For single slot
import ScheduleManager from './ScheduleManager' // Bulk generator
import Image from 'next/image'
import { toManilaDateStr, getManilaTodayStr } from '@/lib/timezone'

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

    // Edit Modal State
    const [editingSlot, setEditingSlot] = useState<Slot | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    // Bucket Management Modal (Detailed View)
    const [isBucketModalOpen, setIsBucketModalOpen] = useState(false)
    const [bucketSlots, setBucketSlots] = useState<Slot[]>([])
    const [bucketTime, setBucketTime] = useState<{ date: Date, hour: number } | null>(null)

    // Calendar Calculations
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

    // Use server-provided day strings if available, otherwise fallback to potentially shifted client dates
    const days = dayStrings ? dayStrings.map((s: string) => parseISO(s)) : eachDayOfInterval({ start: weekStart, end: weekEnd })
    const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 9 PM

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
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
                    <h2 className="text-xl font-serif text-charcoal-900 hidden md:block min-w-[140px]">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center bg-alabaster border border-cream-200 rounded-full p-1 shadow-sm">
                            <button onClick={handlePrevWeek} className="p-2 hover:bg-sage/10 rounded-full transition-all text-charcoal/60 hover:text-sage" title="Previous Week">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={handleToday} className="px-4 py-1.5 text-xs font-bold text-charcoal/80 hover:text-charcoal uppercase tracking-widest transition-all" title="Go to Current week">
                                Today
                            </button>
                            <button onClick={handleNextWeek} className="p-2 hover:bg-sage/10 rounded-full transition-all text-charcoal/60 hover:text-sage" title="Next Week">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="relative group">
                            <input
                                type="date"
                                value={format(currentDate, 'yyyy-MM-dd')}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        router.push(`?date=${e.target.value}`)
                                    }
                                }}
                                className="px-4 py-2 bg-white border border-cream-200 rounded-full text-xs font-bold text-charcoal/70 outline-none focus:ring-2 focus:ring-sage/30 cursor-pointer shadow-sm hover:border-sage/50 transition-all uppercase tracking-tighter"
                                title="Select any specific date"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 shrink-0">
                    <button
                        onClick={() => { setAddMode('single'); setIsAddModalOpen(true); }}
                        className="btn-rose-gold px-6 py-2.5 text-xs tracking-[0.1em] flex items-center gap-2"
                        style={{ boxShadow: '0 0 0 1px rgba(180,195,178,0.1), 0 4px 20px rgba(180,195,178,0.35), 0 2px 8px rgba(0,0,0,0.06)' }}
                    >
                        <Plus className="w-4 h-4" /> ADD SLOT
                    </button>
                    <button
                        onClick={() => { setAddMode('bulk'); setIsAddModalOpen(true); }}
                        className="px-6 py-2.5 text-xs tracking-[0.1em] flex items-center gap-2 rounded-[20px] font-bold border-2 border-charcoal text-charcoal bg-white hover:bg-charcoal hover:text-white transition-all duration-300 shadow-sm active:scale-95"
                    >
                        <CalendarIcon className="w-4 h-4" /> BULK GENERATE
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        <div className="grid grid-cols-8 border-b border-[rgba(0,0,0,0.02)] bg-[rgba(0,0,0,0.02)]">
                            <div className="p-4 text-[10px] font-black tracking-[0.2em] text-charcoal/40 border-r border-[rgba(0,0,0,0.02)] sticky left-0 bg-white/80 backdrop-blur-md z-20 uppercase">TIME</div>
                            {days.map((day: Date) => (
                                <div key={day.toString()} className={clsx("p-4 text-center border-r border-[rgba(0,0,0,0.02)] last:border-r-0 min-w-[100px] transition-colors", isSameDay(day, new Date()) ? "bg-[#B4C3B2]/5" : "")}>
                                    <div className="text-[10px] text-charcoal/40 uppercase mb-2 font-bold tracking-[0.2em]">{format(day, 'EEE')}</div>
                                    <div className={clsx("text-2xl font-serif font-bold", isSameDay(day, new Date()) ? "text-[#B4C3B2]" : "text-charcoal/80")}>{format(day, 'd')}</div>
                                </div>
                            ))}
                        </div>

                        <div className="divide-y divide-[rgba(0,0,0,0.02)]">
                            {hours.map(hour => (
                                <div key={hour} className="grid grid-cols-8 min-h-[80px]">
                                    <div className="p-4 text-[10px] text-charcoal/40 font-black border-r border-[rgba(0,0,0,0.02)] text-center sticky left-0 bg-white/80 backdrop-blur-md z-20 uppercase tracking-tighter">
                                        {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                    </div>

                                    {days.map((day: Date) => {
                                        const dayStr = toManilaDateStr(day)
                                        const cellSlots = (slots || []).filter(s => {
                                            const startHour = parseInt(s.start_time.split(':')[0], 10);
                                            return s.date === dayStr && startHour === hour
                                        })

                                        const isPastCell = isPast(new Date(dayStr + "T" + hour.toString().padStart(2, '0') + ":59:59+08:00"))

                                        return (
                                            <div key={day.toString() + hour} className={clsx("border-r border-[rgba(0,0,0,0.02)] last:border-r-0 relative group p-2 min-h-[100px] transition-all", isPastCell && "opacity-40 grayscale-[0.05]")} style={{ colorScheme: 'light' }}>
                                                <div
                                                    className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-[#B4C3B2] pointer-events-none z-0"
                                                />
                                                <button
                                                    className="absolute top-2 right-2 p-1 rounded-full bg-[#B4C3B2]/10 text-[#B4C3B2] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#B4C3B2] hover:text-white z-20"
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
                                                        {/* Equipment Slots */}
                                                        {(() => {
                                                            const equipmentCounts: Record<string, { free: number, total: number }> = {};

                                                            // Populate totals and free counts
                                                            cellSlots.forEach(s => {
                                                                if (s.equipment && typeof s.equipment === 'object') {
                                                                    Object.entries(s.equipment).forEach(([eq, count]) => {
                                                                        if (!equipmentCounts[eq]) equipmentCounts[eq] = { free: 0, total: 0 };
                                                                        equipmentCounts[eq].total += count;

                                                                        // Count active bookings for this specific equipment in this slot
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
                                                                            "rounded-xl p-3 backdrop-blur-[8px] border-white shadow-[0_10px_20px_rgba(0,0,0,0.03)] border transition-all group/eq relative overflow-hidden",
                                                                            isPastCell
                                                                                ? "bg-white/40"
                                                                                : hasPending
                                                                                    ? "bg-gold/50"
                                                                                    : isFullyBooked
                                                                                        ? "bg-rose-gold/50"
                                                                                        : "bg-white/70"
                                                                        )}
                                                                        onClick={() => {
                                                                            setBucketSlots(cellSlots.filter(s => s.equipment?.[eqType]))
                                                                            setBucketTime({ date: day, hour })
                                                                            setIsBucketModalOpen(true)
                                                                        }}
                                                                    >
                                                                        <div className={clsx(
                                                                            "text-[9px] font-black uppercase tracking-[0.15em] flex justify-between items-center mb-1.5",
                                                                            isPastCell ? "text-charcoal/30" : "text-charcoal/60"
                                                                        )}>
                                                                            <span className="flex items-center gap-1.5">
                                                                                <div className={clsx("w-1.5 h-1.5 rounded-full",
                                                                                    isFullyBooked ? "bg-rose-gold-deep" : hasPending ? "bg-gold-deep" : "bg-[#B4C3B2]"
                                                                                )} />
                                                                                {eqType}
                                                                            </span>
                                                                            <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/eq:opacity-100 transition-opacity" />
                                                                        </div>
                                                                        <div className={clsx(
                                                                            "text-[10px] font-bold tracking-tight",
                                                                            isPastCell ? "text-charcoal/30" : "text-charcoal/80"
                                                                        )}>
                                                                            {counts.free} / {counts.total} <span className="text-[8px] uppercase tracking-wider ml-0.5 font-black opacity-50">Free</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}

                                                        {/* Open Space Slots */}
                                                        {cellSlots.some(s => !s.equipment || Object.keys(s.equipment).length === 0) && (() => {
                                                            const openSlots = cellSlots.filter(s => !s.equipment || Object.keys(s.equipment).length === 0)
                                                            const availableCount = openSlots.reduce((sum, s) => sum + (s.is_available ? (s.quantity || 1) : 0), 0)
                                                            const totalCount = openSlots.reduce((sum, s) => sum + (s.quantity || 1), 0)
                                                            const isFullyBooked = availableCount === 0
                                                            const hasPending = openSlots.some(s => s.bookings?.some(b => b.status === 'pending'))

                                                            return (
                                                                <div
                                                                    className={clsx(
                                                                        "rounded-xl p-3 backdrop-blur-[8px] border-white shadow-[0_10px_20px_rgba(0,0,0,0.03)] border transition-all group/open relative overflow-hidden",
                                                                        isPastCell
                                                                            ? "bg-white/40"
                                                                            : hasPending
                                                                                ? "bg-gold/50"
                                                                                : isFullyBooked
                                                                                    ? "bg-rose-gold/50"
                                                                                    : "bg-white/70"
                                                                    )}
                                                                    onClick={() => {
                                                                        setBucketSlots(openSlots)
                                                                        setBucketTime({ date: day, hour })
                                                                        setIsBucketModalOpen(true)
                                                                    }}
                                                                >
                                                                    <div className={clsx(
                                                                        "text-[9px] font-black uppercase tracking-[0.15em] flex justify-between items-center mb-1.5",
                                                                        isPastCell ? "text-charcoal/30" : "text-charcoal/60"
                                                                    )}>
                                                                        <span className="flex items-center gap-1.5">
                                                                            <div className={clsx("w-1.5 h-1.5 rounded-full",
                                                                                isFullyBooked ? "bg-rose-gold-deep" : hasPending ? "bg-gold-deep" : "bg-[#B4C3B2]"
                                                                            )} />
                                                                            Open Space
                                                                        </span>
                                                                        <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/open:opacity-100 transition-opacity" />
                                                                    </div>
                                                                    <div className={clsx(
                                                                        "text-[10px] font-bold tracking-tight",
                                                                        isPastCell ? "text-charcoal/30" : "text-charcoal/80"
                                                                    )}>
                                                                        {availableCount} / {totalCount} <span className="text-[8px] uppercase tracking-wider ml-0.5 font-black opacity-50">Free</span>
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal for Add Slot */}
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
                                {addMode === 'bulk' ? 'Recurring Schedule Generator' : 'Add Single Slot'}
                            </h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {addMode === 'bulk' ? (
                            <ScheduleManager studioId={studioId} availableEquipment={availableEquipment} />
                        ) : (
                            <form action={handleCreateSingle} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">Date</label>
                                    <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 focus:ring-2 focus:ring-charcoal-500 outline-none" style={{ colorScheme: 'light' }} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Start Time</label>
                                        <input name="startTime" type="time" required value={singleTime} onChange={(e) => setSingleTime(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 focus:ring-2 focus:ring-charcoal-500 outline-none" style={{ colorScheme: 'light' }} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal-700 mb-1">End Time</label>
                                        <input name="endTime" type="time" required value={singleEndTime} onChange={(e) => setSingleEndTime(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 focus:ring-2 focus:ring-charcoal-500 outline-none" style={{ colorScheme: 'light' }} />
                                    </div>
                                </div>

                                {availableEquipment.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal-700 mb-2">Equipment (Select and specify quantity)</label>
                                        <div className="space-y-2">
                                            {availableEquipment.map(eq => (
                                                <div key={eq} className="flex items-center gap-3 p-2 border border-cream-200 rounded-lg hover:bg-cream-50 transition-colors">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <input
                                                            type="checkbox"
                                                            name={`eq_${eq}`}
                                                            id={`eq_${eq}`}
                                                            className="w-4 h-4 text-charcoal-900 rounded border-cream-300 focus:ring-rose-gold"
                                                        />
                                                        <label htmlFor={`eq_${eq}`} className="text-sm font-medium text-charcoal-700 cursor-pointer">{eq}</label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-charcoal-400">Qty:</span>
                                                        <input
                                                            name={`qty_${eq}`}
                                                            type="number"
                                                            min="1"
                                                            defaultValue="1"
                                                            className="w-16 px-2 py-1 border border-cream-200 rounded-md bg-white text-sm text-charcoal-900 focus:ring-2 focus:ring-charcoal-500 outline-none disabled:opacity-50 disabled:bg-cream-50"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="p-3 bg-cream-50 rounded-xl border border-cream-200">
                                    <p className="text-xs text-charcoal-600 flex gap-2">
                                        < Sparkles className="w-3.5 h-3.5 text-rose-gold" />
                                        <span>Each selected equipment will have its own individual quantity within this slot.</span>
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 bg-rose-gold text-white py-2.5 rounded-lg font-bold hover:brightness-110 transition-all shadow-md active:scale-95"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create Slot'}
                                    </button>
                                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2.5 rounded-lg font-medium text-charcoal-500 hover:text-charcoal-900 transition-colors border border-transparent hover:border-cream-300">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Modal for Edit Slot */}
            {isEditModalOpen && editingSlot && (
                // ... existing edit modal ...
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm"
                    onClick={() => setIsEditModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ... (Reuse existing form or refactor, keeping logic simple for now) ... */}
                        {/* Actually I will just keep the existing edit modal code here since I'm not deleting it yet, 
                             Logic above in replace_file_content was inserting *before* the end. 
                             I need to make sure I am appending the NEW modal.
                         */}
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-serif text-charcoal-900">Manage Slot</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {(() => {
                            const activeBooking = editingSlot.bookings?.find(b => ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || ''));
                            if (!activeBooking) return null;
                            return (
                                <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-teal-800 uppercase tracking-widest">Active Booking</h4>
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-teal-100 text-teal-700 rounded-md border border-teal-200">
                                            {activeBooking.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {activeBooking.instructor && (
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-teal-600 font-bold uppercase">Instructor</p>
                                                <div className="flex items-center gap-2">
                                                    {activeBooking.instructor.avatar_url ? (
                                                        <Image src={activeBooking.instructor.avatar_url} alt="Instructor" width={24} height={24} className="rounded-full w-6 h-6 object-cover border border-white shadow-sm" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center border border-teal-200">
                                                            <User className="w-3.5 h-3.5 text-teal-600" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-medium text-charcoal-900">{activeBooking.instructor.full_name}</span>
                                                </div>
                                            </div>
                                        )}
                                        {activeBooking.client && (
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-teal-600 font-bold uppercase">Client</p>
                                                <div className="flex items-center gap-2">
                                                    {activeBooking.client.avatar_url ? (
                                                        <Image src={activeBooking.client.avatar_url} alt="Client" width={24} height={24} className="rounded-full w-6 h-6 object-cover border border-white shadow-sm" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center border border-teal-200">
                                                            <Users className="w-3.5 h-3.5 text-teal-600" />
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-medium text-charcoal-900">{activeBooking.client.full_name}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        <form action={handleUpdate} className="space-y-4">
                            {/* ... (Existing Form Content) ... */}
                            {/* To avoid huge diffs, I will trust the pre-existing content is fine and just append the new modal below it 
                                BUT replace_file_content requires context. 
                            */}
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">Date</label>
                                <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 focus:ring-2 focus:ring-charcoal-500 outline-none" style={{ colorScheme: 'light' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">Start Time</label>
                                    <input name="startTime" type="time" required value={singleTime} onChange={(e) => setSingleTime(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 focus:ring-2 focus:ring-charcoal-500 outline-none" style={{ colorScheme: 'light' }} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">End Time</label>
                                    <input name="endTime" type="time" required value={singleEndTime} onChange={(e) => setSingleEndTime(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 focus:ring-2 focus:ring-charcoal-500 outline-none" style={{ colorScheme: 'light' }} />
                                </div>
                            </div>

                            {availableEquipment.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-2">Equipment</label>
                                    <div className="space-y-2">
                                        {availableEquipment.map(eq => (
                                            <div key={eq} className="flex items-center gap-3 p-2 border border-cream-200 rounded-lg">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="checkbox"
                                                        name={`eq_${eq}`}
                                                        id={`edit_eq_${eq}`}
                                                        defaultChecked={editingSlot.equipment && !!(
                                                            editingSlot.equipment[eq] ||
                                                            editingSlot.equipment[eq.toUpperCase()] ||
                                                            editingSlot.equipment[eq.toLowerCase()]
                                                        )}
                                                        className="w-4 h-4 text-charcoal-900 rounded border-cream-300 focus:ring-rose-gold"
                                                    />
                                                    <label htmlFor={`edit_eq_${eq}`} className="text-sm font-medium text-charcoal-700 cursor-pointer">{eq}</label>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-charcoal-400">Qty:</span>
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
                                                        className="w-16 px-2 py-1 border border-cream-200 rounded-md bg-white text-sm text-charcoal-900 focus:ring-2 focus:ring-charcoal-500 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-cream-100 mt-4">
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-rose-gold text-white py-2.5 rounded-lg font-bold hover:brightness-110 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2">
                                    <Edit2 className="w-4 h-4" /> {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button type="button" onClick={handleDelete} disabled={isSubmitting} className="flex-1 bg-white text-red-600 border border-red-200 py-2.5 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                                    <Trash2 className="w-4 h-4" /> Delete Slot
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bucket Management Modal */}
            {isBucketModalOpen && bucketTime && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm"
                    onClick={() => setIsBucketModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[80vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-serif text-charcoal-900">
                                    {format(bucketTime.date, 'EEEE, MMMM d')} &bull; {bucketTime.hour > 12 ? `${bucketTime.hour - 12} PM` : bucketTime.hour === 12 ? '12 PM' : `${bucketTime.hour} AM`}
                                </h3>
                                <p className="text-charcoal-500 text-sm">Managing {bucketSlots.length} available slots</p>
                            </div>
                            <button onClick={() => setIsBucketModalOpen(false)} className="text-charcoal-400 hover:text-charcoal-900">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {bucketSlots.map(slot => (
                                <div key={slot.id} className="flex items-center justify-between p-3 bg-cream-50 border border-cream-200 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-md border border-cream-200">
                                            <Clock className="w-4 h-4 text-charcoal-500" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div>
                                                <p className="text-sm font-medium text-charcoal-900 leading-none mb-1">
                                                    {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                </p>
                                                <p className="text-xs text-charcoal-500 leading-none">
                                                    {slot.equipment ? Object.entries(slot.equipment).map(([eq, qty]) => `${qty}x ${eq}`).join(', ') : 'Open Space'}
                                                </p>
                                            </div>
                                            {(() => {
                                                const activeBooking = slot.bookings?.find(b => ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || ''));
                                                if (!activeBooking) return null;
                                                return (
                                                    <div className="flex items-center gap-2 pt-1 border-t border-cream-200/50">
                                                        {activeBooking.instructor && (
                                                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-cream-200 shadow-sm" title="Instructor">
                                                                {activeBooking.instructor.avatar_url ? (
                                                                    <Image src={activeBooking.instructor.avatar_url} alt="Instructor" width={16} height={16} className="rounded-full w-4 h-4 object-cover" />
                                                                ) : (
                                                                    <User className="w-3.5 h-3.5 text-charcoal-400" />
                                                                )}
                                                                <span className="text-[11px] font-medium text-charcoal-700">{activeBooking.instructor.full_name || 'N/A'}</span>
                                                            </div>
                                                        )}
                                                        {activeBooking.client && (
                                                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-cream-200 shadow-sm" title="Client">
                                                                {activeBooking.client.avatar_url ? (
                                                                    <Image src={activeBooking.client.avatar_url} alt="Client" width={16} height={16} className="rounded-full w-4 h-4 object-cover" />
                                                                ) : (
                                                                    <Users className="w-3.5 h-3.5 text-charcoal-400" />
                                                                )}
                                                                <span className="text-[11px] font-medium text-charcoal-700">{activeBooking.client.full_name || 'N/A'}</span>
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
                                        className="text-sm text-charcoal-600 hover:text-charcoal-900 font-medium underline decoration-cream-300 hover:decoration-charcoal-500 underline-offset-4"
                                    >
                                        Edit
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-6 border-t border-cream-200 flex justify-end">
                            <button
                                onClick={() => {
                                    setIsBucketModalOpen(false);
                                    setSingleDate(format(bucketTime.date, 'yyyy-MM-dd'));
                                    setSingleTime(`${bucketTime.hour.toString().padStart(2, '0')}:00`);
                                    setSingleEndTime(`${(bucketTime.hour + 1).toString().padStart(2, '0')}:00`);
                                    setAddMode('single');
                                    setIsAddModalOpen(true);
                                }}
                                className="bg-[#B4C3B2] text-white px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all shadow-md active:scale-95 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Another Slot Here
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
