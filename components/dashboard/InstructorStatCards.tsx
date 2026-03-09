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
            trendColor: 'text-sage',
            bgIcon: 'bg-sage/10',
            iconColor: 'text-sage'
        },
        {
            label: 'Total Sessions',
            value: `${stats.totalHours}`,
            icon: Clock,
            trend: 'Historical',
            trendColor: 'text-gold',
            bgIcon: 'bg-gold/10',
            iconColor: 'text-gold'
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {cardData.map((card, index) => (
                <div key={index} className="glass-card p-10 group relative overflow-hidden transition-all duration-700 hover:shadow-cloud hover:-translate-y-2">
                    {/* Soft Bloom */}
                    <div className={clsx(
                        "absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-16 -mt-16 transition-all duration-700",
                        card.iconColor === 'text-gold' ? "bg-gold/10" : "bg-sage/10"
                    )} />

                    <div className="flex justify-between items-start mb-8">
                        <div className={clsx(
                            "p-4 rounded-[20px] group-hover:scale-110 transition-all duration-700 border border-white/60 shadow-sm",
                            card.bgIcon
                        )}>
                            <card.icon className={clsx("w-6 h-6", card.iconColor)} />
                        </div>
                        <span className={clsx(
                            "text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border border-white/60 shadow-sm backdrop-blur-md",
                            card.bgIcon,
                            card.iconColor
                        )}>
                            {card.trend}
                        </span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-charcoal/20 uppercase tracking-[0.4em] mb-3">{card.label}</p>
                        <h3 className="text-4xl font-serif text-charcoal tracking-tighter">{card.value}</h3>
                    </div>

                    {card.hasAction && (
                        <div className="mt-8 pt-8 border-t border-white/60">
                            <Link
                                href="/instructor/payout"
                                className="w-full h-14 bg-charcoal text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:brightness-[1.2] transition-all shadow-cloud active:scale-95"
                            >
                                <ArrowUpRight className="w-4 h-4 text-gold stroke-[3px]" />
                                REQUEST PAYOUT
                            </Link>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
