import React from 'react'
import { format, isSameDay, isPast } from 'date-fns'
import clsx from 'clsx'
import { SlotCell } from '../cells/SlotCell'
import { TimeIndicator } from '../cells/TimeIndicator'
import { toManilaDateStr } from '@/lib/timezone'

interface WeekViewProps {
    days: Date[]
    hours: number[]
    slotMap: Record<string, any[]>
    view: 'day' | 'week' | 'month'
    currentTimePosition: number | null
    outlets: any[]
    outletId?: string
    cellMetadata: Record<string, any>
    onAddClick: (date: string, hour: number) => void
    onSlotClick: (slots: any[]) => void
}

export const WeekView = ({ 
    days, hours, slotMap, view, currentTimePosition, 
    outlets, outletId, cellMetadata, onAddClick, onSlotClick 
}: WeekViewProps) => {
    return (
        <div className={clsx("min-w-[1000px] xl:min-w-full")}>
            <div className={clsx("grid border-b border-zinc-100 bg-zinc-50/50 backdrop-blur-sm", view === 'day' ? "grid-cols-[100px_1fr]" : "grid-cols-[100px_repeat(7,1fr)]")}>
                <div className="p-6 border-r border-zinc-100 sticky left-0 bg-white z-20 w-[100px]" />
                {days.map((day: Date) => (
                    <div key={day.toString()} className={clsx("p-6 text-center border-r border-zinc-100 last:border-r-0 transition-all relative", isSameDay(day, new Date()) ? "bg-primary/5" : "")}>
                        <div className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em] mb-2 opacity-80">{format(day, 'EEE')}</div>
                        <div className={clsx("text-4xl font-black tracking-tightest leading-none", isSameDay(day, new Date()) ? "text-primary" : "text-zinc-900")}>{format(day, 'd')}</div>
                        {isSameDay(day, new Date()) && (
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-primary rounded-t-full" />
                        )}
                    </div>
                ))}
            </div>

            <div className="divide-y divide-border-grey relative overflow-hidden">
                <TimeIndicator view={view} days={days} currentTimePosition={currentTimePosition} />

                {hours.map(hour => (
                    <div key={hour} className={clsx("grid", view === 'day' ? "grid-cols-[100px_1fr]" : "grid-cols-[100px_repeat(7,1fr)]")} style={{ minHeight: "140px" }}>
                        <div className="p-4 text-[10px] text-zinc-900 font-black border-r border-zinc-100 sticky left-0 bg-zinc-50 z-20 w-[100px] flex items-center justify-center tracking-[0.2em] shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
                            {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                        </div>

                        {days.map((day: Date) => {
                            const dayStr = toManilaDateStr(day)
                            const key = `${dayStr}-${hour}`
                            const m = cellMetadata[key] || { 
                                slots: [], 
                                allActiveBookings: [], 
                                equipmentCounts: {}, 
                                instructors: new Set(), 
                                isBooked: false, 
                                hasPending: false, 
                                isMarketplace: false, 
                                displayTitle: "Studio Session" 
                            }
                            const isPastCell = isPast(new Date(dayStr + "T" + hour.toString().padStart(2, '0') + ":59:59+08:00"))
                            const isToday = isSameDay(day, new Date())

                            return (
                                <div key={day.toString() + hour} className={clsx("border-r border-zinc-100 last:border-r-0 relative group p-1.5 transition-colors duration-300", isPastCell ? "bg-zinc-50/50" : isToday ? "bg-primary/5" : "hover:bg-zinc-50/50")} style={{ height: "140px" }}>
                                    <SlotCell 
                                        hour={hour}
                                        day={day}
                                        dayStr={dayStr}
                                        cellSlots={m.slots}
                                        isPastCell={isPastCell}
                                        isToday={isToday}
                                        isBooked={m.isBooked}
                                        hasPending={m.hasPending}
                                        isMarketplace={m.isMarketplace}
                                        displayTitle={m.displayTitle}
                                        calendarColor={m.calendarColor}
                                        instructors={m.instructors}
                                        equipmentCounts={m.equipmentCounts}
                                        outlets={outlets}
                                        outletId={outletId}
                                        onAddClick={onAddClick}
                                        onSlotClick={onSlotClick}
                                    />
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}
