'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { Send, X, Clock } from 'lucide-react'
import UserPresenceIndicator from '@/components/shared/UserPresenceIndicator'

interface Message {
    id: string
    booking_id: string
    sender_id: string
    recipient_id?: string | null
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
                .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${currentUserId}),recipient_id.is.null`)
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
                (payload: { new: unknown }) => {
                    const newMsg = payload.new as Message

                    // Filter realtime messages meant for this specific 1-on-1 chat
                    const isForThisChat =
                        (newMsg.sender_id === currentUserId && newMsg.recipient_id === recipientId) ||
                        (newMsg.sender_id === recipientId && newMsg.recipient_id === currentUserId) ||
                        (newMsg.recipient_id === null)

                    if (!isForThisChat) return

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
            recipient_id: recipientId,
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
                recipient_id: recipientId,
                content: text
            })

        if (error) {
            console.error('Error sending message:', error)
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
            setNewMessage(text)
            alert('Failed to send message.')
        }
    }

    // Update presence when opened
    useEffect(() => {
        if (isOpen && currentUserId && recipientId) {
            supabase.rpc('update_chat_presence', {
                p_booking_id: bookingId,
                p_partner_id: recipientId
            }).then(({ error }: { error: unknown }) => {
                if (error) console.error('Failed to update presence:', error)
            })
        }
    }, [isOpen, bookingId, currentUserId, recipientId, supabase])

    if (!isOpen) return null

    const modal = (
        <div className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[650px] border border-white/20 animate-in zoom-in-95 duration-500">
                {/* Header */}
                <div className="bg-burgundy text-white p-6 flex justify-between items-center shrink-0">
                    <div className="min-w-0">
                        <h3 className="font-serif font-black text-xl !text-white leading-none mb-1.5 truncate">Chat with {recipientName}</h3>
                        {!isExpired && <UserPresenceIndicator userId={recipientId} className="mt-1 opacity-80" textColor="!text-white/80" />}
                        {isExpired && (
                            <p className="text-[10px] text-white/50 flex items-center gap-1.5 font-bold uppercase tracking-widest">
                                <Clock className="w-3 h-3" /> Session Terminated
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-white/40 hover:text-white transition-all hover:scale-110">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-surface-container-low/30 space-y-4">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-burgundy/40 text-[10px] font-black uppercase tracking-widest gap-4">
                            <div className="w-10 h-10 rounded-full border-4 border-burgundy/10 border-t-burgundy animate-spin" />
                            Synchronising Nodes...
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-10 gap-4">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-tight border border-burgundy/5">
                                <Send className="w-6 h-6 text-burgundy/20" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-burgundy uppercase tracking-widest mb-1.5">No transmission history</h4>
                                <p className="text-[11px] text-burgundy/40 font-bold uppercase tracking-[0.1em] leading-relaxed">Initiate a secure channel with {recipientName} to discuss protocol.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {messages.map((msg) => {
                                const isMe = msg.sender_id === currentUserId
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                                        <div className="flex flex-col gap-1.5 max-w-[85%]">
                                            <div
                                                className={`px-5 py-3.5 rounded-[1.5rem] text-[13px] leading-relaxed shadow-tight border ${isMe
                                                    ? 'bg-burgundy text-white border-burgundy/5 rounded-tr-none'
                                                    : 'bg-white border-burgundy/5 text-charcoal rounded-tl-none'
                                                    }`}
                                            >
                                                <p className="font-medium">{msg.content}</p>
                                            </div>
                                            <p className={`text-[9px] font-black uppercase tracking-widest px-2 ${isMe ? 'text-right text-burgundy/30' : 'text-left text-burgundy/30'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
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
                <div className="p-6 bg-white border-t border-burgundy/5 relative group">
                    {isExpired ? (
                        <div className="text-center text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em] bg-surface-container-low/50 p-4 rounded-2xl border border-dashed border-burgundy/10">
                            Channel Terminated due to inactivity.
                        </div>
                    ) : (
                        <form onSubmit={sendMessage} className="flex gap-3 relative z-10">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-5 py-3.5 bg-surface-container-low/50 border border-burgundy/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-burgundy/10 focus:bg-white text-sm text-charcoal placeholder-burgundy/20 font-medium transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="bg-forest text-white w-12 h-12 rounded-2xl hover:brightness-110 disabled:opacity-30 disabled:grayscale transition-all shadow-tight flex items-center justify-center active:scale-95 shrink-0 group-hover:shadow-ambient"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div >
    )


    return createPortal(modal, document.body)
}
