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
    const [supabase] = useState(() => createClient())

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
                        const exists = prev.find(m => m.id === newMsg.id)
                        if (exists) {
                            return prev.map(m => m.id === newMsg.id ? newMsg : m)
                        }
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
        const tempId = window.crypto?.randomUUID ? window.crypto.randomUUID() : `temp-${Date.now()}`
        const optimisticMsg: SupportMessage = {
            id: tempId,
            ticket_id: ticket?.id || '',
            sender_id: userId,
            message: text,
            created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, optimisticMsg])

        try {
            if (!ticket) {
                // Create a new ticket + first message
                const result = await createTicket(text, optimisticMsg.id)
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

                    // No need to fetch all messages again, realtime will update the optimistic one
                }
            } else {
                // Send message to existing ticket
                const result = await sendMessage(ticket.id, text, optimisticMsg.id)
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
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end pointer-events-none">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-6 w-80 sm:w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-border-grey flex flex-col pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300">
                    {/* Header */}
                    <div className="bg-charcoal p-6 flex justify-between items-center border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-forest rounded-lg flex items-center justify-center shadow-tight">
                                <MessageCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white text-sm font-bold uppercase tracking-widest">Support Team</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" />
                                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-[0.1em]">Online • Ask us any questions you have</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            aria-label="Close Support Portal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 bg-off-white space-y-6">
                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="w-8 h-8 text-forest/20 animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="text-center py-10 space-y-3">
                                <p className="text-charcoal font-serif italic text-lg opacity-40">&ldquo;How can we assist your practice today?&rdquo;</p>
                                <div className="w-8 h-1 bg-forest/20 mx-auto rounded-full" />
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.sender_id === userId
                                return (
                                    <div key={msg.id} className={clsx("flex", isMe ? "justify-end" : "justify-start")}>
                                        <div className={clsx(
                                            "max-w-[85%] px-5 py-3 rounded-lg text-[13px] font-medium leading-relaxed shadow-tight",
                                            isMe
                                                ? "bg-forest text-white rounded-br-none"
                                                : "bg-white border border-border-grey text-charcoal rounded-bl-none"
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
                    <div className="p-4 bg-white border-t border-border-grey">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                handleSend()
                            }}
                            className="flex gap-3"
                        >
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Concise message..."
                                aria-label="Support Message"
                                className="flex-1 px-5 py-3 bg-off-white border border-border-grey rounded-lg text-charcoal focus:outline-none focus:ring-1 focus:ring-forest text-[13px] font-medium placeholder:text-slate/30 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isSending}
                                aria-label="Send Message"
                                className="w-12 h-12 bg-charcoal text-white rounded-lg flex items-center justify-center hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-tight"
                            >
                                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? "Close Support Chat" : "Open Support Chat"}
                aria-expanded={isOpen}
                aria-haspopup="true"
                className="w-16 h-16 bg-forest text-white rounded-lg shadow-card hover:brightness-110 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center pointer-events-auto relative border border-white/10"
            >
                {isOpen ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-lg bg-charcoal border-2 border-white text-[10px] font-bold text-white shadow-tight">
                        <span className="sr-only">New messages: </span>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    )
}
