'use client'

import { useState } from 'react'
import { requestPayout } from '@/app/(dashboard)/studio/earnings/actions'
import { X, Loader2 } from 'lucide-react'

interface PayoutRequestModalProps {
    studioId: string
    availableBalance: number
}

export default function PayoutRequestModal({ studioId, availableBalance }: PayoutRequestModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [paymentMethod, setPaymentMethod] = useState('bank_transfer')

    // Simple manual form handling
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)

        const formData = new FormData(e.currentTarget)
        formData.append('studioId', studioId)

        try {
            // @ts-ignore - simplistic invocation for now
            const result = await requestPayout(null, formData)

            if (result?.error) {
                setMessage({ type: 'error', text: result.error })
            } else if (result?.success) {
                setMessage({ type: 'success', text: result.message || 'Success!' })
                setTimeout(() => {
                    setIsOpen(false)
                    setMessage(null)
                    // Optional: reset form or just close
                }, 2000)
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                disabled={availableBalance <= 0}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${availableBalance > 0
                    ? 'bg-charcoal-900 text-cream-50 hover:bg-charcoal-800'
                    : 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                    }`}
            >
                Request Payout
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-cream-50/50">
                            <h3 className="text-lg font-serif text-charcoal-900">Request Payout</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-charcoal-900"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {message && (
                                <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${message.type === 'success'
                                    ? 'bg-green-50 text-green-700 border border-green-100'
                                    : 'bg-red-50 text-red-700 border border-red-100'
                                    }`}>
                                    <span>{message.text}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Amount (₱)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                                    <input
                                        name="amount"
                                        type="number"
                                        max={availableBalance}
                                        step="0.01"
                                        required
                                        defaultValue={availableBalance}
                                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-900 focus:border-charcoal-900 outline-none transition-all text-charcoal-900"
                                    />
                                </div>
                                <p className="text-xs text-charcoal-500 mt-1.5 font-medium">
                                    Available Balance: <span className="text-green-600">₱{availableBalance.toLocaleString()}</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Payment Method</label>
                                <select
                                    name="paymentMethod"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-900 focus:border-charcoal-900 outline-none bg-white transition-all text-charcoal-900"
                                >
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="gcash">GCash</option>
                                </select>
                            </div>

                            {paymentMethod === 'bank_transfer' && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Bank Name</label>
                                    <input
                                        name="bankName"
                                        type="text"
                                        required
                                        placeholder="e.g. BPI, BDO, Unionbank"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-900 focus:border-charcoal-900 outline-none transition-all text-charcoal-900"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Account Name</label>
                                <input
                                    name="accountName"
                                    type="text"
                                    required
                                    placeholder="Account Holder Name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-900 focus:border-charcoal-900 outline-none transition-all text-charcoal-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Account Number</label>
                                <input
                                    name="accountNumber"
                                    type="text"
                                    required
                                    placeholder="Account / Mobile Number"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-charcoal-900 focus:border-charcoal-900 outline-none transition-all text-charcoal-900"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-2.5 bg-charcoal-900 text-cream-50 rounded-lg font-medium hover:bg-charcoal-800 transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isLoading ? 'Processing Request...' : 'Submit Request'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    disabled={isLoading}
                                    className="w-full mt-2 py-2 text-sm text-charcoal-600 hover:text-charcoal-900 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
