'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SupportTicket, SupportMessage } from '@/types'
import { sendMessage, resolveTicket, markMessagesAsRead } from '@/app/(dashboard)/support/actions'
import { MessageCircle, CheckCircle, Send, User, Loader2, X } from 'lucide-react'
import clsx from 'clsx'

export default function SupportDashboardClient() {
    const [tickets, setTickets] = useState<SupportTicket[]>([])
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
    const [messages, setMessages] = useState<SupportMessage[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isLoadingText, setIsLoadingText] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // 1. Fetch initial tickets
    useEffect(() => {
        const fetchTickets = async () => {
            const { data, error } = await supabase
                .from('support_tickets')
                .select(`
                    *,
                    profiles (
                        full_name,
                        role
                    )
                `)
                .eq('status', 'open')
                .order('updated_at', { ascending: false })

            if (data) {
                const ticketsData = data as unknown as SupportTicket[]

                // Fetch studios for these users
                const userIds = ticketsData.map(t => t.user_id)
                if (userIds.length > 0) {
                    const { data: studios } = await supabase
                        .from('studios')
                        .select('owner_id, name')
                        .in('owner_id', userIds)

                    if (studios) {
                        // Merge studio data
                        ticketsData.forEach(ticket => {
                            const studio = studios.find((s: { owner_id: string; name: string }) => s.owner_id === ticket.user_id)
                            if (studio && ticket.profiles) {
                                ticket.profiles.studios = [{ name: studio.name }]
                            }
                        })
                    }
                }
                setTickets(ticketsData)
            }
        }

        fetchTickets()

        // Realtime subscription for new tickets
        const channel = supabase
            .channel('admin_tickets')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'support_tickets' },
                () => {
                    fetchTickets() // Refresh list on any change
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // 2. Fetch messages when ticket selected
    useEffect(() => {
        if (!selectedTicket) return

        setIsLoadingText(true)
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('support_messages')
                .select('*')
                .eq('ticket_id', selectedTicket.id)
                .order('created_at', { ascending: true })

            if (data) {
                setMessages(data)

                // Mark messages from the user as read using Server Action
                await markMessagesAsRead(selectedTicket.id)
            }
            setIsLoadingText(false)
        }

        fetchMessages()

        // Realtime messages for selected ticket
        const channel = supabase
            .channel(`admin_chat_${selectedTicket.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'support_messages',
                    filter: `ticket_id=eq.${selectedTicket.id}`
                },
                async (payload: any) => {
                    const newMsg = payload.new as SupportMessage
                    setMessages(prev => {
                        if (prev.some(m => m.id === newMsg.id)) return prev
                        return [...prev, newMsg]
                    })

                    // If it's from the user, mark it as read immediately if this ticket is open
                    const { data: { user } } = await supabase.auth.getUser()
                    if (user && newMsg.sender_id !== user.id) {
                        await markMessagesAsRead(selectedTicket.id)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [selectedTicket?.id])

    // 3. Periodic fetch or subscription for unread status in ticket list
    // For simplicity, we'll just check if any message in the ticket has is_read = false
    const [unreadTickets, setUnreadTickets] = useState<Set<string>>(new Set())

    useEffect(() => {
        const checkUnread = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('support_messages')
                .select('ticket_id')
                .eq('is_read', false)
                .neq('sender_id', user.id)

            if (data) {
                const unreadIds = new Set(data.map(m => m.ticket_id))
                setUnreadTickets(unreadIds)
            }
        }

        checkUnread()
        const channel = supabase
            .channel('unread_checker')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => checkUnread())
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    // Scroll to bottom
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages])

    const handleSend = async () => {
        if (!selectedTicket || !inputValue.trim()) return
        setIsSending(true)

        try {
            // Optimistic update with client-generated UUID
            const tempId = crypto.randomUUID()
            const newItem: SupportMessage = {
                id: tempId,
                ticket_id: selectedTicket.id,
                sender_id: 'optimistic-sender', // This logic is handled in render
                message: inputValue,
                created_at: new Date().toISOString()
            }

            setMessages(prev => [...prev, newItem])
            setInputValue('')

            const result = await sendMessage(selectedTicket.id, inputValue, tempId)

            if (result?.error) {
                // Revert on error (optional, simple alert for now)
                alert('Failed to send message')
                setMessages(prev => prev.filter(m => m.id !== tempId))
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsSending(false)
        }
    }

    const handleResolve = async () => {
        if (!selectedTicket) return
        if (confirm('Are you sure you want to mark this ticket as resolved?')) {
            // Optimistic update
            setTickets(prev => prev.filter(ticket => ticket.id !== selectedTicket.id))
            setSelectedTicket(null)

            const result = await resolveTicket(selectedTicket.id)
            if (result?.error) {
                // Revert on failure
                alert('Failed to resolve ticket')
                // Ideally refresh list to get it back
                const { data } = await supabase.from('support_tickets').select('*').eq('id', selectedTicket.id).single()
                if (data) setTickets(prev => [data, ...prev]) // Simplistic rollback
            }
        }
    }

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-200px)] bg-white border border-cream-200 rounded-xl overflow-hidden shadow-sm">
            {/* Sidebar: Ticket List */}
            <div className={clsx(
                "w-full lg:w-1/3 border-r border-cream-200 flex flex-col bg-cream-50",
                selectedTicket ? "hidden lg:flex" : "flex"
            )}>
                <div className="p-4 border-b border-cream-200 bg-white">
                    <h2 className="font-serif text-charcoal-900 font-medium">Open Tickets ({tickets.length})</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {tickets.length === 0 ? (
                        <div className="p-8 text-center text-charcoal-400 text-sm">
                            No open tickets.
                        </div>
                    ) : (
                        tickets.map(ticket => (
                            <button
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className={clsx(
                                    "w-full text-left p-4 border-b border-cream-100 transition-colors hover:bg-white",
                                    selectedTicket?.id === ticket.id ? "bg-white border-l-4 border-l-charcoal-900" : "bg-transparent border-l-4 border-l-transparent"
                                )}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-charcoal-900 text-sm">
                                            {ticket.profiles?.studios?.[0]?.name || ticket.profiles?.full_name || 'Unknown User'}
                                        </span>
                                        {unreadTickets.has(ticket.id) && (
                                            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" title="New Message" />
                                        )}
                                    </div>
                                    <span className="text-[10px] text-charcoal-400">
                                        {new Date(ticket.updated_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}
                                    </span>
                                </div>
                                <div className="text-xs text-charcoal-500 uppercase tracking-wider">
                                    {ticket.profiles?.role}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main: Chat Area */}
            <div className={clsx(
                "flex-1 flex flex-col bg-white h-[600px] lg:h-auto",
                !selectedTicket ? "hidden lg:flex" : "flex"
            )}>
                {selectedTicket ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-cream-200 flex justify-between items-center bg-cream-50/50">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="lg:hidden p-2 -ml-2 text-charcoal-400 hover:text-charcoal-900"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="w-10 h-10 bg-cream-200 rounded-full flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-charcoal-600" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-medium text-charcoal-900 truncate">
                                        {selectedTicket.profiles?.studios?.[0]?.name
                                            ? `${selectedTicket.profiles.studios[0].name} (${selectedTicket.profiles.full_name})`
                                            : selectedTicket.profiles?.full_name}
                                    </h3>
                                    <p className="text-xs text-charcoal-500">Ticket ID: {selectedTicket.id.slice(0, 8)}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleResolve}
                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Mark Resolved
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-cream-50/30">
                            {messages.map(msg => {
                                // Admin is the sender if sender_id matches current user... 
                                // Actually we need to know who "I" am. 
                                // Ideally we compare with auth.user.id but for Admin dashboard, 
                                // we can assume messages from the Ticket User are "Left" and others (Admins) are "Right".
                                // Or better, check if sender_id === selectedTicket.user_id.
                                const isUser = msg.sender_id === selectedTicket.user_id
                                return (
                                    <div key={msg.id} className={clsx("flex", isUser ? "justify-start" : "justify-end")}>
                                        <div className={clsx(
                                            "max-w-[70%] p-3 rounded-2xl text-sm shadow-sm",
                                            isUser ? "bg-white border border-cream-200 text-charcoal-800 rounded-bl-none" : "bg-charcoal-900 text-cream-50 rounded-br-none"
                                        )}>
                                            {msg.message}
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-cream-200 bg-white">
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
                                    placeholder="Reply to user..."
                                    className="flex-1 px-4 py-2 bg-cream-50 border border-cream-300 rounded-lg text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-charcoal-900"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isSending}
                                    className="w-10 h-10 bg-charcoal-900 text-cream-50 rounded-lg flex items-center justify-center hover:bg-charcoal-800 disabled:opacity-50 transition-colors"
                                >
                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-charcoal-400">
                        <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
                        <p>Select a ticket to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    )
}
