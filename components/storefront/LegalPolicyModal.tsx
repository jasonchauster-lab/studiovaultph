'use client'

import React from 'react'
import { X, ShieldCheck, FileText, Scale } from 'lucide-react'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

interface LegalPolicyModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    content: string
    type: 'terms' | 'privacy' | 'refund'
}

export default function LegalPolicyModal({ isOpen, onClose, title, content, type }: LegalPolicyModalProps) {
    const icons = {
        terms: Scale,
        privacy: ShieldCheck,
        refund: FileText
    }
    const Icon = icons[type]

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-sm" 
                    />

                    {/* Modal Content */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 sm:px-8 sm:py-6 border-b border-cream-100 flex items-center justify-between bg-off-white">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-forest/10 rounded-2xl text-forest">
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-serif text-xl text-charcoal-900 leading-tight">{title}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-400">Master Agreement</p>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 hover:bg-cream-100 rounded-full transition-colors text-charcoal-400 hover:text-charcoal-900"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar">
                            {content ? (
                                <div className="prose prose-sm max-w-none text-charcoal-700 leading-relaxed whitespace-pre-wrap font-medium">
                                    {content}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-charcoal-400 italic">
                                    No content has been provided for this policy yet.
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-8 py-5 border-t border-cream-100 bg-off-white flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-8 py-3 bg-charcoal-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-forest transition-all shadow-md"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
