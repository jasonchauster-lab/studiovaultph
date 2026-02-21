'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, setHours, setMinutes, getDay, parse, differenceInMinutes } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Trash2, MapPin, X } from 'lucide-react'
import clsx from 'clsx'
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
}

interface InstructorScheduleCalendarProps {
    availability: Availability[]
    currentDate?: Date // Made optional with default
}

export default function InstructorScheduleCalendar({ availability, currentDate = new Date() }: InstructorScheduleCalendarProps) {
    const router = useRouter()
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Single Add Form State
    const [singleDate, setSingleDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [singleTime, setSingleTime] = useState('09:00')
    const [singleEndTime, setSingleEndTime] = useState('10:00')
    const [location, setLocation] = useState('BGC')

    // Calendar Calculations
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // Monday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const hours = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM to 9 PM
    const ROW_HEIGHT = 80 // Match the min-h-[80px] in the grid

    const handlePrevWeek = () => {
        const newDate = subWeeks(currentDate, 1)
        router.push(`?date=${newDate.toISOString().split('T')[0]}`)
    }

    const handleNextWeek = () => {
        const newDate = addWeeks(currentDate, 1)
        router.push(`?date=${newDate.toISOString().split('T')[0]}`)
    }

    const handleToday = () => {
        router.push('?date=' + new Date().toISOString().split('T')[0])
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this availability?')) return;
        setIsSubmitting(true)
        await deleteAvailability(id)
        setIsSubmitting(false)
        router.refresh()
    }

    const handleCreateSingle = async (formData: FormData) => {
        setIsSubmitting(true)
        const { generateRecurringAvailability } = await import('@/app/(dashboard)/instructor/schedule/actions');

        const result = await generateRecurringAvailability({
            startDate: singleDate,
            endDate: singleDate,
            days: [new Date(singleDate).getDay()],
            startTime: singleTime,
            endTime: singleEndTime,
            location: location
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
        setLocation(slot.location_area)
        setIsEditModalOpen(true)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-cream-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-serif text-charcoal-900">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center bg-cream-100 rounded-lg p-1">
                        <button onClick={handlePrevWeek} className="p-1 hover:bg-white rounded-md transition-all text-charcoal-600">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={handleToday} className="px-3 py-1 text-xs font-medium text-charcoal-700 hover:bg-white rounded-md transition-all">
                            Today
                        </button>
                        <button onClick={handleNextWeek} className="p-1 hover:bg-white rounded-md transition-all text-charcoal-600">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => { setAddMode('single'); setIsAddModalOpen(true); }}
                        className="bg-charcoal-900 text-cream-50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-charcoal-800 transition-colors flex items-center gap-2"
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
                            <div key={day.toString()} className={clsx("p-3 text-center border-r border-cream-200 last:border-r-0 min-w-[100px]", isSameDay(day, new Date()) ? "bg-blue-50/50" : "")}>
                                <div className="text-xs text-charcoal-500 uppercase mb-1">{format(day, 'EEE')}</div>
                                <div className={clsx("text-lg font-serif", isSameDay(day, new Date()) ? "text-blue-600 font-bold" : "text-charcoal-900")}>{format(day, 'd')}</div>
                            </div>
                        ))}
                    </div>

                    <div className="divide-y divide-cream-100 relative">
                        {hours.map(hour => (
                            <div key={hour} className="grid grid-cols-8 min-h-[80px]">
                                <div className="p-2 text-xs text-charcoal-900 font-medium border-r border-cream-200 text-center sticky left-0 bg-white z-20 w-20 flex items-center justify-center">
                                    {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                                </div>

                                {days.map(day => {
                                    // Start of hour for this cell
                                    const cellStartTime = setMinutes(setHours(day, hour), 0)

                                    // Filter availability that STARTS in this hour
                                    const startingSlots = availability.filter(a => {
                                        if (a.date) {
                                            if (!isSameDay(parseISO(a.date), day)) return false
                                        } else {
                                            if (a.day_of_week !== getDay(day)) return false
                                        }
                                        const startH = parseInt(a.start_time.split(':')[0])
                                        return startH === hour
                                    })

                                    return (
                                        <div key={day.toString() + hour} className="border-r border-cream-100 last:border-r-0 relative group p-0 min-h-[80px]">
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
                                            {startingSlots.map((slot, idx) => {
                                                const startMin = parseInt(slot.start_time.split(':')[1])
                                                const [endH, endM] = slot.end_time.split(':').map(Number)

                                                // Calculate duration in minutes
                                                const startTotal = hour * 60 + startMin
                                                const endTotal = endH * 60 + endM
                                                const duration = endTotal - startTotal

                                                // Convert to pixels (ensure it actually fits)
                                                // 60 minutes = 80px
                                                const topOffset = (startMin / 60) * ROW_HEIGHT
                                                const heightPx = (duration / 60) * ROW_HEIGHT

                                                return (
                                                    <div
                                                        key={slot.id}
                                                        className={clsx(
                                                            "absolute left-1 right-1 rounded-md text-xs hover:shadow-lg transition-all cursor-pointer overflow-hidden border z-10 p-2",
                                                            slot.date ? "bg-blue-100 border-blue-200 text-blue-800" : "bg-teal-100 border-teal-200 text-teal-800"
                                                        )}
                                                        style={{
                                                            top: `${topOffset}px`,
                                                            height: `${heightPx}px`,
                                                            width: startingSlots.length > 1 ? `${90 / startingSlots.length}%` : '95%',
                                                            left: startingSlots.length > 1 ? `${(idx * 100) / startingSlots.length}%` : '2.5%'
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            openEditModal(slot)
                                                        }}
                                                        title="Click to edit"
                                                    >
                                                        <div className="font-bold flex items-center justify-between text-[10px] truncate">
                                                            <span>{slot.date ? 'Date Specific' : 'Weekly'}</span>
                                                        </div>
                                                        <div className="text-[10px] mt-0.5 flex items-center gap-1 font-medium">
                                                            <Clock className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                                                        </div>
                                                        <div className="text-[10px] mt-0.5 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">{slot.location_area}</span>
                                                        </div>
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
                            <form action={handleCreateSingle} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">Date</label>
                                    <input name="date" type="date" required value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal-700 mb-1">Start Time</label>
                                        <input name="startTime" type="time" required value={singleTime} onChange={(e) => setSingleTime(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-charcoal-700 mb-1">End Time</label>
                                        <input name="endTime" type="time" required value={singleEndTime} onChange={(e) => setSingleEndTime(e.target.value)} className="w-full px-3 py-2 border border-cream-300 rounded-lg bg-white text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1">Location</label>
                                    <select
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none bg-white focus:ring-2 focus:ring-charcoal-500"
                                        name="location"
                                    >
                                        {['BGC', 'Makati', 'Alabang', 'Quezon City', 'Ortigas', 'Mandaluyong'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="submit" disabled={isSubmitting} className="flex-1 bg-charcoal-900 text-cream-50 py-2.5 rounded-lg font-medium hover:bg-charcoal-800 transition-colors">
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
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">Location</label>
                                <select
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none bg-white"
                                    name="location"
                                >
                                    {['BGC', 'Makati', 'Alabang', 'Quezon City', 'Ortigas', 'Mandaluyong'].map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-cream-100 mt-4">
                                <button type="submit" disabled={isSubmitting} className="flex-1 bg-charcoal-900 text-cream-50 py-2.5 rounded-lg font-medium hover:bg-charcoal-800 transition-colors">
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false)
                                        handleDelete(editingSlot.id)
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 bg-white text-red-600 border border-red-200 py-2.5 rounded-lg font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Availability
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
