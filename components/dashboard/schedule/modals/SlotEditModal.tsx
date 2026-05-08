import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, User, Clock, AlertCircle } from 'lucide-react'
import clsx from 'clsx'
import Avatar from '@/components/shared/Avatar'

interface SlotEditModalProps {
    isOpen: boolean
    onClose: () => void
    slot: any
    instructors: any[]
    services: any[]
    availableEquipment: string[]
    marketplaceStatus: string
    isSubmitting: boolean
    onUpdate: (formData: FormData) => void
    onDelete: () => void
    onCancelBooking: (id: string) => void
    onApproveBooking: (id: string) => void
}

export const SlotEditModal = ({
    isOpen, onClose, slot, instructors, services, 
    availableEquipment, marketplaceStatus, isSubmitting,
    onUpdate, onDelete, onCancelBooking, onApproveBooking
}: SlotEditModalProps) => {
    if (!isOpen || !slot) return null

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
                className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-10 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/30">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-primary rounded-full" />
                            <h3 className="text-3xl font-black text-zinc-900 tracking-tightest">Edit Session Slot</h3>
                        </div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Session Intelligence & Logistics</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white hover:bg-zinc-900 hover:text-white text-zinc-400 transition-all border border-zinc-100 rotate-45"
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                    <form action={onUpdate} className="space-y-12">
                        <input type="hidden" name="date" value={slot.date} />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Left Column: Basic Info */}
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-primary" /> START TIME
                                    </label>
                                    <input 
                                        type="time" 
                                        name="startTime"
                                        defaultValue={slot.start_time.slice(0, 5)}
                                        className="w-full h-16 px-6 bg-zinc-50 rounded-2xl border border-zinc-100 text-sm font-black focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-inner"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-primary" /> END TIME
                                    </label>
                                    <input 
                                        type="time" 
                                        name="endTime"
                                        defaultValue={slot.end_time.slice(0, 5)}
                                        className="w-full h-16 px-6 bg-zinc-50 rounded-2xl border border-zinc-100 text-sm font-black focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-inner"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-primary" /> INSTRUCTOR
                                    </label>
                                    <select 
                                        name="instructorId"
                                        defaultValue={slot.instructor_id || ''}
                                        className="w-full h-16 px-6 bg-zinc-50 rounded-2xl border border-zinc-100 text-sm font-black focus:ring-4 focus:ring-primary/10 outline-none transition-all appearance-none shadow-inner"
                                    >
                                        <option value="">Unassigned</option>
                                        {instructors.map(inst => (
                                            <option key={inst.id} value={inst.id}>{inst.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Right Column: Capacity & Equipment */}
                            <div className="space-y-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate uppercase tracking-widest">Service Type</label>
                                    <select 
                                        name="serviceId"
                                        defaultValue={slot.service_id || ''}
                                        className="w-full h-16 px-6 bg-off-white rounded-2xl border border-border-grey text-sm font-black focus:ring-4 focus:ring-forest/10 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select Service...</option>
                                        {services.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate uppercase tracking-widest">PAX Capacity</label>
                                        <input 
                                            type="number" 
                                            name="paxCapacity"
                                            defaultValue={slot.pax_capacity || 1}
                                            className="w-full h-16 px-6 bg-off-white rounded-2xl border border-border-grey text-sm font-black outline-none"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate uppercase tracking-widest">Waitlist Cap</label>
                                        <input 
                                            type="number" 
                                            name="waitlistPaxCapacity"
                                            defaultValue={slot.waitlist_pax_capacity || 0}
                                            className="w-full h-16 px-6 bg-off-white rounded-2xl border border-border-grey text-sm font-black outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Equipment Logic */}
                                <div className="space-y-6">
                                    <label className="text-[10px] font-black text-slate uppercase tracking-widest">Equipment Available</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {availableEquipment.map(eq => {
                                            const eqKey = eq.toUpperCase()
                                            const isSelected = slot.equipment && slot.equipment[eqKey] > 0
                                            const qty = slot.equipment ? slot.equipment[eqKey] : 0
                                            
                                            return (
                                                <div key={eq} className="flex items-center gap-4 bg-off-white p-4 rounded-2xl border border-border-grey">
                                                    <input 
                                                        type="checkbox" 
                                                        name={`eq_${eq.toLowerCase()}`}
                                                        defaultChecked={isSelected}
                                                        className="w-6 h-6 rounded-lg text-forest focus:ring-forest border-border-grey"
                                                    />
                                                    <span className="flex-1 text-[11px] font-black uppercase text-charcoal">{eq}</span>
                                                    <input 
                                                        type="number" 
                                                        name={`qty_${eq.toLowerCase()}`}
                                                        defaultValue={qty}
                                                        placeholder="Qty"
                                                        className="w-20 h-10 px-3 bg-white rounded-xl border border-border-grey text-[11px] font-black"
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Booking History / Management */}
                        {slot.bookings && slot.bookings.length > 0 && (
                            <div className="space-y-8 pt-8 border-t border-zinc-100">
                                <h4 className="text-xl font-black text-zinc-900 tracking-tightest">Current Bookings</h4>
                                <div className="space-y-4">
                                    {slot.bookings.map((b: any) => (
                                        <div key={b.id} className="flex items-center justify-between p-6 bg-zinc-50 rounded-[2rem] border border-zinc-100 group">
                                            <div className="flex items-center gap-6">
                                                <Avatar 
                                                    src={b.client?.avatar_url} 
                                                    fallbackName={b.client?.full_name || 'CL'} 
                                                    className="w-12 h-12 rounded-2xl shadow-tight"
                                                />
                                                <div>
                                                    <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{b.client?.full_name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className={clsx(
                                                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                                            b.status === 'approved' ? "bg-primary/10 border-primary/20 text-primary" : 
                                                            b.status === 'pending' ? "bg-amber-100 border-amber-200 text-amber-700" :
                                                            "bg-zinc-200 border-zinc-300 text-zinc-500"
                                                        )}>
                                                            {b.status}
                                                        </span>
                                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                                            {b.equipment || 'No Eq'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                                                {b.status === 'pending' && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => onApproveBooking(b.id)}
                                                        className="px-4 py-2 bg-forest text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110"
                                                    >
                                                        Approve
                                                    </button>
                                                )}
                                                <button 
                                                    type="button"
                                                    onClick={() => onCancelBooking(b.id)}
                                                    className="px-4 py-2 bg-white text-rose-500 border border-rose-100 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-50"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="pt-12 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-8">
                            <button 
                                type="button"
                                onClick={onDelete}
                                className="flex items-center gap-3 text-rose-500 hover:text-rose-700 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Delete Slot</span>
                            </button>

                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <button 
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 sm:px-10 h-16 rounded-2xl text-[11px] font-black text-zinc-400 uppercase tracking-widest hover:bg-zinc-50 transition-all border border-zinc-100"
                                >
                                    Discard Changes
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 sm:px-12 h-16 bg-zinc-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-zinc-900/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Syncing...' : 'Update Session'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    )
}
