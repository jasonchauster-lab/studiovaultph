'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Users, User, Calendar as CalendarIcon, Clock, Trash2, Edit2, X } from 'lucide-react'
import clsx from 'clsx'
import { createSlot, deleteSlot, updateSlot } from '@/app/(dashboard)/studio/actions' // For single slot
import ScheduleManager from './ScheduleManager' // Bulk generator

interface Slot {
    id: string
    start_time: string
    end_time: string
    is_available: boolean
    equipment?: string[]
}

interface StudioScheduleCalendarProps {
    studioId: string
    slots: Slot[]
    currentDate: Date
    availableEquipment: string[]
}

export default function StudioScheduleCalendar({ studioId, slots, currentDate, availableEquipment }: StudioScheduleCalendarProps) {
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
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 9 PM

    const handlePrevWeek = () => {
        const newDate = subWeeks(currentDate, 1)
        router.push(`?date=${newDate.toISOString().split('T')[0]}`)
    }

    const handleNextWeek = () => {
        const newDate = addWeeks(currentDate, 1)
        router.push(`?date=${newDate.toISOString().split('T')[0]}`)
    }

    const handleToday = () => {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
        router.push('?date=' + todayStr)
    }

    // Modal State for Single Slot
    const [singleDate, setSingleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [singleTime, setSingleTime] = useState('09:00')
    const [singleEndTime, setSingleEndTime] = useState('10:00')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleCreateSingle = async (formData: FormData) => {
        // Validate equipment selection
        if (availableEquipment.length > 0) {
            const hasEquipment = Array.from(formData.keys()).some(key => key.startsWith('eq_'));
            if (!hasEquipment) {
                alert('Please select at least one piece of equipment.');
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
        setSingleDate(format(parseISO(slot.start_time), 'yyyy-MM-dd'))
        setSingleTime(format(parseISO(slot.start_time), 'HH:mm'))
        setSingleEndTime(format(parseISO(slot.end_time), 'HH:mm'))
        setIsEditModalOpen(true)
    }

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
                        className="bg-rose-gold text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-gold/90 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
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
            <div className="bg-white rounded-xl border border-cream-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                        <div className="grid grid-cols-8 border-b border-cream-200 bg-cream-50">
                            <div className="p-4 text-xs font-medium text-black border-r border-cream-200 sticky left-0 bg-cream-50 z-20">TIME</div>
                            {days.map(day => (
                                <div key={day.toString()} className={clsx("p-3 text-center border-r border-cream-200 last:border-r-0 min-w-[100px]", isSameDay(day, new Date()) ? "bg-blue-50/50" : "")}>
                                    <div className="text-xs text-charcoal-500 uppercase mb-1 font-bold tracking-tighter">{format(day, 'EEE')}</div>
                                    <div className={clsx("text-lg font-serif", isSameDay(day, new Date()) ? "text-rose-gold font-black" : "text-black")}>{format(day, 'd')}</div>
                                </div>
                            ))}
                        </div>

                        <div className="divide-y divide-cream-100">
                            {hours.map(hour => (
                                <div key={hour} className="grid grid-cols-8 min-h-[80px]">
                                    <div className="p-2 text-xs text-black font-medium border-r border-cream-200 text-center sticky left-0 bg-white z-20">
                                        {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                    </div>

                                    {days.map(day => {
                                        const cellSlots = slots.filter(s => {
                                            const sDate = parseISO(s.start_time)
                                            return isSameDay(sDate, day) && getHours(sDate) === hour
                                        })

                                        return (
                                            <div key={day.toString() + hour} className="border-r border-cream-100 last:border-r-0 relative group p-1 min-h-[80px]">
                                                <div
                                                    className="absolute inset-0 opacity-0 group-hover:opacity-10 opacity-0 transition-opacity bg-charcoal-900 flex items-center justify-center cursor-pointer z-0"
                                                    onClick={() => {
                                                        setSingleDate(format(day, 'yyyy-MM-dd'))
                                                        setSingleTime(`${hour.toString().padStart(2, '0')}:00`)
                                                        setSingleEndTime(`${(hour + 1).toString().padStart(2, '0')}:00`)
                                                        setAddMode('single')
                                                        setIsAddModalOpen(true)
                                                    }}
                                                />

                                                {cellSlots.length > 0 && (
                                                    <div className="space-y-1 relative z-10 cursor-pointer">
                                                        {/* Equipment Slots */}
                                                        {Array.from(new Set(cellSlots.flatMap(s => s.equipment || []))).map(eqType => {
                                                            const availableCount = cellSlots.filter(s => s.is_available && s.equipment?.includes(eqType)).length
                                                            const totalCount = cellSlots.filter(s => s.equipment?.includes(eqType)).length
                                                            const isFullyBooked = availableCount === 0

                                                            return (
                                                                <div
                                                                    key={eqType}
                                                                    className={clsx(
                                                                        "border rounded-md p-2 hover:shadow-md transition-all group/eq",
                                                                        isFullyBooked ? "bg-amber-50 border-amber-200" : "bg-teal-50 border-teal-200"
                                                                    )}
                                                                    onClick={() => {
                                                                        setBucketSlots(cellSlots.filter(s => s.equipment?.includes(eqType)))
                                                                        setBucketTime({ date: day, hour })
                                                                        setIsBucketModalOpen(true)
                                                                    }}
                                                                >
                                                                    <div className={clsx(
                                                                        "text-[10px] font-bold uppercase tracking-wider flex justify-between",
                                                                        isFullyBooked ? "text-amber-800" : "text-teal-800"
                                                                    )}>
                                                                        {eqType}
                                                                        <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/eq:opacity-100" />
                                                                    </div>
                                                                    <div className={clsx(
                                                                        "text-[11px] font-medium leading-tight mt-1",
                                                                        isFullyBooked ? "text-amber-900" : "text-teal-900"
                                                                    )}>
                                                                        {availableCount} of {totalCount} free
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}

                                                        {/* Open Space Slots */}
                                                        {cellSlots.some(s => !s.equipment || s.equipment.length === 0) && (() => {
                                                            const openSlots = cellSlots.filter(s => !s.equipment || s.equipment.length === 0)
                                                            const availableCount = openSlots.filter(s => s.is_available).length
                                                            const totalCount = openSlots.length
                                                            const isFullyBooked = availableCount === 0

                                                            return (
                                                                <div
                                                                    className={clsx(
                                                                        "border rounded-md p-2 hover:shadow-md transition-all group/open",
                                                                        isFullyBooked ? "bg-amber-50 border-amber-200" : "bg-teal-50 border-teal-200"
                                                                    )}
                                                                    onClick={() => {
                                                                        setBucketSlots(openSlots)
                                                                        setBucketTime({ date: day, hour })
                                                                        setIsBucketModalOpen(true)
                                                                    }}
                                                                >
                                                                    <div className={clsx(
                                                                        "text-[10px] font-bold uppercase tracking-wider flex justify-between",
                                                                        isFullyBooked ? "text-amber-800" : "text-teal-800"
                                                                    )}>
                                                                        Open Space
                                                                        <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/open:opacity-100" />
                                                                    </div>
                                                                    <div className={clsx(
                                                                        "text-[11px] font-medium leading-tight mt-1",
                                                                        isFullyBooked ? "text-amber-900" : "text-teal-900"
                                                                    )}>
                                                                        {availableCount} of {totalCount} free
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
                                        <label className="block text-sm font-medium text-charcoal-700 mb-2">Equipment</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {availableEquipment.map(eq => (
                                                <label key={eq} className="flex items-center gap-2 p-2 border border-cream-200 rounded-lg hover:bg-cream-50 cursor-pointer">
                                                    <input type="checkbox" name={`eq_${eq}`} className="w-4 h-4 text-charcoal-900 rounded border-cream-300" />
                                                    <span className="text-sm text-charcoal-700">{eq}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">Quantity Available</label>
                                    <input
                                        name="quantity"
                                        type="number"
                                        min="1"
                                        defaultValue="1"
                                        required
                                        className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 focus:ring-2 focus:ring-charcoal-500 outline-none"
                                        style={{ colorScheme: 'light' }}
                                    />
                                    <p className="text-xs text-charcoal-500 mt-1">Number of machines/spaces available for this time.</p>
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
                                    <div className="grid grid-cols-2 gap-2">
                                        {availableEquipment.map(eq => (
                                            <label key={eq} className="flex items-center gap-2 p-2 border border-cream-200 rounded-lg hover:bg-cream-50 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    name={`eq_${eq}`}
                                                    defaultChecked={editingSlot.equipment?.includes(eq)}
                                                    className="w-4 h-4 text-charcoal-900 rounded border-cream-300"
                                                />
                                                <span className="text-sm text-charcoal-700">{eq}</span>
                                            </label>
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
                                        <div>
                                            <p className="text-sm font-medium text-charcoal-900">
                                                {format(parseISO(slot.start_time), 'h:mm')} - {format(parseISO(slot.end_time), 'h:mm a')}
                                            </p>
                                            <p className="text-xs text-charcoal-500">
                                                {slot.equipment?.join(', ') || 'Open Space'}
                                            </p>
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
                                className="bg-rose-gold text-white px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 transition-all shadow-md active:scale-95 flex items-center gap-2"
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
