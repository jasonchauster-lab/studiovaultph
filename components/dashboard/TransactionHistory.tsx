'use client'

import { useState } from 'react'
import { User, CheckCircle, Clock, XCircle } from 'lucide-react'

interface TransactionHistoryProps {
    bookings: {
        id: string;
        created_at: string;
        client: { full_name: string } | null;
        slots: { start_time: string };
        price_breakdown: { studio_fee?: number; quantity?: number; equipment?: string } | null;
        total_price?: number;
        equipment?: string;
    }[]
    payouts: {
        id: string;
        created_at: string;
        payment_method: string | null;
        payment_details: { account_name?: string; account_number?: string } | null;
        status: string;
        amount: number;
    }[]
}

export default function TransactionHistory({ bookings, payouts }: TransactionHistoryProps) {
    const [activeTab, setActiveTab] = useState<'bookings' | 'payouts'>('bookings')

    return (
        <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">
            <div className="border-b border-cream-200">
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'bookings'
                            ? 'border-charcoal-900 text-charcoal-900'
                            : 'border-transparent text-charcoal-500 hover:text-charcoal-700'
                            }`}
                    >
                        Income (Bookings)
                    </button>
                    <button
                        onClick={() => setActiveTab('payouts')}
                        className={`px-6 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'payouts'
                            ? 'border-charcoal-900 text-charcoal-900'
                            : 'border-transparent text-charcoal-500 hover:text-charcoal-700'
                            }`}
                    >
                        Withdrawals (Payouts)
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                {activeTab === 'bookings' ? (
                    <table className="w-full text-left text-sm text-charcoal-600">
                        <thead className="bg-cream-50 text-charcoal-900 font-medium border-b border-cream-200">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Client / Instructor</th>
                                <th className="px-6 py-4">Session Info</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cream-100">
                            {bookings.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-charcoal-500">
                                        No bookings found.
                                    </td>
                                </tr>
                            ) : (
                                bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-cream-50/50">
                                        <td className="px-6 py-4">
                                            {new Date(booking.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-charcoal-400" />
                                                <span className="font-medium text-charcoal-900">
                                                    {booking.client?.full_name || 'Unknown'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="text-xs text-charcoal-500">
                                                    {new Date(booking.slots.start_time).toLocaleString(undefined, {
                                                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                                    })}
                                                </div>
                                                <div className="text-[10px] text-charcoal-400 font-medium">
                                                    {(booking.price_breakdown?.quantity || 1)} x {(booking.price_breakdown?.equipment || booking.equipment || 'Unknown')}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600">
                                            +₱{(booking.price_breakdown?.studio_fee || (booking.total_price ? Math.max(0, booking.total_price - 100) : 0)).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left text-sm text-charcoal-600">
                        <thead className="bg-cream-50 text-charcoal-900 font-medium border-b border-cream-200">
                            <tr>
                                <th className="px-6 py-4">Date Requested</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cream-100">
                            {payouts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-charcoal-500">
                                        No payout requests found.
                                    </td>
                                </tr>
                            ) : (
                                payouts.map((payout) => (
                                    <tr key={payout.id} className="hover:bg-cream-50/50">
                                        <td className="px-6 py-4">
                                            {new Date(payout.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 capitalize">
                                            {payout.payment_method?.replace('_', ' ')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs">
                                                {/* Check if payment_details exists before accessing */}
                                                <p><span className="text-charcoal-400">Acct:</span> {payout.payment_details?.account_name || '-'}</p>
                                                <p><span className="text-charcoal-400">No:</span> {payout.payment_details?.account_number || '-'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${payout.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                payout.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                                    payout.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {payout.status === 'paid' && <CheckCircle className="w-3 h-3" />}
                                                {payout.status === 'pending' && <Clock className="w-3 h-3" />}
                                                {payout.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                                {payout.status?.charAt(0).toUpperCase() + payout.status?.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-charcoal-900">
                                            ₱{payout.amount?.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
