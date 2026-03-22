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
        <div className="max-w-5xl mx-auto px-4 sm:px-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
                {cardData.map((card, index) => (
                    <div key={index} className="atelier-card !p-5 sm:!p-8 group">
                        <div className="flex justify-between items-start mb-4 sm:mb-6">
                            <div className={clsx(
                                "p-2.5 sm:p-3 rounded-xl border border-burgundy/5 shadow-tight bg-white group-hover:bg-burgundy group-hover:text-white transition-all duration-500",
                                card.iconColor
                            )}>
                                <card.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                            <span className={clsx(
                                "text-[8px] sm:text-[9px] font-black uppercase tracking-[0.3em] px-2.5 sm:px-3 py-1.5 rounded-lg border shadow-tight",
                                card.label === 'Available Balance' && hasPendingPayout ? 'bg-amber-50 text-amber-900 border-amber-200' :
                                'bg-stone-50 text-forest border-burgundy/5'
                            )}>
                                {card.label === 'Available Balance' && hasPendingPayout ? 'PENDING' : card.trend}
                            </span>
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                            <p className="text-[9px] sm:text-[10px] font-bold text-burgundy/40 uppercase tracking-[0.3em] leading-tight">{card.label}</p>
                            <h3 className="text-2xl sm:text-4xl font-serif text-burgundy tracking-tighter truncate leading-none">{card.value}</h3>
                        </div>
    
                        {card.hasAction && (
                            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-burgundy/5">
                                <Link
                                    href="/instructor/payout"
                                    className="btn-primary-atelier !w-full !py-4 !text-[9px] !rounded-xl"
                                >
                                    <ArrowUpRight className="w-4 h-4" />
                                    Withdraw
                                </Link>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
