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

export default function StudioStatCards({ stats }: StudioStatCardsProps) {
    const cardData = [
        {
            label: 'Monthly Revenue',
            value: `₱${stats.revenue.toLocaleString()}`,
            icon: TrendingUp,
            trend: 'Last 30 Days',
            trendColor: 'text-forest',
            bgIcon: 'bg-forest/5',
            iconColor: 'text-forest'
        },
        {
            label: 'Active Listings',
            value: `${stats.activeListings} slots`,
            icon: Calendar,
            trend: 'This week',
            trendColor: 'text-charcoal',
            bgIcon: 'bg-charcoal/5',
            iconColor: 'text-charcoal'
        },
        {
            label: 'Average Occupancy',
            value: `${stats.occupancy}%`,
            icon: Zap,
            trend: 'Current Week',
            trendColor: 'text-forest',
            bgIcon: 'bg-forest/5',
            iconColor: 'text-forest'
        },
        {
            label: 'Top Instructor',
            value: stats.topInstructor,
            icon: Star,
            trend: 'Most Bookings',
            trendColor: 'text-sage',
            bgIcon: 'bg-sage/10',
            iconColor: 'text-sage'
        }
    ]

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
                {cardData.map((card, index) => (
                    <div key={index} className="earth-card p-3 sm:p-6 group transition-all duration-500 hover:shadow-card hover:-translate-y-1.5 relative overflow-hidden bg-white/50 backdrop-blur-sm">
                        <div className="flex justify-between items-start mb-3 sm:mb-6">
                            <div className={clsx(
                                "w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-500 shadow-tight border border-border-grey/50 bg-white group-hover:scale-110 group-hover:shadow-card",
                                card.bgIcon
                            )}>
                                <card.icon className={clsx("w-4 h-4 sm:w-5 sm:h-5", card.iconColor)} />
                            </div>
                            <span className={clsx(
                                "text-[7px] sm:text-[9px] font-black uppercase tracking-[0.2em] px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border-grey/30 bg-white/80 shadow-tight backdrop-blur-sm",
                                card.trendColor
                            )}>
                                {card.trend}
                            </span>
                        </div>
                        <div>
                            <p className="text-[8px] sm:text-[10px] font-bold text-slate uppercase tracking-[0.2em] mb-1 sm:mb-2 opacity-70 truncate">{card.label}</p>
                            <h3 className="text-xl sm:text-3xl font-serif font-black text-charcoal tracking-tight truncate leading-none" title={card.value}>{card.value}</h3>
                        </div>
                        
                        {/* Decorative background element */}
                        <div className={clsx(
                            "absolute -right-4 -bottom-4 w-16 h-16 sm:w-24 sm:h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-1000",
                            card.bgIcon
                        )} />
                    </div>
                ))}
            </div>
        </div>
    )
}
