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
                    <div key={index} className="earth-card p-4 sm:p-6 group relative overflow-hidden transition-all duration-500 hover:-translate-y-1 shadow-tight border border-border-grey/40 bg-white/60 backdrop-blur-sm">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none group-hover:bg-forest/10 transition-colors" />
    
                        <div className="flex justify-between items-start mb-5 relative z-10">
                            <div className={clsx(
                                "p-2.5 rounded-xl group-hover:scale-105 transition-all duration-500 border border-border-grey/40 shadow-sm bg-white/40",
                                card.bgIcon
                            )}>
                                <card.icon className={clsx("w-4 h-4", card.iconColor)} />
                            </div>
                            <span className={clsx(
                                "text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1.5 rounded-lg border shadow-sm transition-all",
                                card.label === 'Available Balance' && hasPendingPayout ? 'bg-amber-50 text-amber-900 border-amber-200' :
                                card.label === 'Available Balance' ? 'bg-sage/5 text-forest border-forest/10' :
                                card.label === 'Pending Earnings' ? 'bg-sage/5 text-forest border-forest/10' :
                                'bg-white/40 text-charcoal/40 border-border-grey/50'
                            )}>
                                {card.label === 'Available Balance' && hasPendingPayout ? 'PAYOUT PENDING' : card.trend}
                            </span>
                        </div>
                        <div className="relative z-10 space-y-1">
                            <p className="text-[10px] sm:text-[9px] font-black text-charcoal/40 uppercase tracking-[0.4em] leading-tight mb-2">{card.label}</p>
                            <h3 className="text-2xl sm:text-3xl font-serif text-charcoal tracking-tighter truncate leading-none">{card.value}</h3>
                        </div>
    
                        {card.hasAction && (
                            <div className="mt-6 pt-5 border-t border-border-grey/40 relative z-10">
                                <Link
                                    href="/instructor/payout"
                                    className="w-full h-11 bg-forest text-white rounded-xl text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2.5 hover:brightness-110 transition-all shadow-tight active:scale-95"
                                >
                                    <ArrowUpRight className="w-4 h-4 text-white/60 stroke-[3px]" />
                                    CASH OUT
                                </Link>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
