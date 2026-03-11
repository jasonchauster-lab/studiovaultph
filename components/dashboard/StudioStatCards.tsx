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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cardData.map((card, index) => (
                <div key={index} className="earth-card p-4 group transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2.5 ${card.bgIcon.replace('bg-sage/10', 'bg-green-50').replace('bg-gold/10', 'bg-yellow-50')} rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-tight border border-border-grey`}>
                            <card.icon className={`w-4 h-4 ${card.iconColor.replace('text-sage', 'text-green-600').replace('text-gold-deep', 'text-yellow-600')}`} />
                        </div>
                        <span className={`text-[8px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border border-border-grey ${card.bgIcon.replace('bg-sage/10', 'bg-green-50').replace('bg-gold/10', 'bg-yellow-50')} ${card.iconColor.replace('text-sage', 'text-green-700').replace('text-gold-deep', 'text-yellow-700')} shadow-tight`}>
                            {card.trend}
                        </span>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate uppercase tracking-[0.15em] mb-1.5">{card.label}</p>
                        <h3 className="text-2xl font-serif font-bold text-charcoal tracking-tight">{card.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    )
}
