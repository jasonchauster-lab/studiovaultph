import React, { useState, useMemo } from 'react'

interface AnalyticsData {
    occupancy: Array<{ dow: number, hour: number, bookings: number }>
    cohort: Array<{ cohort: string, month_index: number, active_users: number }>
}

export function useAnalyticsLogic(initialData: AnalyticsData) {
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)

    // Heatmap Logic - OPTIMIZED: Pre-index occupancy for O(1) lookup
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const hours = Array.from({ length: 15 }, (_, i) => i + 7) // 7 AM to 9 PM

    const occupancyMap = useMemo(() => {
        const map = new Map<string, number>()
        initialData?.occupancy?.forEach(o => {
            map.set(`${o.dow}-${o.hour}`, o.bookings)
        })
        return map
    }, [initialData?.occupancy])

    // Cohort Logic - OPTIMIZED: Group cohort records by month
    const cohort = initialData?.cohort || []
    
    const cohortMonths = useMemo(() => 
        Array.from(new Set(cohort.map(c => c.cohort))).sort().reverse()
    , [cohort])

    const groupedCohort = useMemo(() => {
        const groups: Record<string, Record<number, number>> = {}
        cohort.forEach(c => {
            if (!groups[c.cohort]) groups[c.cohort] = {}
            groups[c.cohort][c.month_index] = c.active_users
        })
        return groups
    }, [cohort])

    const maxMonthIndex = useMemo(() => 
        cohort.length > 0 ? Math.max(...cohort.map(c => c.month_index), 0) : 0
    , [cohort])

    return {
        days,
        hours,
        occupancyMap,
        cohortMonths,
        groupedCohort,
        maxMonthIndex,
        isInfoModalOpen,
        setIsInfoModalOpen
    }
}
