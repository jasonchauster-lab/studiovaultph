'use client'

import React, { useState, memo } from 'react'
import { Plus, Minus, HelpCircle, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface FAQItem {
    question: string
    answer: string
}

interface StorefrontFAQProps {
    config: any
    theme?: any
    isMobile?: boolean
}

function StorefrontFAQ({ config, theme, isMobile }: StorefrontFAQProps) {
    const content = config?.content || {}
    const { title = 'Common Questions', subtitle = 'Everything you need to know about our studio and sessions.', faqs = [], layout = 'simple' } = content
    const [openIndex, setOpenIndex] = useState<number | null>(0)
    
    const supportTitle = content.supportTitle || 'Still have questions?'
    const supportSubtitle = content.supportSubtitle || "We're here to help you start your journey."
    const supportBtnText = content.supportBtnText || 'Contact Support'
    const supportBtnLink = content.supportBtnLink

    const handleSupportClick = () => {
        if (!supportBtnLink) return
        if (supportBtnLink.startsWith('#')) {
            document.getElementById(supportBtnLink.slice(1))?.scrollIntoView({ behavior: 'smooth' })
            return
        }
        window.location.href = supportBtnLink
    }

    return (
        <section id="faq" className={clsx(
            "relative overflow-hidden transition-all duration-500",
            isMobile ? "px-6" : "px-12"
        )}
        style={{ 
            backgroundColor: content.customBgColor || 'var(--global-bg)',
            paddingBlock: content.verticalSpacing || (isMobile ? '5rem' : '8rem')
        }}
        >
            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-[var(--primary-brand)]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[var(--primary-brand)]/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3 pointer-events-none" />

            <div className="max-w-5xl mx-auto relative z-10">
                <div className={clsx(
                    "mb-20 space-y-6",
                    layout === 'simple' ? "text-center" : "text-left"
                )}>
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-brand)]/5 rounded-full border border-[var(--primary-brand)]/10"
                    >
                        <HelpCircle className="w-3.5 h-3.5 text-[var(--primary-brand)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary-brand)]">Support Center</span>
                    </motion.div>
                    
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-bold tracking-tightest uppercase leading-[0.9]"
                        style={{ color: 'var(--global-text)', fontFamily: 'var(--font-heading)' }}
                    >
                        {title}
                    </motion.h2>
                    
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-lg opacity-60 max-w-2xl mx-auto font-medium"
                        style={{ color: 'var(--global-text)', fontFamily: 'var(--font-body)' }}
                    >
                        {subtitle}
                    </motion.p>
                </div>

                <div className="space-y-4">
                    {faqs.length > 0 ? (
                        faqs.map((faq: any, index: number) => (
                            <motion.div 
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={clsx(
                                    "group transition-all duration-500 border-b border-zinc-100",
                                    openIndex === index ? "pb-8" : "pb-0"
                                )}
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full flex items-center justify-between py-8 text-left outline-none group"
                                >
                                    <span 
                                        className={clsx(
                                            "text-xl md:text-2xl font-bold tracking-tight transition-all duration-500",
                                            openIndex === index ? "text-[var(--primary-brand)] translate-x-2" : "text-zinc-900 group-hover:text-[var(--primary-brand)] group-hover:translate-x-1"
                                        )}
                                        style={{ fontFamily: 'var(--font-heading)' }}
                                    >
                                        {faq.question}
                                    </span>
                                    <div className={clsx(
                                        "w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500",
                                        openIndex === index 
                                            ? "bg-[var(--primary-brand)] border-[var(--primary-brand)] text-white rotate-180 shadow-lg shadow-[var(--primary-brand)]/20" 
                                            : "bg-white border-zinc-100 text-zinc-400 group-hover:border-zinc-300 group-hover:text-zinc-900"
                                    )}>
                                        <Plus className={clsx("w-5 h-5 transition-transform duration-500", openIndex === index ? "rotate-45" : "")} />
                                    </div>
                                </button>

                                <AnimatePresence>
                                    {openIndex === index && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pb-8 pr-12">
                                                <p 
                                                    className="text-lg md:text-xl leading-relaxed opacity-60 font-medium italic border-l-4 border-[var(--primary-brand)]/20 pl-6"
                                                    style={{ color: 'var(--global-text)', fontFamily: 'var(--font-body)' }}
                                                >
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))
                    ) : (
                        <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-[3rem] bg-zinc-50/30 italic text-zinc-400 font-serif">
                            Add some frequently asked questions in the builder to help your visitors...
                        </div>
                    )}
                </div>

                {/* Modern Support CTA */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-24 p-12 bg-zinc-950 rounded-[4rem] flex flex-col lg:flex-row items-center justify-between gap-10 overflow-hidden relative group"
                >
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--primary-brand)]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl transition-transform duration-1000 group-hover:scale-110" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
                    
                    <div className="space-y-4 text-center lg:text-left relative z-10">
                        <h4 className="text-white font-bold text-3xl md:text-4xl tracking-tight leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
                            {supportTitle}
                        </h4>
                        <p className="text-white/40 text-[10px] uppercase tracking-[0.4em] font-black">{supportSubtitle}</p>
                    </div>
                    
                    {(supportBtnText || supportBtnLink) && (
                        <button 
                            onClick={handleSupportClick}
                            className="px-10 py-6 bg-white text-zinc-900 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all active:scale-95 shadow-2xl flex items-center gap-3 group/btn"
                        >
                            <span>{supportBtnText}</span>
                            <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                        </button>
                    )}
                </motion.div>
            </div>
        </section>
    )
}

export default memo(StorefrontFAQ)
