import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { Tooltip } from '@/components/ui/Tooltip'

interface OccupancyHeatmapProps {
    days: string[]
    hours: number[]
    occupancyMap: Map<string, number>
}

export const OccupancyHeatmap = React.memo(({ days, hours, occupancyMap }: OccupancyHeatmapProps) => {
    const getOccupancyColor = (count: number) => {
        if (count === 0) return 'bg-zinc-50 border-zinc-100/50'
        if (count < 3) return 'bg-primary/10 border-primary/10'
        if (count < 6) return 'bg-primary/30 border-primary/20'
        if (count < 10) return 'bg-primary/60 border-primary/40 shadow-sm'
        return 'bg-primary border-primary shadow-md'
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white border border-zinc-100 rounded-[3rem] p-12 shadow-sm space-y-10 relative overflow-hidden"
        >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <span className="w-1.5 h-6 bg-primary rounded-full" />
                        <h3 className="text-xl font-black text-zinc-900 tracking-tightest">Occupancy Heatmap</h3>
                    </div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4.5">Peak booking hours across the week</p>
                </div>
                
                <div className="flex items-center gap-4 bg-zinc-50 p-2 px-4 rounded-2xl border border-zinc-100">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Intensity</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-zinc-50 border border-zinc-100" />
                        <div className="w-3 h-3 rounded-sm bg-primary/20" />
                        <div className="w-3 h-3 rounded-sm bg-primary/60" />
                        <div className="w-3 h-3 rounded-sm bg-primary" />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto pb-4 custom-scrollbar">
                <div className="min-w-[900px]">
                    {/* Hour Labels */}
                    <div className="grid grid-cols-[120px_repeat(15,1fr)] gap-3 mb-6">
                        <div />
                        {hours.map(h => (
                            <div key={h} className="text-center text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                                {h > 12 ? `${h-12}P` : `${h}A`}
                            </div>
                        ))}
                    </div>

                    {/* Grid Rows */}
                    <div className="space-y-3">
                        {days.map((day, dIdx) => (
                            <div key={day} className="grid grid-cols-[120px_repeat(15,1fr)] gap-3 items-center">
                                <div className="text-[10px] font-black text-zinc-900 uppercase tracking-widest pr-6 text-right leading-none">
                                    {day}
                                </div>
                                {hours.map(h => {
                                    const count = occupancyMap.get(`${dIdx}-${h}`) || 0
                                    return (
                                        <Tooltip key={h} content={`${count} bookings`}>
                                            <div 
                                                className={clsx(
                                                    "aspect-square rounded-xl transition-all hover:scale-110 hover:ring-4 hover:ring-primary/10 cursor-help relative group border",
                                                    getOccupancyColor(count)
                                                )}
                                            />
                                        </Tooltip>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    )
})

OccupancyHeatmap.displayName = 'OccupancyHeatmap'
