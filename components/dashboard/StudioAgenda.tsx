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
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ 
                                        type: "spring", 
                                        damping: 25, 
                                        stiffness: 200, 
                                        delay: index * 0.05 
                                    }}
                                    className="px-8 py-7 flex items-center justify-between group hover:bg-zinc-50/50 transition-all cursor-pointer"
                                >
                                    <div className="flex items-start gap-8 flex-1">
                                        {/* Time Section */}
                                        <div className="min-w-[80px] pt-1">
                                            <p className="text-base font-black text-zinc-900 tracking-tight">{slot.start_time.slice(0, 5)}</p>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">DURATION</p>
                                        </div>
                                        
                                        {/* Vertical Bar */}
                                        <div className="w-1.5 self-stretch rounded-full bg-zinc-100 group-hover:bg-indigo-600 transition-colors" />

                                        {/* Details Section */}
                                        <div className="flex-1 py-1">
                                            <h4 className="text-base font-black text-zinc-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                {slot.session_type}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <MapPin className="w-3.5 h-3.5 opacity-60" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">{outletName}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <UserIcon className="w-3.5 h-3.5 opacity-60" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">{instructorName}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ratio Section */}
                                        <div className={clsx(
                                            "min-w-[60px] h-10 flex items-center justify-center rounded-xl border font-black tracking-tighter text-sm",
                                            attendeeCount >= capacity ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                                        )}>
                                            {attendeeCount}/{capacity}
                                        </div>
                                    </div>
                                    <div className="ml-6 text-zinc-200 group-hover:text-indigo-600 transition-colors">
                                        <ChevronRight className="w-6 h-6" />
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
