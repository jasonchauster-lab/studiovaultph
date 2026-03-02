'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, getHours, parseISO, setHours, setMinutes, getDay, parse, differenceInMinutes } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Trash2, MapPin, X } from 'lucide-react'
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
    const ROW_HEIGHT = 80 // Match the min-h-[80px] in the grid

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
                                            if (a.date !== toManilaDateStr(day)) return false
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
                                                            slot.date ? "bg-rose-gold border-rose-gold/20 text-charcoal-900" : "bg-teal-100 border-teal-200 text-teal-800"
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
        </div>
    )
}
