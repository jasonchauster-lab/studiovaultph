import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
    format, startOfWeek, endOfWeek, eachDayOfInterval, 
    addWeeks, subWeeks, startOfMonth, endOfMonth, 
    addDays, subDays, addMonths, subMonths, parseISO 
} from 'date-fns'
import { toManilaDateStr, getManilaTodayStr, toManilaDate } from '@/lib/timezone'
import { ScheduleSlot, Booking } from '@/types/agency'
import { createClient } from '@/lib/supabase/client'

export function useScheduleState(
    initialDate: Date, 
    slots: ScheduleSlot[], 
    filteredSlots: ScheduleSlot[], 
    openingTime: string, 
    closingTime: string,
    studioId: string
) {
    const router = useRouter()
    const supabase = createClient()
    
    // UI State
    const [localSlots, setLocalSlots] = useState<ScheduleSlot[]>(slots)
    const [view, setView] = useState<'day' | 'week' | 'month'>('week')
    const [activeBranchFilter, setActiveBranchFilter] = useState<string | null>(null)
    
    // RECTIVE INTEL: Sync schedule changes across staff dashboards in real-time
    useEffect(() => {
        const channel = supabase
            .channel(`schedule-${studioId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'slots',
                filter: `studio_id=eq.${studioId}`
            }, () => {
                // For schedule, it's safer to refresh data due to complex relations (bookings)
                router.refresh()
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'bookings',
                filter: `studio_id=eq.${studioId}`
            }, () => {
                router.refresh()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [studioId, supabase, router])

    // Update local slots when props change
    useEffect(() => {
        setLocalSlots(slots)
    }, [slots])

    // Filter slots based on active branch filter
    const activeFilteredSlots = useMemo(() => {
        if (!activeBranchFilter) return localSlots
        return localSlots.filter(s => s.outlet_id === activeBranchFilter)
    }, [localSlots, activeBranchFilter])
    
    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single')
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isBucketModalOpen, setIsBucketModalOpen] = useState(false)
    const [selectedProfile, setSelectedProfile] = useState<any>(null)
    
    // Slot Edit State
    const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null)
    const [bucketSlots, setBucketSlots] = useState<ScheduleSlot[]>([])
    const [bucketTime, setBucketTime] = useState<{ date: Date, hour: number } | null>(null)

    // Calendar Calculations
    const days = useMemo(() => {
        if (view === 'day') return [initialDate]
        if (view === 'week') {
            const start = startOfWeek(initialDate, { weekStartsOn: 1 })
            const end = endOfWeek(initialDate, { weekStartsOn: 1 })
            return eachDayOfInterval({ start, end })
        }
        const start = startOfWeek(startOfMonth(initialDate), { weekStartsOn: 1 })
        const end = endOfWeek(endOfMonth(initialDate), { weekStartsOn: 1 })
        return eachDayOfInterval({ start, end })
    }, [initialDate, view])

    const startHour = parseInt(openingTime.split(':')[0], 10)
    const endHour = parseInt(closingTime.split(':')[0], 10)
    const hours = useMemo(() => {
        const h = []
        const loopEnd = endHour < startHour ? startHour : endHour
        for (let i = startHour; i <= loopEnd; i++) h.push(i)
        return h
    }, [startHour, endHour])

    const slotMap = useMemo(() => {
        const map: Record<string, ScheduleSlot[]> = {};
        (activeFilteredSlots || []).forEach(slot => {
            const sHour = parseInt(slot.start_time.split(':')[0], 10)
            // Ensure we use a clean YYYY-MM-DD date string for the key
            const dStr = typeof slot.date === 'string' ? slot.date.split('T')[0] : format(slot.date, 'yyyy-MM-dd')
            const key = `${dStr}-${sHour}`
            if (!map[key]) map[key] = []
            map[key].push(slot)
        })
        return map
    }, [activeFilteredSlots])

    // HIGH-PERFORMANCE: Pre-indexed map for Day/Month lookups
    const dateMap = useMemo(() => {
        const map: Record<string, ScheduleSlot[]> = {};
        (activeFilteredSlots || []).forEach(slot => {
            if (!map[slot.date]) map[slot.date] = []
            map[slot.date].push(slot)
        })
        return map
    }, [activeFilteredSlots])

    // HIGH-PERFORMANCE: Pre-computed cell metadata for Week/Day/Mobile views
    const cellMetadata = useMemo(() => {
        const metadata: Record<string, any> = {};
        
        (activeFilteredSlots || []).forEach(s => {
            const hour = parseInt(s.start_time.split(':')[0], 10)
            const key = `${s.date}-${hour}`
            
            if (!metadata[key]) {
                metadata[key] = {
                    slots: [],
                    allActiveBookings: [],
                    equipmentCounts: {},
                    instructors: new Set<string>(),
                    classNames: new Set<string>(),
                    hasPending: false,
                    isMarketplace: false,
                    calendarColor: s.calendar_color || s.color
                }
            }
            
            const m = metadata[key]
            m.slots.push(s)
            
            const activeBookings = s.bookings?.filter(b => 
                ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '')
            ) || []
            m.allActiveBookings.push(...activeBookings)
            
            if (activeBookings.some(b => b.status?.toLowerCase() === 'pending')) m.hasPending = true
            // @ts-ignore
            if (activeBookings.some(b => b.origin_portal === 'marketplace')) m.isMarketplace = true
            
            if (s.equipment) {
                Object.entries(s.equipment).forEach(([eq, qty]) => {
                    if (!m.equipmentCounts[eq]) m.equipmentCounts[eq] = { booked: 0, total: qty as number }
                    else m.equipmentCounts[eq].total += qty as number
                    
                    const bookedForThisEq = activeBookings.filter((b: any) =>
                        (b.price_breakdown?.equipment?.toUpperCase() === eq.toUpperCase() || 
                         b.equipment?.toUpperCase() === eq.toUpperCase())
                    ).length
                    m.equipmentCounts[eq].booked += bookedForThisEq
                    m.classNames.add(eq)
                })
            }
            
            activeBookings.forEach(b => {
                if (b.instructor?.full_name) m.instructors.add(b.instructor.full_name)
            })
        })

        Object.keys(metadata).forEach(key => {
            const m = metadata[key]
            m.isBooked = m.allActiveBookings.length > 0
            m.displayTitle = m.allActiveBookings.length === 0
                ? (Array.from(m.classNames).join(' / ') || "Studio Session")
                : m.allActiveBookings.length === 1
                    ? (m.allActiveBookings[0].client?.full_name || "Booked Session")
                    : `${m.allActiveBookings[0].client?.full_name || "Client"} + ${m.allActiveBookings.length - 1} more`
        })

        return metadata
    }, [activeFilteredSlots])

    const mobileSessions = useMemo(() => {
        return Object.entries(cellMetadata).map(([key, m]) => {
            const first = m.slots[0]
            const instructorNames = Array.from(m.instructors)
            const footerText = instructorNames.length > 0
                ? `With ${instructorNames.join(', ')}`
                : "Instructor: Unassigned"
            
            let totalBooked = 0, totalQty = 0
            Object.values(m.equipmentCounts).forEach((eq: any) => {
                totalBooked += eq.booked
                totalQty += eq.total
            })

            return {
                id: key,
                start_time: first.start_time,
                end_time: first.end_time,
                date: first.date,
                type: m.displayTitle,
                location: footerText,
                is_booked: m.isBooked,
                displayRatio: `${totalBooked}/${totalQty}`,
                displayTitle: m.displayTitle,
                calendar_color: m.calendarColor
            }
        })
    }, [cellMetadata])

    // Current Time Line Logic
    const [now, setNow] = useState(toManilaDate(new Date()))
    useEffect(() => {
        const timer = setInterval(() => setNow(toManilaDate(new Date())), 60000)
        return () => clearInterval(timer)
    }, [])

    const currentTimePosition = useMemo(() => {
        const hours24 = now.getUTCHours()
        const minutes = now.getUTCMinutes()
        const totalMinutes = hours24 * 60 + minutes
        const startMinutes = startHour * 60
        const endMinutes = (endHour + 1) * 60
        if (totalMinutes < startMinutes || totalMinutes > endMinutes) return null
        return ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100
    }, [now, startHour, endHour])

    // Navigation
    const handlePrev = () => {
        const newDate = view === 'day' ? subDays(initialDate, 1) : view === 'week' ? subWeeks(initialDate, 1) : subMonths(initialDate, 1)
        router.push(`?date=${toManilaDateStr(newDate)}`)
    }
    const handleNext = () => {
        const newDate = view === 'day' ? addDays(initialDate, 1) : view === 'week' ? addWeeks(initialDate, 1) : addMonths(initialDate, 1)
        router.push(`?date=${toManilaDateStr(newDate)}`)
    }
    const handleToday = () => router.push('?date=' + getManilaTodayStr())

    return {
        view, setView,
        activeBranchFilter, setActiveBranchFilter,
        isAddModalOpen, setIsAddModalOpen,
        addMode, setAddMode,
        isEditModalOpen, setIsEditModalOpen,
        isBucketModalOpen, setIsBucketModalOpen,
        selectedProfile, setSelectedProfile,
        editingSlot, setEditingSlot,
        bucketSlots, setBucketSlots,
        bucketTime, setBucketTime,
        days, hours, slotMap, dateMap, cellMetadata, mobileSessions,
        currentTimePosition,
        handlePrev, handleNext, handleToday
    }
}
