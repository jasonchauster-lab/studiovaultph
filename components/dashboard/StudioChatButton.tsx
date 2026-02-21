'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import ChatWindow from './ChatWindow'
import MessageCountBadge from './MessageCountBadge'

export default function StudioChatButton({ booking, currentUserId }: { booking: any, currentUserId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const instructorName = booking.instructor?.full_name || 'Instructor'

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 bg-white border border-cream-200 text-charcoal-600 hover:text-charcoal-900 rounded-lg transition-all shadow-sm hover:shadow-md relative group flex items-center justify-center"
                title="Chat with Instructor"
            >
                <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <MessageCountBadge bookingId={booking.id} currentUserId={currentUserId} isOpen={isOpen} />
            </button>

            {isOpen && (
                <ChatWindow
                    bookingId={booking.id}
                    currentUserId={currentUserId}
                    recipientName={instructorName}
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    isExpired={false}
                />
            )}
        </>
    )
}
