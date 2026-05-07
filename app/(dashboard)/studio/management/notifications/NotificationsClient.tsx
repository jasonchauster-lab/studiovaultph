'use client'

import { useState, useCallback } from 'react'
import { Plus, Bell, Mail, ChevronDown, ChevronUp, Users, Info } from 'lucide-react'
import { NOTIFICATION_CATEGORIES } from '@/lib/studio/notification-events'
import AddRecipientModal from '@/components/management/notifications/AddRecipientModal'
import RecipientRow from '@/components/management/notifications/RecipientRow'
import clsx from 'clsx'

interface NotificationsClientProps {
    studioId: string
    initialRecipients: any[]
    allStaff: any[]
}

export default function NotificationsClient({ studioId, initialRecipients, allStaff }: NotificationsClientProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingRecipient, setEditingRecipient] = useState<any>(null)

    const openAddModal = useCallback(() => {
        setEditingRecipient(null)
        setIsAddModalOpen(true)
    }, [])

    const openEditModal = useCallback((recipient: any) => {
        setEditingRecipient(recipient)
        setIsAddModalOpen(true)
    }, [])

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate uppercase tracking-widest mb-4">
                        <span>Settings</span>
                        <span className="text-zinc-300">/</span>
                        <span>Notification</span>
                        <span className="text-zinc-300">/</span>
                        <span className="text-charcoal font-black">Staff notifications</span>
                    </div>
                    <h1 className="text-4xl font-black text-charcoal uppercase tracking-tighter mb-2">
                        Staff notification
                    </h1>
                    <p className="text-sm text-slate font-medium">Notify staff members about new events.</p>
                </div>
            </div>



            {/* Recipients Section */}
            <div className="space-y-6">
                <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 md:p-12 shadow-tight relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-off-white rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50 pointer-events-none" />
                    
                    <div className="relative z-10 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black text-charcoal uppercase tracking-tight mb-2">Recipients</h2>
                            <p className="text-sm text-slate font-medium opacity-60">
                                All staff members listed below will receive notifications for the relevant events based on their enabled settings.
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 px-4 py-2 bg-off-white rounded-xl border border-zinc-100">
                                <Users className="w-4 h-4 text-forest" />
                                <span className="text-xs font-black text-charcoal uppercase tracking-widest">{initialRecipients.length} staff</span>
                            </div>
                            <button 
                                onClick={openAddModal}
                                className="group flex items-center gap-3 px-6 py-3 bg-forest text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-forest-dark transition-all active:scale-95 shadow-lg shadow-forest/20"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                Add Recipient
                            </button>
                        </div>

                        <div className="space-y-4">
                            {initialRecipients.length > 0 ? (
                                initialRecipients.map(recipient => (
                                    <RecipientRow 
                                        key={recipient.id}
                                        recipient={recipient}
                                        studioId={studioId}
                                        onEdit={openEditModal}
                                    />
                                ))
                            ) : (
                                <div className="p-16 text-center border-2 border-dashed border-zinc-100 rounded-[2rem] bg-off-white/30">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-tight drop-shadow-sm">
                                        <Mail className="w-8 h-8 text-zinc-300" />
                                    </div>
                                    <h3 className="text-sm font-black text-charcoal uppercase tracking-widest mb-1">No recipients yet</h3>
                                    <p className="text-xs text-slate font-medium uppercase tracking-widest opacity-40 italic">Add your first staff recipient to start notifying them</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Helpful Tip */}
                <div className="p-6 bg-charcoal rounded-[2rem] text-white flex items-center gap-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-110 transition-transform duration-1000" />
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 shadow-lg ring-1 ring-white/10">
                        <Info className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest mb-1 italic text-forest-light">Pro Tip: Multi-Channel Delivery</h4>
                        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider leading-relaxed">
                            You can enable both email and in-app alerts per staff member. Emails are great for records, while in-app alerts provide real-time updates while working in the dashboard.
                        </p>
                    </div>
                </div>
            </div>

            <AddRecipientModal 
                studioId={studioId}
                allStaff={allStaff}
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                editingRecipient={editingRecipient}
            />
        </div>
    )
}
