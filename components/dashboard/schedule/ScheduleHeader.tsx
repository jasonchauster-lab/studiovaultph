import React from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Sparkles } from 'lucide-react'
import clsx from 'clsx'

interface ScheduleHeaderProps {
    currentDate: Date
    view: 'day' | 'week' | 'month'
    outletId?: string
    outlets: any[]
    activeBranchFilter: string | null
    onPrev: () => void
    onNext: () => void
    onToday: () => void
    onDateChange: (date: string) => void
    onViewChange: (view: 'day' | 'week' | 'month') => void
    onBranchFilterChange: (id: string | null) => void
    onAddSlot: () => void
    onBulkGenerate: () => void
}

export const ScheduleHeader = ({
    currentDate, view, outletId, outlets, activeBranchFilter,
    onPrev, onNext, onToday, onDateChange, onViewChange,
    onBranchFilterChange, onAddSlot, onBulkGenerate
}: ScheduleHeaderProps) => {
    return (
        <div className="p-10 bg-white shadow-tight relative overflow-hidden ring-1 ring-zinc-100 rounded-[3rem]">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                <div className="space-y-6 flex-1">
                    <h2 className="text-5xl text-zinc-900 tracking-tightest font-black">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-zinc-50 rounded-xl p-1.5 border border-zinc-100 shadow-tight">
                            <button onClick={onPrev} className="flex items-center gap-2 px-4 py-2.5 hover:bg-white rounded-lg transition-all text-zinc-400 hover:text-zinc-900 text-[11px] font-black uppercase tracking-widest group" title="Previous">
                                <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> PREV
                            </button>
                            <button onClick={onToday} className="px-6 py-2.5 text-[11px] font-black text-zinc-900 uppercase tracking-widest hover:bg-white rounded-lg transition-all border-x border-zinc-100/50 mx-1" title="Go to Today">
                                TODAY
                            </button>
                            <button onClick={onNext} className="flex items-center gap-2 px-4 py-2.5 hover:bg-white rounded-lg transition-all text-zinc-400 hover:text-zinc-900 text-[11px] font-black uppercase tracking-widest group" title="Next">
                                NEXT <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                            </button>
                        </div>
                        <div className="relative group">
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-colors group-focus-within:text-primary" />
                            <input
                                type="date"
                                value={format(currentDate, 'yyyy-MM-dd')}
                                onChange={(e) => { if (e.target.value) onDateChange(e.target.value) }}
                                className="pl-12 pr-6 py-3.5 border border-zinc-100 rounded-xl text-[11px] font-black bg-white text-zinc-900 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer uppercase tracking-widest shadow-tight w-48"
                                title="Jump to date"
                            />
                        </div>

                        {!outletId && outlets.length > 1 && (
                            <div className="flex items-center gap-2 bg-zinc-50 p-1 rounded-xl border border-zinc-100 shadow-tight">
                                <button
                                    onClick={() => onBranchFilterChange(null)}
                                    className={clsx(
                                        "px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all",
                                        !activeBranchFilter ? "bg-zinc-900 text-white shadow-card" : "text-zinc-400 hover:bg-white"
                                    )}
                                >
                                    All
                                </button>
                                {outlets.map(o => (
                                    <button
                                        key={o.id}
                                        onClick={() => onBranchFilterChange(o.id)}
                                        className={clsx(
                                            "px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap",
                                            activeBranchFilter === o.id ? "bg-primary text-white shadow-card" : "text-zinc-400 hover:bg-white"
                                        )}
                                    >
                                        {o.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-6">
                    <div className="flex items-center bg-white rounded-xl p-1.5 border border-zinc-100 shadow-tight">
                        {(['day', 'week', 'month'] as const).map((v) => (
                            <button
                                key={v}
                                onClick={() => onViewChange(v)}
                                className={clsx(
                                    "px-4 py-2.5 text-[11px] font-black uppercase tracking-tight rounded-lg transition-all duration-300",
                                    view === v
                                        ? "bg-zinc-900 text-white shadow-card translate-y-[-1px]"
                                        : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50"
                                )}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onAddSlot}
                            className="h-12 border-2 border-primary/20 px-6 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all flex items-center gap-3 shadow-tight active:scale-95 text-primary bg-white hover:bg-primary hover:text-white hover:border-primary"
                        >
                            <Plus className="w-4 h-4" /> ADD SLOT
                        </button>
                        <button
                            onClick={onBulkGenerate}
                            className="h-12 px-6 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all flex items-center gap-3 bg-primary text-white hover:brightness-110 shadow-card active:scale-95"
                        >
                            <Sparkles className="w-4 h-4" /> BULK GENERATE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
