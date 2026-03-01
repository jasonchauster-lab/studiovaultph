'use client'

import { getInstructorEarnings } from '../actions'
import { Wallet, TrendingUp, Clock, ArrowUpRight, DollarSign, ArrowLeft, Info, X, ShieldCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { topUpWallet } from '@/app/(dashboard)/customer/actions'
import ExportCsvButton from '@/components/dashboard/ExportCsvButton'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'

export default function EarningsPage({
    searchParams
}: {
    searchParams: any
}) {
    const [range, setRange] = useState<string | undefined>(undefined)
    const [data, setData] = useState<any>(null)
    const [showInfoModal, setShowInfoModal] = useState(false)
    const [showTopUpModal, setShowTopUpModal] = useState(false)
    const [topUpAmount, setTopUpAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const handleTopUp = async () => {
        const amount = parseFloat(topUpAmount)
        if (isNaN(amount) || amount <= 0) return alert('Please enter a valid amount.')

        setIsSubmitting(true)
        const result = await topUpWallet(amount)
        setIsSubmitting(false)

        if (result.error) {
            alert(result.error)
        } else {
            router.push(`/customer/payment/top-up/${result.topUpId}`)
        }
    }

    useEffect(() => {
        searchParams.then((params: any) => setRange(params.range))
    }, [searchParams])

    useEffect(() => {
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

        getInstructorEarnings(startDate, endDate).then(setData)
    }, [range])

    if (!data) return <div className="p-8">Loading earnings...</div>

    const {
        totalEarned,
        totalWithdrawn,
        pendingPayouts,
        availableBalance,
        pendingBalance,
        recentTransactions,
        error
    } = data

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
            {/* Info Modal */}
            {showInfoModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}>
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-cream-200 flex justify-between items-center bg-cream-50">
                            <h3 className="font-serif text-lg text-charcoal-900">Wallet & Recovery Rules</h3>
                            <button onClick={() => setShowInfoModal(false)} className="text-charcoal-400 hover:text-charcoal-900 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-rose-gold font-bold text-sm uppercase tracking-wider">
                                    <AlertCircle className="w-4 h-4" />
                                    Negative Balances
                                </div>
                                <p className="text-sm text-charcoal-600 leading-relaxed">
                                    If penalty deductions cause your wallet to drop below ₱0.00, your account will carry a negative balance. While negative, your "Request Payout" feature is disabled and new bookings are restricted.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-charcoal-900 font-bold text-sm uppercase tracking-wider">
                                    <ShieldCheck className="w-4 h-4" />
                                    Auto-Recovery
                                </div>
                                <p className="text-sm text-charcoal-600 leading-relaxed">
                                    Any future earnings or refunds will be automatically applied to the negative balance until the debt is cleared. You can also contact Admin to settle manually via GCash/Bank Transfer.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-cream-50 border-t border-cream-200">
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="w-full py-2 bg-charcoal-900 text-white rounded-lg font-bold hover:bg-charcoal-800 transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <Link
                        href="/instructor"
                        className="inline-flex items-center gap-1.5 text-sm text-charcoal-500 hover:text-charcoal-900 transition-colors mb-3"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-2">Earnings & Payouts</h1>
                    <p className="text-charcoal-600">Track your income and manage withdrawals.</p>
                </div>
                <div className="flex gap-2">
                    {recentTransactions && <ExportCsvButton data={recentTransactions} filename="instructor-earnings" />}
                    <button
                        onClick={() => setShowTopUpModal(true)}
                        className="bg-white text-charcoal-900 border border-cream-200 px-6 py-3 rounded-lg font-bold hover:bg-cream-50 shadow-sm transition-all flex items-center gap-2"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Top-Up Wallet
                    </button>
                    {availableBalance < 0 ? (
                        <button
                            disabled
                            className="bg-charcoal-400 text-cream-100 px-6 py-3 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 cursor-not-allowed"
                            title="Payouts are restricted while your balance is negative."
                        >
                            <Wallet className="w-4 h-4" />
                            Request Payout
                        </button>
                    ) : (
                        <Link
                            href="/instructor/payout"
                            className="bg-rose-gold text-white px-6 py-3 rounded-lg font-bold hover:brightness-110 shadow-md transition-all flex items-center gap-2"
                        >
                            <Wallet className="w-4 h-4" />
                            Request Payout
                        </Link>
                    )}
                </div>
            </div>

            <DateRangeFilters />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Gross Earnings */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-rose-gold" />
                        <span className="text-sm font-medium text-charcoal-500 uppercase tracking-wider">Gross Earnings</span>
                    </div>
                    <p className="text-3xl font-bold text-charcoal-900">₱{(data.totalEarned || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-charcoal-400">Lifetime gross income</p>
                </div>

                {/* Compensation (Studio late cancellation) */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-charcoal-500 uppercase tracking-wider">Compensation</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600">₱{(data.totalCompensation || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-charcoal-400">From studio late cancels</p>
                </div>

                {/* Penalty (Instructor late cancellation) */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="w-5 h-5 text-red-600" transform="rotate(180)" />
                        <span className="text-sm font-medium text-charcoal-500 uppercase tracking-wider">Penalties</span>
                    </div>
                    <p className="text-3xl font-bold text-red-600">- ₱{(data.totalPenalty || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-charcoal-400">From your late cancels</p>
                </div>

                {/* Net Earnings */}
                <div className="bg-charcoal-900 text-cream-50 p-6 rounded-xl shadow-lg border border-rose-gold/20">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-rose-gold" />
                            <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Net Earnings</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-rose-gold px-2 py-1 rounded bg-rose-gold/10">
                            Calculation: Gross + Comp - Penalty
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-white">₱{(data.netEarnings || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 opacity-60">Your take-home income</p>
                </div>

                {/* Available Balance */}
                <div className="p-6 rounded-xl shadow-sm text-white" style={{ background: '#BC926E' }}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <Wallet className="w-5 h-5 text-white" />
                            <span className="text-sm font-medium opacity-90 uppercase tracking-wider">Available Balance</span>
                        </div>
                        <button
                            onClick={() => setShowInfoModal(true)}
                            className="text-white/80 hover:text-white transition-colors p-1"
                            title="Wallet Rules"
                        >
                            <Info className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-3xl font-bold">₱{(availableBalance || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 opacity-80">Ready to withdraw</p>
                </div>

                {/* Total Withdrawn */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <ArrowUpRight className="w-5 h-5 text-rose-gold" />
                        <span className="text-sm font-medium text-charcoal-500 uppercase tracking-wider">Total Withdrawn</span>
                    </div>
                    <p className="text-3xl font-bold text-charcoal-900">₱{(totalWithdrawn || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-charcoal-400">Successfully transferred</p>
                </div>

                {/* Pending Payouts */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-rose-gold" />
                        <span className="text-sm font-medium text-charcoal-500 uppercase tracking-wider">Pending Payouts</span>
                    </div>
                    <p className="text-3xl font-bold text-charcoal-900">₱{(pendingPayouts || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-charcoal-400">In extraction queue</p>
                </div>

                {/* Security Hold */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm border-l-4 border-l-rose-gold">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-rose-gold" />
                        <span className="text-sm font-bold text-rose-gold uppercase tracking-wider">Security Hold</span>
                    </div>
                    <p className="text-3xl font-bold text-charcoal-900">₱{(pendingBalance || 0).toLocaleString()}</p>
                    <p className="text-xs mt-2 text-charcoal-400">Unlocking within 24 hours</p>
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
                                recentTransactions.map((tx: any, i: number) => (
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
                                                ${tx.status === 'approved' || tx.status === 'processed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : tx.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }
                                            `}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-bold text-right ${tx.total_amount > 0 ? 'text-green-600' : 'text-charcoal-900'}`}>
                                            {tx.total_amount > 0 ? '+' : ''}₱{Math.abs(tx.total_amount).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center mb-4">
                                                <Wallet className="w-8 h-8 text-rose-gold" />
                                            </div>
                                            <p className="text-charcoal-900 font-serif text-lg mb-1">Elite Vault</p>
                                            <p className="text-charcoal-500 text-sm max-w-xs mx-auto">
                                                Your earnings history will appear here once your first session is completed.
                                            </p>
                                        </div>
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
