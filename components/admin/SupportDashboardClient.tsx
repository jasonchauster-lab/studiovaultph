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
                const unreadIds = new Set<string>(data.map((m: { ticket_id: string }) => m.ticket_id))
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
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-200px)] bg-white border border-stone-100 rounded-[32px] overflow-hidden shadow-cloud">
            {/* Sidebar: Ticket List */}
            <div className={clsx(
                "w-full lg:w-1/3 border-r border-stone-100 flex flex-col bg-stone-50",
                selectedTicket ? "hidden lg:flex" : "flex"
            )}>
                <div className="p-6 border-b border-stone-100 bg-white">
                    <h2 className="font-serif text-burgundy text-lg">Active Inquiries ({tickets.length})</h2>
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
                                    "w-full text-left p-6 border-b border-stone-100 transition-all duration-300 hover:bg-white group relative",
                                    selectedTicket?.id === ticket.id ? "bg-white" : "bg-transparent"
                                )}
                            >
                                {selectedTicket?.id === ticket.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-burgundy" />
                                )}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-burgundy text-[11px] uppercase tracking-widest">
                                            {ticket.profiles?.studios?.[0]?.name || ticket.profiles?.full_name || 'Unknown User'}
                                        </span>
                                        {unreadTickets.has(ticket.id) && (
                                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" title="New Message" />
                                        )}
                                    </div>
                                    <span className="text-[9px] font-black text-burgundy/30 uppercase tracking-tighter">
                                        {new Date(ticket.updated_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="text-[9px] font-black text-forest uppercase tracking-[0.2em] opacity-60">
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
                        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/30">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="lg:hidden p-2 -ml-2 text-burgundy/40 hover:text-burgundy transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center shrink-0 shadow-tight">
                                    <User className="w-6 h-6 text-burgundy/60" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-serif text-lg text-burgundy truncate">
                                        {selectedTicket.profiles?.studios?.[0]?.name
                                            ? `${selectedTicket.profiles.studios[0].name} (${selectedTicket.profiles.full_name})`
                                            : selectedTicket.profiles?.full_name}
                                    </h3>
                                    <p className="text-[10px] font-black text-burgundy/40 uppercase tracking-widest mt-0.5">TICKET ID: {selectedTicket.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleResolve}
                                className="px-5 py-2.5 bg-green-50 text-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-all flex items-center gap-2.5 shadow-sm active:scale-95"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Intercept & Resolve
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-stone-50/10">
                            {messages.map(msg => {
                                const isUser = msg.sender_id === selectedTicket.user_id
                                return (
                                    <div key={msg.id} className={clsx("flex", isUser ? "justify-start" : "justify-end")}>
                                        <div className={clsx(
                                            "max-w-[75%] p-5 rounded-[24px] text-xs shadow-tight leading-relaxed transition-all animate-in fade-in slide-in-from-bottom-2 duration-500",
                                            isUser ? "bg-white border border-stone-100 text-burgundy/80 rounded-bl-none" : "bg-forest text-white rounded-br-none shadow-forest/10"
                                        )}>
                                            {msg.message}
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-6 border-t border-stone-100 bg-white">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    handleSend()
                                }}
                                className="flex gap-4"
                            >
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Dispatch response to operative..."
                                    className="flex-1 px-6 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-burgundy text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/40 transition-all placeholder:text-burgundy/20"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isSending}
                                    className="w-12 h-12 bg-forest text-white rounded-xl flex items-center justify-center hover:brightness-110 disabled:opacity-50 transition-all shadow-md active:scale-95"
                                >
                                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
