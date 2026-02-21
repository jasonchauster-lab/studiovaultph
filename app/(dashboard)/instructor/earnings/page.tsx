import { getInstructorEarnings } from '../actions'
import { Wallet, TrendingUp, Clock, ArrowUpRight, DollarSign } from 'lucide-react'
import Link from 'next/link'
import ExportCsvButton from '@/components/dashboard/ExportCsvButton'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'

export default async function EarningsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { range } = await searchParams

    // --- DATE FILTER LOGIC ---
    let startDate: string | undefined
    let endDate: string | undefined = new Date().toISOString()
    const now = new Date()

    if (range === '7d') {
        const d = new Date()
        d.setDate(d.getDate() - 7)
        startDate = d.toISOString()
    } else if (range === '30d') {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        startDate = d.toISOString()
    } else if (range === 'this-month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    } else if (range === 'this-quarter') {
        const quarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString()
    } else if (range === 'this-year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString()
    }
    // --- END DATE FILTER LOGIC ---

    const {
        totalEarned,
        totalWithdrawn,
        pendingPayouts,
        availableBalance,
        pendingBalance,
        recentTransactions,
        error
    } = await getInstructorEarnings(startDate, endDate)

    if (error) {
        return (
            <div className="p-8 text-red-600">
                Failed to load earnings data. Please try again later.
                {/* Debug: {error} */}
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-2">Earnings & Payouts</h1>
                    <p className="text-charcoal-600">Track your income and manage withdrawals.</p>
                </div>
                <div className="flex gap-2">
                    {recentTransactions && <ExportCsvButton data={recentTransactions} filename="instructor-earnings" />}
                    <Link
                        href="/instructor/payout"
                        className="bg-charcoal-900 text-cream-50 px-6 py-3 rounded-lg font-medium hover:bg-charcoal-800 transition-colors flex items-center gap-2"
                    >
                        <Wallet className="w-4 h-4" />
                        Request Payout
                    </Link>
                </div>
            </div>

            <DateRangeFilters />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Available Balance */}
                <div className="bg-charcoal-900 text-cream-50 p-6 rounded-xl shadow-lg">
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <Wallet className="w-5 h-5" />
                        <span className="text-sm font-medium">Available Balance</span>
                    </div>
                    <p className="text-3xl font-semibold">₱{(availableBalance || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 opacity-60">Ready to withdraw</p>
                </div>

                {/* Total Earnings */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-charcoal-500">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-sm font-medium">Total Earnings</span>
                    </div>
                    <p className="text-3xl font-semibold text-charcoal-900">₱{(totalEarned || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-charcoal-400">Lifetime gross income</p>
                </div>

                {/* Pending Payouts (processing requests) */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-charcoal-500">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm font-medium">Pending Payouts</span>
                    </div>
                    <p className="text-3xl font-semibold text-charcoal-900">₱{(pendingPayouts || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-charcoal-400">Processing requests</p>
                </div>

                {/* Security Hold (Hold for 24h) */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm border-l-4 border-l-amber-400">
                    <div className="flex items-center gap-3 mb-2 text-amber-600">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm font-medium">Security Hold (24h)</span>
                    </div>
                    <p className="text-3xl font-semibold text-charcoal-900">₱{(pendingBalance || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-charcoal-400">Unlocking within 24 hours</p>
                </div>

                {/* Total Withdrawn */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-charcoal-500">
                        <ArrowUpRight className="w-5 h-5" />
                        <span className="text-sm font-medium">Total Withdrawn</span>
                    </div>
                    <p className="text-3xl font-semibold text-charcoal-900">₱{(totalWithdrawn || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-charcoal-400">Successfully transferred</p>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-cream-100">
                    <h3 className="font-serif text-xl text-charcoal-900">Recent Transactions</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-cream-50 text-charcoal-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cream-100">
                            {recentTransactions && recentTransactions.length > 0 ? (
                                recentTransactions.map((tx, i) => (
                                    <tr key={i} className="hover:bg-cream-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-charcoal-600">
                                            {new Date(tx.date).toLocaleDateString()}
                                            <span className="block text-xs text-charcoal-400">
                                                {new Date(tx.date).toLocaleTimeString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-charcoal-900">
                                            {tx.type}
                                            {tx.details && (
                                                <span className="block text-xs text-charcoal-400 font-normal">
                                                    {tx.details}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${tx.status === 'confirmed' || tx.status === 'approved' || tx.status === 'processed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : tx.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }
                                            `}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-medium text-right ${tx.total_amount > 0 ? 'text-green-600' : 'text-charcoal-900'}`}>
                                            {tx.total_amount > 0 ? '+' : ''}₱{Math.abs(tx.total_amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-charcoal-500 text-sm">
                                        No transactions yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
