import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Info, X, ArrowDownRight } from 'lucide-react'
import { clsx } from 'clsx'

interface ActionableInsightProps {
    title: string
    description: string
}

export const ActionableInsight = ({ title, description }: ActionableInsightProps) => (
    <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-zinc-900 rounded-[3.5rem] p-12 text-white relative overflow-hidden group shadow-2xl shadow-zinc-950/20"
    >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
        <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Operation Insight</span>
            </div>
            <div className="space-y-4">
                <h4 className="text-3xl font-black tracking-tightest leading-tight">{title}</h4>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-md">
                    {description}
                </p>
            </div>
        </div>
    </motion.div>
)

interface DataMethodologyProps {
    title: string
    description: string
    onExplore: () => void
}

export const DataMethodology = ({ title, description, onExplore }: DataMethodologyProps) => (
    <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white border border-zinc-100 rounded-[3.5rem] p-12 shadow-sm relative overflow-hidden group"
    >
            <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100">
                    <Info className="w-5 h-5 text-zinc-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Data Methodology</span>
            </div>
            <div className="space-y-4">
                <h4 className="text-2xl font-black text-zinc-900 tracking-tightest">{title}</h4>
                <p className="text-xs text-zinc-500 font-bold leading-relaxed max-w-sm uppercase tracking-wider opacity-60">
                    {description}
                </p>
            </div>
            <button 
                onClick={onExplore}
                className="px-8 py-4 bg-zinc-50 hover:bg-zinc-900 hover:text-white rounded-2xl text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em] transition-all active:scale-95 border border-zinc-100"
            >
                Explore Retention Science
            </button>
        </div>
    </motion.div>
)

interface AnalyticsInfoModalProps {
    isOpen: boolean
    onClose: () => void
}

export const AnalyticsInfoModal = ({ isOpen, onClose }: AnalyticsInfoModalProps) => (
    <AnimatePresence>
        {isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-zinc-900/60 backdrop-blur-md" 
                    onClick={onClose} 
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden"
                >
                    <div className="p-16 space-y-12">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black text-zinc-900 tracking-tightest">Retention Metrics</h3>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Growth & Science Guide</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-zinc-50 hover:bg-zinc-900 hover:text-white text-zinc-400 transition-all hover:rotate-90"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Retention Rate</h4>
                                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                    The percentage of customers who continue to book after their first visit. A high M1 (Month 1) retention indicates a strong first impression and instructor quality.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                                    <ArrowDownRight className="w-6 h-6" />
                                </div>
                                <h4 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Churn Rate</h4>
                                <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                                    The percentage of customers who stop visiting. If your M3 retention is below 30%, it indicates a lack of long-term program value or excessive pricing friction.
                                </p>
                            </div>
                        </div>

                        <div className="p-10 bg-zinc-900 rounded-[2.5rem] space-y-4 border border-zinc-800 shadow-2xl">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Actionable Strategy</h4>
                            <p className="text-sm text-zinc-400 font-medium leading-relaxed">
                                The "Golden Window" is between Month 1 and Month 3. Users who reach Month 4 have a 70% higher LTV (Lifetime Value). Focus your email automations on customers who haven't returned by Month 2.
                            </p>
                        </div>

                        <button 
                            onClick={onClose}
                            className="w-full py-6 bg-zinc-100 text-zinc-400 hover:bg-zinc-900 hover:text-white rounded-3xl text-[10px] font-black uppercase tracking-[0.3em] transition-all"
                        >
                            Dismiss Guide
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
)
