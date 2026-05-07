import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Edit2, Users, MapPin, Clock } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'

interface BookingDetailModalProps {
    isOpen: boolean
    onClose: () => void
    slots: any[]
    time: { date: Date, hour: number } | null
    onEditSlot: (slot: any) => void
    outlets: any[]
}

export const BookingDetailModal = ({
    isOpen, onClose, slots, time, onEditSlot, outlets
}: BookingDetailModalProps) => {
    if (!isOpen || !time) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md" 
                onClick={onClose} 
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden"
            >
                <div className="p-12 space-y-10">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-3xl font-black text-zinc-900 tracking-tightest">
                                {format(time.date, 'EEEE, MMM d')}
                            </h3>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                                    {time.hour.toString().padStart(2, '0')}:00 Time Bucket
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-100" />
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
                                    {slots.length} Active Sessions
                                </span>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-400 transition-all rotate-45 border border-zinc-100"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {slots.map((slot: any) => {
                            const bookingsCount = slot.bookings?.filter((b: any) => 
                                ['approved', 'pending', 'completed'].includes(b.status?.toLowerCase() || '')
                            ).length || 0;
                            
                            return (
                                <div 
                                    key={slot.id} 
                                    className="group p-8 bg-zinc-50 hover:bg-white rounded-[2.5rem] border border-zinc-100 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer flex items-center justify-between"
                                    onClick={() => onEditSlot(slot)}
                                >
                                    <div className="flex items-center gap-8">
                                        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                            <Users className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-zinc-900 tracking-tightest group-hover:text-primary transition-colors">
                                                {slot.display_name || slot.session_type || 'Studio Session'}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-1">
                                                <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                    <MapPin className="w-3 h-3" />
                                                    {outlets.find(o => o.id === slot.outlet_id)?.name || 'Studio'}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                                    <Users className="w-3 h-3" />
                                                    {bookingsCount}/{slot.pax_capacity} Booked
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center group-hover:bg-zinc-900 group-hover:text-white group-hover:border-zinc-900 transition-all shadow-sm">
                                        <Edit2 className="w-4 h-4" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full py-6 bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-400 transition-all rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] border border-zinc-100"
                    >
                        Close Bucket View
                    </button>
                </div>
            </motion.div>
        </div>
    )
}
