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
            trendColor: 'text-sage',
            bgIcon: 'bg-sage/10',
            iconColor: 'text-sage'
        },
        {
            label: 'Active Listings',
            value: `${stats.activeListings} slots`,
            icon: Calendar,
            trend: 'This week',
            trendColor: 'text-burgundy',
            bgIcon: 'bg-burgundy/5',
            iconColor: 'text-burgundy'
        },
        {
            label: 'Average Occupancy',
            value: `${stats.occupancy}%`,
            icon: Zap,
            trend: 'Current Week',
            trendColor: 'text-burgundy',
            bgIcon: 'bg-burgundy/5',
            iconColor: 'text-burgundy'
        },
        {
            label: 'Top Instructor',
            value: stats.topInstructor,
            icon: Star,
            trend: 'Most Bookings',
            trendColor: 'text-gold',
            bgIcon: 'bg-gold/10',
            iconColor: 'text-gold'
        }
    ]

    return (
        <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {cardData.map((card, index) => (
                    <div key={index} className="earth-card p-4 group transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className={clsx(
                                "p-2.5 rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-tight border border-border-grey bg-white",
                                card.bgIcon
                            )}>
                                <card.icon className={clsx("w-4 h-4", card.iconColor)} />
                            </div>
                            <span className={clsx(
                                "text-[8px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border border-border-grey bg-white shadow-tight",
                                card.trendColor
                            )}>
                                {card.trend}
                            </span>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-slate uppercase tracking-[0.15em] mb-1.5">{card.label}</p>
                            <h3 className="text-2xl font-serif font-bold text-charcoal tracking-tight truncate whitespace-nowrap" title={card.value}>{card.value}</h3>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
