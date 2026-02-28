'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SupportMessage, SupportTicket } from '@/types'
import { createTicket, sendMessage } from '@/app/(dashboard)/support/actions'
import clsx from 'clsx'

export default function SupportChatWidget({ userId }: { userId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [ticket, setTicket] = useState<SupportTicket | null>(null)
    const [messages, setMessages] = useState<SupportMessage[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const [unreadCount, setUnreadCount] = useState(0)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isOpen])

    // Fetch initial unread count
    useEffect(() => {
        const fetchUnreadCount = async () => {
            if (!userId) return;
            const { count } = await supabase
                .from('support_messages')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', false)
                .neq('sender_id', userId)

            if (count !== null) setUnreadCount(count)
        }

        fetchUnreadCount()
    }, [userId, supabase])

    // 1. Fetch/Find active ticket when opening
    useEffect(() => {
        if (!isOpen || ticket) return

        async function findTicket() {
            setIsLoading(true)
            const { data: activeTicket } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'open')
                .maybeSingle()

            if (activeTicket) {
                setTicket(activeTicket)
            }
            setIsLoading(false)
        }

        findTicket()
    }, [isOpen, userId, ticket, supabase])

    // 2. Sync messages and setup realtime when ticket exists
    useEffect(() => {
        if (!ticket?.id) return
        const ticketId = ticket.id

        async function syncMessages() {
            // Load messages
            const { data: msgs } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true })

            if (msgs) setMessages(msgs)

            // Mark as read
            import('@/app/(dashboard)/support/actions').then(m => m.markMessagesAsRead(ticketId))
            setUnreadCount(0)
        }

        syncMessages()

        // Realtime subscription
        const channel = supabase
            .channel(`ticket-${ticketId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `ticket_id=eq.${ticketId}`
                },
                (payload) => {
                    const newMsg = payload.new as SupportMessage
                    setMessages((prev) => {
                        // Avoid duplicates if already added optimistically
                        if (prev.find(m => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })

                    if (newMsg.sender_id !== userId) {
                        import('@/app/(dashboard)/support/actions').then(m => m.markMessagesAsRead(ticketId))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [ticket?.id, userId, supabase])

    const handleSend = async () => {
        if (!inputValue.trim()) return
        const text = inputValue.trim()
        setIsSending(true)
        setInputValue('') // Clear immediately for snappy UX

        // Optimistic message so it appears instantly
        const optimisticMsg: SupportMessage = {
            id: `optimistic-${Date.now()}`,
            ticket_id: ticket?.id || '',
            sender_id: userId,
            message: text,
            created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, optimisticMsg])

        try {
            if (!ticket) {
                // Create a new ticket + first message
                const result = await createTicket(text)
                if (result.error) {
                    console.error(result.error)
                    alert(`Error: ${result.error}`)
                    setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
                    setInputValue(text)
                    return
                }
                if (result.ticketId) {
                    // Fetch the new ticket so we can start sending subsequent messages
                    const { data: newTicket } = await supabase
                        .from('support_tickets')
                        .select('*')
                        .eq('id', result.ticketId)
                        .single()
                    if (newTicket) setTicket(newTicket)

                    // Replace the optimistic message with the real one from DB
                    const { data: msgs } = await supabase
                        .from('support_messages')
                        .select('*')
                        .eq('ticket_id', result.ticketId)
                        .order('created_at', { ascending: true })
                    if (msgs) setMessages(msgs)
                }
            } else {
                // Send message to existing ticket
                const result = await sendMessage(ticket.id, text)
                if (result.error) {
                    console.error(result.error)
                    alert(`Error: ${result.error}`)
                    setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
                    setInputValue(text)
                }
                // Realtime will replace the optimistic msg; if realtime is slow the
                // optimistic one is already visible so UX is fine either way.
            }
        } catch (error) {
            console.error(error)
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
            setInputValue(text)
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 h-[500px] bg-white rounded-2xl shadow-xl border border-cream-200 flex flex-col pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300">
                    {/* Header */}
                    <div className="bg-charcoal-900 p-4 flex justify-between items-center">
                        <div>
                            <h3 className="text-cream-50 font-medium">Support Chat</h3>
                            <p className="text-xs text-charcoal-300">We usually reply within a few hours.</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-charcoal-300 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-cream-50 space-y-4">
                        {isLoading ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-6 h-6 text-charcoal-400 animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="text-center text-charcoal-400 text-sm mt-10">
                                <p>How can we help you today?</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.sender_id === userId
                                return (
                                    <div key={msg.id} className={clsx("flex", isMe ? "justify-end" : "justify-start")}>
                                        <div className={clsx(
                                            "max-w-[80%] p-3 rounded-2xl text-sm",
                                            isMe ? "bg-charcoal-900 text-cream-50 rounded-br-none" : "bg-white border border-cream-200 text-charcoal-800 rounded-bl-none shadow-sm"
                                        )}>
                                            {msg.message}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-cream-200">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleSend()
                            }}
                            className="flex gap-2"
                        >
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 bg-cream-50 border border-cream-300 rounded-full text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900 text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isSending}
                                className="w-10 h-10 bg-charcoal-900 text-cream-50 rounded-full flex items-center justify-center hover:bg-charcoal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-rose-gold text-white rounded-full shadow-lg hover:brightness-110 transition-all hover:scale-105 active:scale-95 flex items-center justify-center pointer-events-auto relative"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white animate-pulse shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    )
}
