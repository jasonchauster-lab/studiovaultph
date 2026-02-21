'use client'

import { useState } from 'react'
import { requestCustomerPayout } from '../actions'
import { Loader2, AlertCircle, CheckCircle, Wallet } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PayoutForm({ availableBalance }: { availableBalance: number }) {
    const [amount, setAmount] = useState<string>('')
    const [method, setMethod] = useState<'bank' | 'gcash'>('bank')
    const [details, setDetails] = useState({
        accountName: '',
        accountNumber: '',
        bankName: ''
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsLoading(true)

        const payoutAmount = parseFloat(amount)

        if (isNaN(payoutAmount) || payoutAmount <= 0) {
            setError('Please enter a valid amount.')
            setIsLoading(false)
            return
        }

        if (payoutAmount > availableBalance) {
            setError('Insufficient funds.')
            setIsLoading(false)
            return
        }

        if (!details.accountName || !details.accountNumber || (method === 'bank' && !details.bankName)) {
            setError('Please fill in all payment details.')
            setIsLoading(false)
            return
        }

        try {
            const result = await requestCustomerPayout(payoutAmount, method, details)

            if (result.error) {
                setError(result.error)
            } else {
                setSuccess(true)
                setAmount('')
                router.refresh()
            }
        } catch (err) {
            setError('An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="bg-green-50 p-8 rounded-xl border border-green-200 text-center max-w-md mx-auto">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-serif text-green-900 mb-2">Request Submitted!</h2>
                <p className="text-green-700 mb-6">
                    Your payout request has been received and will be processed shortly.
                </p>
                <button
                    onClick={() => {
                        setSuccess(false)
                        router.push('/customer/wallet')
                    }}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                    Back to Wallet
                </button>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-cream-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-cream-100">
                <div className="bg-charcoal-100 p-3 rounded-full">
                    <Wallet className="w-6 h-6 text-charcoal-600" />
                </div>
                <div>
                    <h2 className="text-xl font-medium text-charcoal-900">Request Payout</h2>
                    <p className="text-charcoal-500 text-sm">Withdraw your wallet balance to your account.</p>
                </div>
            </div>

            <div className="bg-cream-50 p-4 rounded-lg mb-8 flex justify-between items-center border border-cream-200">
                <span className="text-charcoal-600 font-medium">Available to Withdraw</span>
                <span className="text-xl font-bold text-charcoal-900">₱{availableBalance.toLocaleString()}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-2">Amount to Withdraw (₱)</label>
                    <input
                        type="number"
                        min="1"
                        max={availableBalance}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 outline-none transition-all text-charcoal-900 bg-white placeholder-charcoal-400"
                        placeholder="0.00"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setMethod('bank')}
                            className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${method === 'bank'
                                ? 'border-charcoal-900 bg-charcoal-50 text-charcoal-900'
                                : 'border-cream-200 hover:border-charcoal-300 text-charcoal-500'
                                }`}
                        >
                            <span className="font-medium">Bank Transfer</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMethod('gcash')}
                            className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${method === 'gcash'
                                ? 'border-blue-600 bg-blue-50 text-blue-900'
                                : 'border-cream-200 hover:border-blue-300 text-charcoal-500'
                                }`}
                        >
                            <span className="font-medium">GCash</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {method === 'bank' && (
                        <div>
                            <label className="block text-sm font-medium text-charcoal-700 mb-2">Bank Name</label>
                            <input
                                type="text"
                                value={details.bankName}
                                onChange={(e) => setDetails({ ...details, bankName: e.target.value })}
                                className="w-full p-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 outline-none text-charcoal-900 bg-white placeholder-charcoal-400"
                                placeholder="e.g. BDO, BPI"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">Account Name</label>
                        <input
                            type="text"
                            value={details.accountName}
                            onChange={(e) => setDetails({ ...details, accountName: e.target.value })}
                            className="w-full p-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 outline-none text-charcoal-900 bg-white placeholder-charcoal-400"
                            placeholder="Account Holder Name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-charcoal-700 mb-2">Account Number</label>
                        <input
                            type="text"
                            value={details.accountNumber}
                            onChange={(e) => setDetails({ ...details, accountNumber: e.target.value })}
                            className="w-full p-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-charcoal-500 outline-none text-charcoal-900 bg-white placeholder-charcoal-400"
                            placeholder="0000 0000 0000"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading || !amount || parseFloat(amount) > availableBalance}
                    className="w-full bg-charcoal-900 text-cream-50 py-4 rounded-lg font-medium hover:bg-charcoal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Request'}
                </button>
            </form>
        </div>
    )
}
