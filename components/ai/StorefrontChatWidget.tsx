'use client'

import { useChat } from '@ai-sdk/react'
import { X, Send, Bot, Sparkles, AlertCircle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

interface StorefrontChatWidgetProps {
    studioSlug: string
    studioName: string
    primaryColor?: string
}

export default function StorefrontChatWidget({ studioSlug, studioName, primaryColor = '#2D3282' }: StorefrontChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [input, setInput] = useState('')
    const { messages, sendMessage, status, error } = useChat({
        api: '/api/chat/storefront',
        body: {
            studioSlug
        }
    })
    const isLoading = status === 'streaming' || status === 'submitted'
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
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
                className="fixed bottom-8 right-8 w-16 h-16 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[9999] group border border-white/20"
                style={{ backgroundColor: primaryColor }}
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
                            <Sparkles className="w-8 h-8 text-white/90 fill-white/10" />
                            <motion.div 
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white shadow-[0_0_10px_rgba(52,211,153,0.5)]"
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
                        className="fixed bottom-28 right-8 w-[90vw] md:w-[400px] h-[70vh] md:h-[600px] bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.15)] border border-zinc-200/50 overflow-hidden flex flex-col z-[9999]"
                    >
                        {/* Header */}
                        <div className="p-8 text-white relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                                    <Bot className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold tracking-tight">{studioName} AI</h3>
                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[8px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30">Assistant</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-0.5">Always here to help you</p>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-50/30">
                            {messages.length === 0 && (
                                <div className="text-center py-12 space-y-6">
                                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-zinc-100 flex items-center justify-center mx-auto relative group">
                                        <div className="absolute inset-0 bg-indigo-500/5 rounded-3xl blur-xl group-hover:bg-indigo-500/10 transition-colors" />
                                        <Sparkles className="w-10 h-10 text-zinc-300 relative z-10" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">Concierge Service</p>
                                        <p className="text-xl font-serif font-bold text-zinc-900 leading-tight px-8">Hi! How can I help you today?</p>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2 px-4">
                                        {['Class Schedule', 'Pricing & Packages', 'Our Instructors'].map((suggestion) => (
                                            <button 
                                                key={suggestion}
                                                onClick={() => setInput(suggestion)}
                                                className="px-4 py-2 bg-white border border-zinc-200 rounded-full text-[11px] font-bold text-zinc-500 hover:border-zinc-900 hover:text-zinc-900 transition-all shadow-sm"
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
                                            ? "text-white rounded-tr-none shadow-[0_10px_20px_rgba(0,0,0,0.1)]" 
                                            : "bg-white border border-zinc-100 text-zinc-800 rounded-tl-none shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                                    )} style={m.role === 'user' ? { backgroundColor: primaryColor } : {}}>
                                        {getMessageText(m)}
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-2 px-2">
                                        {m.role === 'user' ? 'You' : `${studioName} AI`}
                                    </span>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex flex-col items-start animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="bg-white border border-zinc-100 p-4 rounded-3xl rounded-tl-none shadow-sm">
                                        <div className="flex gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce" />
                                            <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <div className="w-1.5 h-1.5 bg-zinc-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-500 shadow-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        {error.message.includes('limit') ? 'Monthly AI limit reached.' : 'Connection lost. Please try again.'}
                                    </span>
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
                                    className="w-full pl-6 pr-14 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-zinc-100 transition-all placeholder:text-zinc-300"
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !input?.trim()}
                                    className="absolute right-2 w-10 h-10 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100 shadow-lg"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
