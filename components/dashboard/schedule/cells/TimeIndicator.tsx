import React from 'react'
import { isSameDay } from 'date-fns'

interface TimeIndicatorProps {
    view: 'day' | 'week' | 'month'
    days: Date[]
    currentTimePosition: number | null
}

export const TimeIndicator = ({ view, days, currentTimePosition }: TimeIndicatorProps) => {
    if (currentTimePosition === null || !days.some(d => isSameDay(d, new Date()))) return null

    const todayIndex = days.findIndex(d => isSameDay(d, new Date()))

    return (
        <div
            className="absolute z-30 pointer-events-none flex items-center transition-all duration-1000"
            style={{
                top: `${currentTimePosition}%`,
                left: view === 'day'
                    ? '100px'
                    : `calc(100px + ${todayIndex} * (100% - 100px) / 7)`,
                width: view === 'day'
                    ? 'calc(100% - 100px)'
                    : `calc((100% - 100px) / 7)`
            }}
        >
            <div className="w-3.5 h-3.5 bg-charcoal rounded-full -ml-1.5 ring-4 ring-white shadow-card" />
            <div className="h-0.5 w-full bg-charcoal/30 shadow-sm" />
        </div>
    )
}
