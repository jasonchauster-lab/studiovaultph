import { TrendingUp, Calendar, Zap, Star } from 'lucide-react'

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
            trendColor: 'text-gold-deep',
            bgIcon: 'bg-gold/10',
            iconColor: 'text-gold-deep'
        },
        {
            label: 'Average Occupancy',
            value: `${stats.occupancy}%`,
            icon: Zap,
            trend: 'Current Week',
            trendColor: 'text-sage',
            bgIcon: 'bg-sage/10',
            iconColor: 'text-sage'
        },
        {
            label: 'Top Instructor',
            value: stats.topInstructor,
            icon: Star,
            trend: 'Most Bookings',
            trendColor: 'text-gold-deep',
            bgIcon: 'bg-gold/10',
            iconColor: 'text-gold-deep'
        }
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {cardData.map((card, index) => (
                <div key={index} className="glass-card p-6 group transition-all duration-500 hover:-translate-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-sage/5 blur-3xl rounded-full -mr-12 -mt-12 group-hover:bg-sage/10 transition-colors" />

                    <div className="flex justify-between items-start mb-6">
                        <div className={`p-3.5 ${card.bgIcon} rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-sm border border-white/40`}>
                            <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border border-white/40 ${card.bgIcon} ${card.iconColor} shadow-sm backdrop-blur-md`}>
                            {card.trend}
                        </span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-[0.2em] mb-2">{card.label}</p>
                        <h3 className="text-3xl font-serif font-bold text-charcoal tracking-tight">{card.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    )
}
