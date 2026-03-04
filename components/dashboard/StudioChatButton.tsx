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
}

export default function StudioChatButton({ bookingId, currentUserId, partnerId, partnerName, label }: DashboardChatButtonProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 bg-white border border-cream-200 text-charcoal-600 hover:text-charcoal-900 rounded-lg transition-all shadow-sm hover:shadow-md relative group flex items-center justify-center"
                title={label}
            >
                <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
