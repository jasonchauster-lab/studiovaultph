import React from 'react'
import { Edit2, Sparkles, Plus, Clock, Users } from 'lucide-react'
import clsx from 'clsx'

interface SlotCellProps {
    hour: number
    day: Date
    dayStr: string
    cellSlots: any[]
    isPastCell: boolean
    isToday: boolean
    isBooked: boolean
    hasPending: boolean
    isMarketplace: boolean
    displayTitle: string
    calendarColor?: string
    instructors: Set<string>
    equipmentCounts: Record<string, { booked: number, total: number }>
    outlets: any[]
    outletId?: string
    onAddClick: (day: string, hour: number) => void
    onSlotClick: (slots: any[]) => void
}

export const SlotCell = React.memo(({ 
    hour, day, dayStr, cellSlots, isPastCell, isToday, 
    isBooked, hasPending, isMarketplace, displayTitle, 
    calendarColor, instructors, equipmentCounts, outlets, outletId,
    onAddClick, onSlotClick 
}: SlotCellProps) => {
    if (cellSlots.length === 0) {
        return (
            <div
                className={clsx(
                    "absolute inset-1.5 rounded-2xl transition-all duration-500 bg-zinc-50 cursor-pointer z-0 flex items-center justify-center opacity-0 group-hover:opacity-100 border-2 border-dashed border-zinc-200 shadow-inner"
                )}
                onClick={(e) => {
                    e.stopPropagation()
                    onAddClick(dayStr, hour)
                }}
            >
                <div className="flex flex-col items-center gap-2">
                    <Plus className="w-5 h-5 text-zinc-400 group-hover:text-primary transition-colors" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-primary">Add Slot</span>
                </div>
            </div>
        )
    }

    return (
        <div
            className={clsx(
                "absolute top-1 left-1 right-1 bottom-1 p-2.5 border-l-4 border-solid transition-all duration-500 hover:shadow-2xl hover:-translate-y-0.5 group/slot z-10 overflow-hidden cursor-pointer rounded-xl flex flex-col justify-between",
                isPastCell ? (isBooked ? "bg-zinc-800 border-zinc-600 shadow-none opacity-80" : "bg-zinc-50 border-zinc-200 opacity-60") :
                hasPending ? "bg-amber-50 border-amber-400 shadow-xl shadow-amber-500/10" :
                isBooked ? "bg-zinc-900 border-primary shadow-2xl shadow-zinc-900/20 text-white" : "bg-white border-zinc-100 shadow-sm hover:border-primary/30 hover:bg-zinc-50/50"
            )}
            style={{ 
                borderLeftColor: !isPastCell && !hasPending && !isBooked && calendarColor ? calendarColor : undefined 
            }}
            onClick={() => onSlotClick(cellSlots)}
        >
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <div className={clsx("flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest", isBooked ? "text-white/50" : "text-zinc-400")}>
                        <Clock className="w-3 h-3" />
                        {hour.toString().padStart(2, '0')}:00
                    </div>
                    <Edit2 className={clsx("w-3 h-3 opacity-0 group-hover/slot:opacity-100 transition-all duration-300 shrink-0 transform group-hover/slot:scale-110", 
                        isBooked ? "text-white/40" : "text-zinc-300")} />
                </div>
                
                <h4 className={clsx("text-[10px] font-black mb-3 truncate uppercase tracking-tight leading-tight", isBooked ? "text-white" : "text-zinc-900")}>
                    {displayTitle}
                </h4>

                <div className="flex flex-wrap gap-1">
                    {Object.entries(equipmentCounts).map(([eq, counts]) => (
                        <span key={eq} className={clsx("text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 px-1.5 py-0.5 rounded-md border transition-colors", 
                            isBooked ? "text-white border-white/10 bg-white/5" : "text-zinc-900 border-zinc-100 bg-zinc-50")}>
                            <Users className="w-2.5 h-2.5" />
                            {counts.booked}/{counts.total}
                        </span>
                    ))}
                </div>
            </div>

            <div className={clsx("mt-2 pt-2 border-t flex items-center justify-between gap-2", isBooked ? "border-white/5" : "border-zinc-50")}>
                <p className={clsx("text-[8px] font-black uppercase tracking-widest flex items-center truncate", 
                    isBooked ? "text-white/50" : "text-zinc-400")}>
                    {instructors.size > 0 ? Array.from(instructors)[0] : 'Unassigned'}
                </p>
                {isMarketplace && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary text-white text-[7px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                        <Sparkles className="w-2.5 h-2.5" /> MKT
                    </span>
                )}
            </div>

            {isBooked && !isPastCell && (
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            )}
        </div>
    )
})
