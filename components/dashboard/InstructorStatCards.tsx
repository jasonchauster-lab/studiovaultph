import { Wallet, Calendar, Clock, Banknote, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

interface InstructorStatCardsProps {
    stats: {
        balance: number
        upcomingSessions: number
        totalHours: number
        pendingEarnings: number
    }
    hasPendingPayout: boolean
}

export default function InstructorStatCards({ stats, hasPendingPayout }: InstructorStatCardsProps) {
    const cardData = [
        {
            label: 'Available Balance',
            value: `₱${stats.balance.toLocaleString()}`,
            icon: Wallet,
            trend: hasPendingPayout ? 'Payout Pending' : 'Verified',
            trendColor: hasPendingPayout ? 'text-gold-deep' : 'text-sage',
            bgIcon: hasPendingPayout ? 'bg-gold/10' : 'bg-sage/10',
            iconColor: hasPendingPayout ? 'text-gold-deep' : 'text-sage',
            hasAction: true
        },
        {
            label: 'Upcoming Sessions',
            value: `${stats.upcomingSessions}`,
            icon: Calendar,
            trend: 'This week',
            trendColor: 'text-sage',
            bgIcon: 'bg-sage/10',
            iconColor: 'text-sage'
        },
        {
            label: 'Total Sessions',
            value: `${stats.totalHours}`,
            icon: Clock,
            trend: 'Historical',
            trendColor: 'text-gold-deep',
            bgIcon: 'bg-gold/10',
            iconColor: 'text-gold-deep'
        },
        {
            label: 'Pending Earnings',
            value: `₱${stats.pendingEarnings.toLocaleString()}`,
            icon: Banknote,
            trend: 'Est. Future',
            trendColor: 'text-sage',
            bgIcon: 'bg-sage/10',
            iconColor: 'text-sage'
        }
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {cardData.map((card, index) => (
                <div key={index} className="glass-card p-6 group relative overflow-hidden transition-all duration-500 hover:-translate-y-2">
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

                    {card.hasAction && (
                        <div className="mt-6 pt-6 border-t border-white/20">
                            <Link
                                href="/instructor/payout"
                                className="btn-antigravity flex items-center justify-center gap-2 w-full py-3 text-[11px] font-bold uppercase tracking-widest"
                            >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                Request Payout
                            </Link>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
