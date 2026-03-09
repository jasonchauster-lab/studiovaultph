'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import ChatWindow from './ChatWindow'
import MessageCountBadge from './MessageCountBadge'

interface DashboardChatButtonProps {
    bookingId: string
    currentUserId: string
    partnerId: string
    partnerName: string
    label: string
    variant?: 'default' | 'antigravity' | 'antigravity-gold'
}

export default function StudioChatButton({ bookingId, currentUserId, partnerId, partnerName, label, variant = 'default' }: DashboardChatButtonProps) {
    const [isOpen, setIsOpen] = useState(false)

    const getStyles = () => {
        if (variant === 'antigravity') {
            return "w-10 h-10 bg-white/40 text-sage border border-white/60 rounded-full hover:bg-sage hover:text-white transition-all duration-500 flex items-center justify-center shadow-sm relative group"
        }
        if (variant === 'antigravity-gold') {
            return "w-10 h-10 bg-white/40 text-gold border border-white/60 rounded-full hover:bg-gold hover:text-white transition-all duration-500 flex items-center justify-center shadow-sm relative group"
        }
        return "p-2 bg-white border border-cream-200 text-charcoal-600 hover:text-charcoal-900 rounded-lg transition-all shadow-sm hover:shadow-md relative group flex items-center justify-center"
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={getStyles()}
                title={label}
            >
                <MessageSquare className={variant.startsWith('antigravity') ? "w-5 h-5 group-hover:scale-110 transition-transform" : "w-4 h-4 group-hover:scale-110 transition-transform"} />
                <MessageCountBadge bookingId={bookingId} currentUserId={currentUserId} partnerId={partnerId} isOpen={isOpen} />
            </button>

            {isOpen && (
                <ChatWindow
                    bookingId={bookingId}
                    currentUserId={currentUserId}
                    recipientId={partnerId}
                    recipientName={partnerName}
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    isExpired={false}
                />
            )}
        </>
    )
}
