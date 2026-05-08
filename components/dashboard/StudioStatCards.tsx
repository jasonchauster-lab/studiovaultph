'use client'

import { TrendingUp, Calendar, Zap, Star } from 'lucide-react'
import { clsx } from 'clsx'

interface StudioStatCardsProps {
    stats: {
        revenue: number
        activeListings: number
        occupancy: number
        topInstructor: string
    }
}

import { motion } from 'framer-motion'

export default function StudioStatCards({ stats }: StudioStatCardsProps) {
    const cardData = [
        {
            label: 'Monthly Revenue',
            value: `₱${stats.revenue.toLocaleString()}`,
            icon: TrendingUp,
            trend: 'Last 30 Days',
            color: 'text-primary',
            bgColor: 'bg-primary/5 border-primary/10',
        },
        {
            label: 'Active Listings',
            value: `${stats.activeListings} slots`,
            icon: Calendar,
            trend: 'This week',
            color: 'text-zinc-600',
            bgColor: 'bg-zinc-50 border-zinc-100',
        },
        {
            label: 'Average Occupancy',
            value: `${stats.occupancy}%`,
            icon: Zap,
            trend: 'Current Week',
            color: 'text-primary',
            bgColor: 'bg-primary/5 border-primary/10',
        },
        {
            label: 'Top Instructor',
            value: stats.topInstructor,
            icon: Star,
            trend: 'Most Bookings',
            color: 'text-zinc-600',
            bgColor: 'bg-zinc-50 border-zinc-100',
        }
    ]

    return (
        <div className="max-w-7xl mx-auto px-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
                {cardData.map((card, index) => (
                    <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        transition={{ 
                            type: "spring", 
                            damping: 25, 
                            stiffness: 200, 
                            delay: index * 0.08 
                        }}
                        className="relative overflow-hidden bg-white/70 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/40 shadow-tight hover:shadow-2xl hover:shadow-primary/10 transition-all group"
                    >
                        {/* Subtle Background Glow */}
                        <div className={clsx(
                            "absolute -right-4 -bottom-4 w-24 h-24 blur-[40px] opacity-20 transition-opacity group-hover:opacity-40",
                            card.color.replace('text-', 'bg-')
                        )} />

                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div className={clsx(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border border-white/50 shadow-sm group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-current/10 bg-gradient-to-br",
                                card.bgColor,
                                index % 2 === 0 ? "from-white to-zinc-50" : "from-white to-primary/5"
                            )}>
                                <card.icon className={clsx("w-6 h-6", card.color)} />
                            </div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-white/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/40 shadow-sm">
                                {card.trend}
                            </span>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.25em] leading-none mb-1">
                                {card.label}
                            </p>
                            <h3 className="text-3xl font-black text-zinc-900 tracking-tightest truncate leading-tight bg-gradient-to-br from-zinc-900 to-zinc-500 bg-clip-text text-transparent">
                                {card.value}
                            </h3>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
