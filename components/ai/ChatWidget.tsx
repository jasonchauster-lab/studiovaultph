'use client'

import { useChat } from '@ai-sdk/react'
import { MessageCircle, X, Send, User, Bot, Sparkles, AlertCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import SupportChatWrapper from '@/components/support/SupportChatWrapper'

export default function ChatWidget({ userEmail, userId }: { userEmail?: string, userId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [chatMode, setChatMode] = useState<'ai' | 'human'>('ai')
    const [showHumanOption, setShowHumanOption] = useState(false)
    const [input, setInput] = useState('')
    const { messages, sendMessage, status, error } = useChat({
        api: '/api/chat',
        body: {
            userEmail
        }
    })
    const isLoading = status === 'streaming' || status === 'submitted'
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }

        // Check if we should show the human chat option
        const lastMessage = messages[messages.length - 1]
        if (lastMessage?.role === 'assistant') {
            const text = getMessageText(lastMessage).toLowerCase()
            if (text.includes('support team') || text.includes('don\'t have') || text.includes('human')) {
                setShowHumanOption(true)
            }
        } else if (lastMessage?.role === 'user') {
            const text = lastMessage.content?.toLowerCase() || ''
            if (text.includes('human') || text.includes('person') || text.includes('agent')) {
                // If user asks for a human, we can show it too
                setShowHumanOption(true)
            }
        }
    }, [messages])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return
        
        sendMessage({ text: input })
        setInput('')
    }

    const getMessageText = (m: any) => {
        if (m.content) return m.content
        return m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || ''
    }

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-[#2D3282] to-[#4F56C6] text-white rounded-2xl shadow-[0_20px_50px_rgba(45,50,130,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border border-white/20"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                            <X className="w-8 h-8" />
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="chat" 
                            initial={{ scale: 0.5, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="relative"
                        >
                            <Sparkles className="w-8 h-8 text-indigo-100 fill-indigo-100/20" />
                            <motion.div 
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#2D3282] shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9, transformOrigin: 'bottom right' }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-28 right-8 w-[400px] h-[600px] bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.15)] border border-zinc-200/50 overflow-hidden flex flex-col z-50"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-[#2D3282] to-[#4F56C6] p-8 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
                            
                            <div className="flex items-center justify-between w-full relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                                        <Sparkles className="w-7 h-7 text-indigo-100 fill-indigo-100/20" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black tracking-tightest uppercase">Bridge AI</h3>
                                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30">Live</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-0.5">Assistant • Powered by StudioVault</p>
                                    </div>
                                </div>
                                
                                {chatMode === 'ai' && showHumanOption && (
                                    <button 
                                        onClick={() => setChatMode('human')}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2 group animate-in fade-in slide-in-from-right-4 duration-500"
                                    >
                                        <User className="w-3 h-3 transition-transform group-hover:scale-110" />
                                        Talk to Human
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content area: either AI Chat or Human Support */}
                        <div className="flex-1 flex flex-col min-h-0">
                            {chatMode === 'ai' ? (
                                <>
                                    {/* Messages Area */}
                                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
                                        {messages.length === 0 && (
                                            <div className="text-center py-12 space-y-6">
                                                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-zinc-100 flex items-center justify-center mx-auto relative group">
                                                    <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl blur-xl group-hover:bg-indigo-500/10 transition-colors" />
                                                    <Bot className="w-10 h-10 text-[#2D3282]/20 relative z-10" />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Studio Support Center</p>
                                                    <p className="text-xl font-serif font-bold text-zinc-900 leading-tight px-8">How can I help you manage your studio today?</p>
                                                </div>
                                                <div className="flex flex-wrap justify-center gap-2 px-4">
                                                    {['Scheduling help', 'Sales reports', 'Member management'].map((suggestion) => (
                                                        <button 
                                                            key={suggestion}
                                                            onClick={() => setInput(suggestion)}
                                                            className="px-4 py-2 bg-white border border-zinc-200 rounded-full text-[11px] font-bold text-zinc-500 hover:border-[#2D3282] hover:text-[#2D3282] transition-all shadow-sm"
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {messages.map((m) => (
                                            <div key={m.id} className={clsx("flex flex-col", m.role === 'user' ? "items-end" : "items-start")}>
                                                <div className={clsx(
                                                    "max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm transition-all whitespace-pre-wrap",
                                                    m.role === 'user' 
                                                        ? "bg-[#2D3282] text-white rounded-tr-none shadow-[0_10px_20px_rgba(45,50,130,0.15)]" 
                                                        : "bg-white border border-zinc-100 text-zinc-800 rounded-tl-none shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                                                )}>
                                                    {getMessageText(m)}
                                                </div>
                                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2 px-2">
                                                    {m.role === 'user' ? 'You' : 'Bridge AI'}
                                                </span>
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex flex-col items-start animate-in fade-in slide-in-from-left-2 duration-300">
                                                <div className="bg-white border border-zinc-100 p-4 rounded-3xl rounded-tl-none shadow-sm">
                                                    <div className="flex gap-1.5">
                                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {error && (
                                            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-500 shadow-sm">
                                                <AlertCircle className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Connection lost. Please try again.</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Area */}
                                    <form onSubmit={handleSubmit} className="p-6 bg-white border-t border-zinc-100">
                                        <div className="relative flex items-center group">
                                            <input
                                                type="text"
                                                value={input}
                                                onChange={handleInputChange}
                                                placeholder="Ask anything..."
                                                className="w-full pl-6 pr-14 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all placeholder:text-zinc-300"
                                            />
                                            <button
                                                type="submit"
                                                disabled={isLoading || !input?.trim()}
                                                className="absolute right-2 w-10 h-10 bg-[#2D3282] text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 shadow-lg shadow-indigo-200"
                                            >
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                                    {/* Back to AI button */}
                                    <div className="px-6 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                                        <button 
                                            onClick={() => setChatMode('ai')}
                                            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:translate-x-1 transition-all"
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            Back to AI Assistant
                                        </button>
                                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Human Support Chat</span>
                                    </div>
                                        <SupportChatWrapper 
                                            userId={userId} 
                                            hideFloatingButton={true} 
                                            hideHeader={true}
                                            externalOpen={true} 
                                        />
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
