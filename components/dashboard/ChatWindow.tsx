'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, X, Clock } from 'lucide-react'
import UserPresenceIndicator from '@/components/shared/UserPresenceIndicator'

interface Message {
    id: string
    booking_id: string
    sender_id: string
    content: string
    created_at: string
}

interface ChatWindowProps {
    bookingId: string
    currentUserId: string
    recipientId: string
    recipientName: string
    isOpen: boolean
    onClose: () => void
    isExpired: boolean
}

export default function ChatWindow({ bookingId, currentUserId, recipientId, recipientName, isOpen, onClose, isExpired }: ChatWindowProps) {
    const supabase = createClient()
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // Sync localStorage when messages update and chat is open
    useEffect(() => {
        if (isOpen && messages.length > 0) {
            localStorage.setItem(`last_seen_msg_count_${bookingId}`, messages.length.toString())
        }
    }, [isOpen, messages.length, bookingId])

    useEffect(() => {
        if (!isOpen) return

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('booking_id', bookingId)
                .order('created_at', { ascending: true })

            if (data) setMessages(data)
            setLoading(false)
            setTimeout(scrollToBottom, 100)
        }

        fetchMessages()

        const channel = supabase
            .channel(`booking-chat-${bookingId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `booking_id=eq.${bookingId}`
                },
                (payload) => {
                    const newMsg = payload.new as Message
                    setMessages((prev) => {
                        if (prev.find(m => m.id === newMsg.id)) return prev
                        // Remove optimistic message if it match the new one
                        const filtered = prev.filter(m => !(m.id.startsWith('temp-') && m.content === newMsg.content && m.sender_id === newMsg.sender_id))
                        return [...filtered, newMsg]
                    })
                    setTimeout(scrollToBottom, 50)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [bookingId, isOpen, supabase])

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || isExpired) return

        const text = newMessage.trim()
        setNewMessage('')

        // Optimistic update
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            booking_id: bookingId,
            sender_id: currentUserId,
            content: text,
            created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, optimisticMsg])
        setTimeout(scrollToBottom, 50)

        const { error } = await supabase
            .from('messages')
            .insert({
                booking_id: bookingId,
                sender_id: currentUserId,
                content: text
            })

        if (error) {
            console.error('Error sending message:', error)
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
            setNewMessage(text)
            alert('Failed to send message.')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col h-[600px]">
                {/* Header */}
                <div className="bg-charcoal-900 text-white p-4 flex justify-between items-center shrink-0">
                    <div>
                        <h3 className="font-serif font-bold text-lg">Chat with {recipientName}</h3>
                        {!isExpired && <UserPresenceIndicator userId={recipientId} className="mt-1" />}
                        {isExpired && (
                            <p className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" /> Session Expired
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-cream-50">
                    {loading ? (
                        <div className="text-center text-gray-500 text-sm py-4">Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-8">
                            No messages yet. Start the conversation!
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === currentUserId
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[75%] px-4 py-2 rounded-lg text-sm ${isMe
                                                ? 'bg-charcoal-800 text-white rounded-tr-none'
                                                : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none shadow-sm'
                                                }`}
                                        >
                                            <p>{msg.content}</p>
                                            <p className={`text-[10px] mt-1 ${isMe ? 'text-gray-300' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    {isExpired ? (
                        <div className="text-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            This chat session has expired (12 hours passed).
                        </div>
                    ) : (
                        <form onSubmit={sendMessage} className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 border border-charcoal-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-charcoal-900 text-gray-900 placeholder-gray-500 bg-white"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-rose-gold text-white p-2 rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 flex items-center justify-center"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div >
    )
}
