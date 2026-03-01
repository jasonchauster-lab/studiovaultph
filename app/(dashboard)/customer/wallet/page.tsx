'use client'

import { getCustomerWalletDetails } from '../actions'
import { Wallet, ArrowUpRight, History, Clock, Info, X, ShieldCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { topUpWallet } from '../actions'
import { useRouter } from 'next/navigation'

export default function CustomerWalletPage() {
    const [data, setData] = useState<{ available: number, pending: number, transactions: any[], error: any } | null>(null)
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
            // Redirect to the new top-up payment page
            router.push(`/customer/payment/top-up/${result.topUpId}`)
        }
    }

    useEffect(() => {
        getCustomerWalletDetails().then((result) => {
            if (result.error) {
                setData({ available: 0, pending: 0, transactions: [], error: result.error })
            } else {
                setData({
                    available: result.available || 0,
                    pending: result.pending || 0,
                    transactions: result.transactions || [],
                    error: null
                })
            }
        })
    }, [])

    if (!data) return <div className="p-8">Loading wallet...</div>
    const { available, pending, transactions, error } = data

    if (error) {
        return (
            <div className="p-8 text-red-600">
                Failed to load wallet data. Please try again later.
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
                    <h1 className="text-3xl font-serif text-charcoal-900 mb-2">My Wallet</h1>
                    <p className="text-charcoal-600">Manage your balance for seamless bookings.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowTopUpModal(true)}
                        className="bg-rose-gold text-white px-6 py-3 rounded-lg font-medium hover:bg-rose-gold/90 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Top-Up Wallet
                    </button>
                    <Link
                        href="/customer/payout"
                        className="bg-charcoal-900 text-cream-50 px-6 py-3 rounded-lg font-medium hover:bg-charcoal-800 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                        Withdraw Funds
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                {/* Available Balance */}
                <div className="bg-charcoal-900 text-cream-50 p-6 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-white/5">
                        <Wallet className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 opacity-80">
                                <Wallet className="w-5 h-5" />
                                <span className="text-sm font-medium tracking-wide uppercase">Available Balance</span>
                            </div>
                            <button
                                onClick={() => setShowInfoModal(true)}
                                className="text-rose-gold hover:text-white transition-colors p-1"
                                title="Wallet Rules"
                            >
                                <Info className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-4xl font-serif mt-4">₱{(available || 0).toLocaleString()}</p>
                        <p className="text-xs mt-2 opacity-60">Applied to your next booking or withdrawable</p>
                    </div>
                </div>

                {/* Pending Balance */}
                {pending > 0 && (
                    <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm border-l-4 border-l-amber-400">
                        <div className="flex items-center gap-3 mb-2 text-amber-600">
                            <Clock className="w-5 h-5" />
                            <span className="text-sm font-medium tracking-wide uppercase">Pending (Verification)</span>
                        </div>
                        <p className="text-4xl font-serif text-charcoal-900 mt-4">₱{(pending || 0).toLocaleString()}</p>
                        <p className="text-xs mt-2 text-charcoal-400">Waiting for Admin to verify your top-up receipt</p>
                    </div>
                )}

                {/* Quick Info */}
                <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2 text-charcoal-500">
                        <History className="w-5 h-5" />
                        <span className="text-sm font-medium">How it works</span>
                    </div>
                    <ul className="text-sm text-charcoal-600 space-y-2 mt-2">
                        <li className="flex gap-2"><span className="text-charcoal-900">•</span> Early cancellations ({'>'}24h notice) are refunded instantly to your Available Balance.</li>
                        <li className="flex gap-2"><span className="text-charcoal-900">•</span> Wallet credits are used automatically on any new booking.</li>
                        <li className="flex gap-2"><span className="text-charcoal-900">•</span> You can withdraw your balance at any time.</li>
                    </ul>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-cream-100">
                    <h3 className="font-serif text-xl text-charcoal-900">Transaction History</h3>
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
                            {transactions && transactions.length > 0 ? (
                                transactions.map((tx, i) => (
                                    <tr key={i} className="hover:bg-cream-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-charcoal-600 border-b border-cream-50">
                                            {new Date(tx.date).toLocaleDateString()}
                                            <span className="block text-xs text-charcoal-400">
                                                {new Date(tx.date).toLocaleTimeString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-charcoal-900 border-b border-cream-50">
                                            {tx.type}
                                            {tx.details && (
                                                <span className="block text-xs text-charcoal-400 font-normal">
                                                    {tx.details}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 border-b border-cream-50">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${tx.status === 'completed' || tx.status === 'approved' || tx.status === 'processed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : tx.status === 'pending'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }
                                            `}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-medium text-right border-b border-cream-50 ${tx.amount > 0 ? 'text-green-600' : 'text-charcoal-900'}`}>
                                            {tx.amount > 0 ? '+' : ''}₱{Math.abs(tx.amount).toLocaleString()}
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
