'use client'

import React from 'react'
import { Calendar, MapPin, User as UserIcon, ChevronRight } from 'lucide-react'
import { parse, differenceInMinutes } from 'date-fns'
import { clsx } from 'clsx'

interface StudioAgendaProps {
    slots: any[]
    outletId?: string
    activeOutletName?: string
}

import { motion, AnimatePresence } from 'framer-motion'

export default function StudioAgenda({ slots, outletId, activeOutletName }: StudioAgendaProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-zinc-900 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    {outletId ? `Schedule for ${activeOutletName}` : 'Unified Schedule Today'}
                </h2>
            </div>

            <div className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm divide-y divide-zinc-50">
                <AnimatePresence mode="popLayout">
                    {slots.length > 0 ? (
                        slots.map((slot, index) => {
                            const activeBookings = slot.bookings?.filter((b: any) => 
                                ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '')
                            ) || []
                            const attendeeCount = activeBookings.reduce((sum: number, b: any) => sum + (b.quantity || 1), 0)
                            const capacity = slot.pax_capacity || 1

                            // ... existing logic ...

                            const instructorName = (Array.isArray(slot.instructor) 
                                ? slot.instructor[0]?.full_name 
                                : slot.instructor?.full_name) || 'No Instructor'

                            const outletName = slot.outlet?.name || 'Main Studio'

                            return (
                                <motion.div 
                                    key={slot.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    whileHover={{ x: 4 }}
                                    transition={{ 
                                        type: "spring", 
                                        damping: 25, 
                                        stiffness: 200, 
                                        delay: index * 0.05 
                                    }}
                                    className="px-8 py-8 flex items-center justify-between group hover:bg-zinc-50/80 transition-all cursor-pointer relative"
                                >
                                    <div className="flex items-start gap-10 flex-1">
                                        {/* Time Section */}
                                        <div className="min-w-[80px] pt-1 space-y-1">
                                            <p className="text-lg font-black text-zinc-900 tracking-tightest leading-none">
                                                {slot.start_time?.slice(0, 5) ?? '--:--'}
                                            </p>
                                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                                                {slot.end_time?.slice(0, 5) ?? '--:--'}
                                            </p>
                                        </div>
                                        
                                        {/* Dynamic Indicator Bar */}
                                        <div className={clsx(
                                            "w-1.5 self-stretch rounded-full transition-all duration-500 group-hover:w-2",
                                            attendeeCount >= capacity ? "bg-rose-500" : "bg-zinc-100 group-hover:bg-indigo-600"
                                        )} />

                                        {/* Details Section */}
                                        <div className="flex-1 py-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-lg font-black text-zinc-900 group-hover:text-indigo-600 transition-colors tracking-tightest leading-none">
                                                    {slot.session_type}
                                                </h4>
                                                {!slot.is_published && (
                                                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-400 text-[8px] font-black uppercase tracking-widest border border-zinc-200">
                                                        Private
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                                <div className="flex items-center gap-2 text-zinc-400">
                                                    <div className="w-5 h-5 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100">
                                                        <MapPin className="w-3 h-3 opacity-60" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{outletName}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-zinc-400">
                                                    <div className="w-5 h-5 rounded-lg bg-zinc-50 flex items-center justify-center border border-zinc-100">
                                                        <UserIcon className="w-3 h-3 opacity-60" />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{instructorName}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Capacity Gauge */}
                                    <div className="flex items-center gap-6">
                                        <div className="flex flex-col items-end gap-1.5">
                                            <div className={clsx(
                                                "px-4 py-2 rounded-2xl border font-black tracking-tightest text-sm shadow-sm transition-all group-hover:shadow-md",
                                                attendeeCount >= capacity 
                                                    ? "bg-rose-50 border-rose-100 text-rose-600" 
                                                    : attendeeCount > 0 
                                                        ? "bg-indigo-50 border-indigo-100 text-indigo-600"
                                                        : "bg-emerald-50 border-emerald-100 text-emerald-600"
                                            )}>
                                                {attendeeCount} / {capacity}
                                            </div>
                                            <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min((attendeeCount / capacity) * 100, 100)}%` }}
                                                    className={clsx(
                                                        "h-full transition-all duration-1000",
                                                        attendeeCount >= capacity ? "bg-rose-500" : "bg-indigo-600"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-zinc-200 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">
                                            <ChevronRight className="w-6 h-6" />
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-24 text-center flex flex-col items-center justify-center space-y-6"
                        >
                            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center shadow-inner">
                                <Calendar className="w-10 h-10 text-zinc-200" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-[0.3em]">No classes scheduled</h3>
                                <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest">
                                    Everything looks clear for {outletId ? 'this branch' : 'today'}.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
