import React, { useMemo } from 'react'
import { format, isSameDay } from 'date-fns'
import clsx from 'clsx'
import { toManilaDateStr } from '@/lib/timezone'
import { useRouter } from 'next/navigation'

import { ScheduleSlot } from '@/types/agency'

interface MonthViewProps {
    days: Date[]
    slots: ScheduleSlot[]
    dateMap: Record<string, ScheduleSlot[]>
    currentDate: Date
}

export const MonthView = React.memo(({ days, dateMap, currentDate }: MonthViewProps) => {
    const router = useRouter()

    return (
        <div className="min-w-0">
            <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50/50">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="p-4 text-center text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] border-r border-zinc-100 last:border-r-0">
                        {d}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-y divide-border-grey">
                {days.map((day) => {
                    const dayStr = toManilaDateStr(day);
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();

                    // Group slots by time+equipment_type, only for equipment with qty > 0
                    // OPTIMIZATION: Use pre-indexed dateMap for O(1) lookup
                    const daySlotsData = (dateMap[dayStr] || [])
                        .sort((a, b) => a.start_time.localeCompare(b.start_time));
                    
                    const eqGroups: Record<string, { booked: number, total: number, time: string, displayType: string, rep: any }> = {};
                    daySlotsData.forEach(s => {
                        const time = s.start_time.slice(0, 5);
                        if (s.equipment && typeof s.equipment === 'object') {
                            Object.entries(s.equipment).forEach(([eq, qty]) => {
                                if ((qty as number) <= 0) return;
                                const key = `${time}-${eq.toUpperCase()}`;
                                const bookedForEq = s.bookings?.filter((b: any) =>
                                    ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '') &&
                                    (b.price_breakdown?.equipment?.toUpperCase() === eq.toUpperCase() || b.equipment?.toUpperCase() === eq.toUpperCase())
                                ).length || 0;
                                if (!eqGroups[key]) eqGroups[key] = { booked: 0, total: 0, time, displayType: eq, rep: s };
                                eqGroups[key].booked += bookedForEq;
                                eqGroups[key].total += qty as number;
                            });
                        } else {
                            const key = `${time}-Open`;
                            const booked = s.bookings?.filter((b: any) => ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '')).length || 0;
                            if (!eqGroups[key]) eqGroups[key] = { booked: 0, total: 0, time, displayType: 'Open', rep: s };
                            eqGroups[key].booked += booked;
                            eqGroups[key].total += s.quantity || 1;
                        }
                    });
                    const uniqueDisplaySlots = Object.entries(eqGroups)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, g]) => ({ ...g.rep, key, displayType: g.displayType, booked: g.booked, total: g.total, start_time: g.time + ':00' }));

                    return (
                        <div
                            key={day.toString()}
                            className={clsx(
                                "min-h-[140px] p-4 transition-all hover:bg-primary/5 cursor-pointer border-r border-b border-zinc-100",
                                    !isCurrentMonth && "bg-zinc-50/30 opacity-60",
                                    isSameDay(day, new Date()) && "bg-primary/5"
                            )}
                            onClick={() => {
                                const targetDate = format(day, 'yyyy-MM-dd')
                                router.push(`?date=${targetDate}`)
                            }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={clsx(
                                    "text-lg font-black tracking-tightest leading-none",
                                    isSameDay(day, new Date()) ? "text-primary" : "text-zinc-900"
                                )}>
                                    {format(day, 'd')}
                                </span>
                                {uniqueDisplaySlots.length > 0 && (
                                    <span className="text-[9px] font-black text-slate/40 uppercase tracking-widest">
                                        {uniqueDisplaySlots.length} Slots
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1">
                                {uniqueDisplaySlots.slice(0, 3).map((s: any) => (
                                    <div key={s.key} 
                                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-zinc-50 border border-zinc-100 shadow-sm"
                                        style={{ 
                                            borderLeft: s.calendar_color || s.color ? `3px solid ${s.calendar_color || s.color}` : undefined
                                        }}
                                    >
                                        <span className="text-[8px] font-black text-zinc-900 truncate uppercase tracking-tight">
                                            {s.start_time.slice(0, 5)} {s.displayType}
                                        </span>
                                        <span className="text-[8px] font-black text-primary shrink-0 bg-white px-1.5 py-0.5 rounded-md border border-zinc-100">
                                            {s.booked}/{s.total}
                                        </span>
                                    </div>
                                ))}
                                {uniqueDisplaySlots.length > 3 && (
                                    <div className="text-[7px] font-black text-zinc-300 text-center uppercase tracking-widest pt-2">
                                        + {uniqueDisplaySlots.length - 3} more slots
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
})
