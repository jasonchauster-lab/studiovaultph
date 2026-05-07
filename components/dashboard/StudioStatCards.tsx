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
                        transition={{ 
                            type: "spring", 
                            damping: 25, 
                            stiffness: 200, 
                            delay: index * 0.08 
                        }}
                        className="bg-white p-5 sm:p-6 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className={clsx(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all border shadow-sm group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-current/5",
                                card.bgColor
                            )}>
                                <card.icon className={clsx("w-5 h-5", card.color)} />
                            </div>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-50 px-2.5 py-1 rounded-full border border-zinc-100">
                                {card.trend}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] leading-none">
                                {card.label}
                            </p>
                            <h3 className="text-2xl font-black text-zinc-900 tracking-tight truncate leading-none">
                                {card.value}
                            </h3>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
