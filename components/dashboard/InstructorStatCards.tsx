import { Wallet, Calendar, Clock, Banknote, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

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
            trendColor: hasPendingPayout ? 'text-gold' : 'text-sage',
            bgIcon: hasPendingPayout ? 'bg-gold/10' : 'bg-sage/10',
            iconColor: hasPendingPayout ? 'text-gold' : 'text-sage',
            hasAction: true
        },
        {
            label: 'Upcoming Sessions',
            value: `${stats.upcomingSessions}`,
            icon: Calendar,
            trend: 'This week',
            trendColor: 'text-burgundy',
            bgIcon: 'bg-burgundy/10',
            iconColor: 'text-burgundy'
        },
        {
            label: 'Total Sessions',
            value: `${stats.totalHours}`,
            icon: Clock,
            trend: 'Historical',
            trendColor: 'text-burgundy',
            bgIcon: 'bg-burgundy/5',
            iconColor: 'text-burgundy'
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
        <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {cardData.map((card, index) => (
                    <div key={index} className="earth-card p-4 group relative overflow-hidden transition-all duration-300 hover:-translate-y-1">
    
                        <div className="flex justify-between items-start mb-4">
                            <div className={clsx(
                                "p-2.5 rounded-lg group-hover:scale-110 transition-all duration-300 border border-border-grey shadow-tight bg-white",
                                card.bgIcon
                            )}>
                                <card.icon className={clsx("w-4 h-4", card.iconColor)} />
                            </div>
                            <span className={clsx(
                                "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border shadow-tight",
                                card.label === 'Available Balance' && hasPendingPayout ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                card.label === 'Available Balance' ? 'bg-green-50 text-green-700 border-green-100' :
                                card.label === 'Pending Earnings' ? 'bg-green-50 text-green-700 border-green-100' :
                                'bg-white text-burgundy border-border-grey'
                            )}>
                                {card.trend}
                            </span>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate uppercase tracking-[0.3em] mb-1.5">{card.label}</p>
                            <h3 className="text-2xl font-bold font-sans text-charcoal tracking-tighter">{card.value}</h3>
                        </div>
    
                        {card.hasAction && (
                            <div className="mt-4 pt-4 border-t border-border-grey">
                                <Link
                                    href="/instructor/payout"
                                    className="w-full h-9 bg-forest text-white rounded-lg text-[8px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-tight active:scale-95"
                                >
                                    <ArrowUpRight className="w-3 h-3 text-buttermilk stroke-[3px]" />
                                    REQUEST PAYOUT
                                </Link>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
