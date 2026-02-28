'use client'

import { useState } from 'react'
import { rejectBooking } from '@/app/(dashboard)/admin/actions'
import { Loader2, X, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RejectBookingButtonProps {
    id: string
    className?: string
    variant?: 'default' | 'refund' | 'no-refund'
}

export default function RejectBookingButton({ id, className, variant = 'default' }: RejectBookingButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [reason, setReason] = useState('')
    const router = useRouter()

    const handleReject = async (withRefund: boolean) => {
        if (!reason.trim()) return

        setIsLoading(true)
        try {
            const result = await rejectBooking(id, reason, withRefund)

            if (result?.error) {
                alert(result.error)
            } else {
                setIsOpen(false)
                setReason('')
                router.refresh()
            }
        } catch (error) {
            console.error(error)
            alert('An unexpected error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const buttonLabel = variant === 'refund'
        ? 'Decline with Refund'
        : variant === 'no-refund'
            ? 'Decline (No Refund)'
            : 'Decline'

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`flex items-center justify-center gap-2 ${className}`}
            >
                {buttonLabel}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-serif text-charcoal-900 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                {buttonLabel}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-charcoal-400 hover:text-charcoal-900"
                                disabled={isLoading}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-1">
                                    Reason for Rejection
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                    placeholder="e.g. Payment proof unclear, Studio fully booked, etc."
                                    className="w-full px-3 py-2 border border-cream-300 rounded-lg text-charcoal-900 outline-none focus:ring-2 focus:ring-charcoal-900 min-h-[100px] text-sm resize-none"
                                />
                            </div>

                            <div className="flex flex-col gap-2 pt-2">
                                {(variant === 'default' || variant === 'refund') && (
                                    <button
                                        type="button"
                                        onClick={() => handleReject(true)}
                                        disabled={isLoading || !reason.trim()}
                                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Confirm & Refund to Wallet
                                    </button>
                                )}
                                {(variant === 'default' || variant === 'no-refund') && (
                                    <button
                                        type="button"
                                        onClick={() => handleReject(false)}
                                        disabled={isLoading || !reason.trim()}
                                        className="w-full px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Confirm Without Refund
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    disabled={isLoading}
                                    className="w-full px-4 py-2 text-sm font-medium text-charcoal-600 hover:text-charcoal-900 mt-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
