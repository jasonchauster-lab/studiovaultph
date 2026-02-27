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
            trendColor: 'text-green-600',
            bgIcon: 'bg-green-50',
            iconColor: 'text-green-600'
        },
        {
            label: 'Active Listings',
            value: `${stats.activeListings} slots`,
            icon: Calendar,
            trend: 'This week',
            trendColor: 'text-rose-gold',
            bgIcon: 'bg-rose-50',
            iconColor: 'text-rose-gold'
        },
        {
            label: 'Average Occupancy',
            value: `${stats.occupancy}%`,
            icon: Zap,
            trend: 'Current Week',
            trendColor: 'text-blue-600',
            bgIcon: 'bg-blue-50',
            iconColor: 'text-blue-600'
        },
        {
            label: 'Top Instructor',
            value: stats.topInstructor,
            icon: Star,
            trend: 'Most Bookings',
            trendColor: 'text-amber-600',
            bgIcon: 'bg-amber-50',
            iconColor: 'text-amber-600'
        }
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cardData.map((card, index) => (
                <div key={index} className="bg-white p-6 rounded-2xl border border-cream-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 ${card.bgIcon} rounded-xl group-hover:scale-110 transition-transform`}>
                            <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${card.bgIcon} ${card.iconColor}`}>
                            {card.trend}
                        </span>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-charcoal-500 uppercase tracking-widest mb-1">{card.label}</p>
                        <h3 className="text-2xl font-serif text-charcoal-900">{card.value}</h3>
                    </div>
                </div>
            ))}
        </div>
    )
}
