'use client'

import { useState, useMemo, memo } from 'react'
import { MoreVertical, Mail, Bell, Trash2, Edit3, Send, Check } from 'lucide-react'
import { NOTIFICATION_CATEGORIES } from '@/lib/studio/notification-events'
import { deleteNotificationRecipient, upsertNotificationRecipient } from '@/app/(dashboard)/studio/management/actions'
import clsx from 'clsx'
import Avatar from '@/components/shared/Avatar'

interface RecipientRowProps {
    recipient: any
    studioId: string
    onEdit: (recipient: any) => void
}

function RecipientRow({ recipient, studioId, onEdit }: RecipientRowProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [isToggling, setIsToggling] = useState(false)

    const handleToggleMaster = async () => {
        setIsToggling(true)
        try {
            await upsertNotificationRecipient(
                studioId, 
                recipient.profile_id, 
                !recipient.is_enabled, 
                recipient.preferences
            )
        } catch (error) {
            console.error(error)
        } finally {
            setIsToggling(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to remove this recipient?')) return
        setIsDeleting(true)
        try {
            await deleteNotificationRecipient(recipient.id)
        } catch (error) {
            console.error(error)
        } finally {
            setIsDeleting(false)
        }
    }

    // Calculate category summaries
    // Example: "onboarding (1), bookings (10), ..."
    const summary = useMemo(() => {
        return NOTIFICATION_CATEGORIES.map(cat => {
            const events = recipient.preferences[cat.id] || {}
            const count = Object.keys(events).length
            if (count === 0) return null
            return `${cat.label.toLowerCase()} (${count})`
        }).filter(Boolean).join(', ')
    }, [recipient.preferences])

    return (
        <div className={clsx(
            "p-6 bg-white border border-zinc-100 rounded-[2rem] flex items-center gap-6 transition-all hover:shadow-tight hover:border-zinc-200 group/row",
            !recipient.is_enabled && "opacity-60 grayscale-[0.5]"
        )}>
            {/* Profile Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative">
                    <Avatar 
                        src={recipient.profile?.avatar_url} 
                        fallbackName={recipient.profile?.full_name} 
                        size="md"
                        className="shadow-tight ring-2 ring-zinc-50"
                    />
                    <div className={clsx(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center",
                        recipient.is_enabled ? "bg-forest" : "bg-zinc-300"
                    )}>
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <h4 className="text-sm font-black text-charcoal uppercase tracking-wider truncate">
                            {recipient.profile?.full_name}
                        </h4>
                        <span className="px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-lg text-[9px] font-black text-zinc-400 uppercase tracking-widest group-hover/row:bg-white transition-colors">
                            {recipient.profile?.role || 'Staff'}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate font-medium mb-2 truncate opacity-60 group-hover/row:opacity-100 transition-opacity">
                        {recipient.profile?.email}
                    </p>
                    <p className="text-[10px] text-slate font-bold uppercase tracking-widest line-clamp-1 italic">
                        {summary || 'No events selected'}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                {/* Channel Indicators */}
                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-off-white rounded-2xl border border-zinc-50 group-hover/row:bg-white transition-colors shrink-0">
                    <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help" title="Email Notifications">
                        <Mail className={clsx("w-3.5 h-3.5", Object.values(recipient.preferences).some((p: any) => Object.values(p).some((c: any) => c.includes('email'))) ? "text-forest" : "text-zinc-400")} />
                    </div>
                    <div className="w-px h-3 bg-zinc-200" />
                    <div className="flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity cursor-help" title="In-App Activity Feed">
                        <Bell className={clsx("w-3.5 h-3.5", Object.values(recipient.preferences).some((p: any) => Object.values(p).some((c: any) => c.includes('in_app'))) ? "text-forest" : "text-zinc-400")} />
                    </div>
                </div>

                {/* Master Toggle */}
                <button 
                    onClick={handleToggleMaster}
                    disabled={isToggling}
                    className={clsx(
                        "relative w-12 h-6 rounded-full transition-all duration-300 shadow-inner",
                        recipient.is_enabled ? "bg-forest" : "bg-zinc-200",
                        isToggling && "opacity-50 pointer-events-none"
                    )}
                >
                    <div className={clsx(
                        "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-tight flex items-center justify-center",
                        recipient.is_enabled && "translate-x-6"
                    )}>
                        {isToggling && <div className="w-2 h-2 border border-zinc-400 border-t-transparent rounded-full animate-spin" />}
                    </div>
                </button>

                {/* row Actions */}
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => onEdit(recipient)}
                        className="p-2.5 text-zinc-400 hover:text-charcoal hover:bg-zinc-50 rounded-xl transition-all active:scale-95"
                        title="Edit Preferences"
                    >
                        <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                        className="p-2.5 text-zinc-400 hover:text-forest hover:bg-forest/5 rounded-xl transition-all active:scale-95"
                        title="Send Test Email"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="p-2.5 text-zinc-400 hover:text-burgundy hover:bg-burgundy/5 rounded-xl transition-all active:scale-95"
                        title="Remove Recipient"
                    >
                        {isDeleting ? <div className="w-4 h-4 border-2 border-burgundy/30 border-t-burgundy rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default memo(RecipientRow)
