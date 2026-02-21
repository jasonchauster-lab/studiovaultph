'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import ChatWindow from './ChatWindow'
import MessageCountBadge from './MessageCountBadge'

export default function StudioChatButton({ booking, currentUserId }: { booking: any, currentUserId: string }) {
    const [isOpen, setIsOpen] = useState(false)

    // Determine the recipient name based on roles
    const getRecipientInfo = () => {
        const slot = Array.isArray(booking.slots) ? booking.slots[0] : booking.slots
        const studio = slot?.studios
        const instructor = booking.instructor || booking.instructor_id_profile // Handle different join names
        const client = booking.client || booking.client_id_profile

        // Case 1: I am the Studio Owner -> Chatting with Instructor
        if (studio?.owner_id === currentUserId) {
            return { name: instructor?.full_name || 'Instructor', title: 'Chat with Instructor' }
        }

        // Case 2: I am the Instructor renting the studio (client_id == instructor_id) -> Chatting with Studio
        if (booking.instructor_id === currentUserId && booking.client_id === currentUserId) {
            return { name: studio?.name || 'Studio', title: 'Chat with Studio' }
        }

        // Case 3: I am the Instructor teaching a client (client_id != instructor_id) -> Chatting with Client
        if (booking.instructor_id === currentUserId && booking.client_id !== currentUserId) {
            return { name: client?.full_name || 'Client', title: 'Chat with Client' }
        }

        // Case 4: I am the Customer -> Chatting with Instructor
        if (booking.client_id === currentUserId) {
            return { name: instructor?.full_name || 'Instructor', title: 'Chat with Instructor' }
        }

        return { name: 'Chat', title: 'Open Chat' }
    }

    const { name: recipientName, title } = getRecipientInfo()

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 bg-white border border-cream-200 text-charcoal-600 hover:text-charcoal-900 rounded-lg transition-all shadow-sm hover:shadow-md relative group flex items-center justify-center"
                title={title}
            >
                <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <MessageCountBadge bookingId={booking.id} currentUserId={currentUserId} isOpen={isOpen} />
            </button>

            {isOpen && (
                <ChatWindow
                    bookingId={booking.id}
                    currentUserId={currentUserId}
                    recipientName={recipientName}
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    isExpired={false}
                />
            )}
        </>
    )
}
