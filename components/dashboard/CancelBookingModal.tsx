'use client'

import { useState } from 'react'
import { X, AlertCircle, Loader2 } from 'lucide-react'

interface CancelBookingModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (reason: string) => Promise<{ success?: boolean, error?: string }>
    title: string
    description: string
    penaltyNotice?: string
}

export default function CancelBookingModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    penaltyNotice
}: CancelBookingModalProps) {
    const [reason, setReason] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleConfirm = async () => {
        if (!reason.trim()) {
            setError('Please provide a reason for cancellation.')
            return
        }

        setIsSubmitting(true)
        setError(null)
        try {
            const result = await onConfirm(reason)
            if (result.success) {
                onClose()
                setReason('')
            } else {
                setError(result.error || 'Failed to cancel booking.')
            }
        } catch (err) {
            setError('An unexpected error occurred.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-cream-100 flex justify-between items-center bg-cream-50/50">
                    <h3 className="text-xl font-serif font-bold text-charcoal-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-cream-100 rounded-full transition-colors text-charcoal-400"
                    >
                        <X className="w-5 h-5 text-charcoal-800" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 leading-relaxed">
                        {description}
                    </p>

                    {penaltyNotice && (
                        <div className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-800 text-xs">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <p className="font-medium">{penaltyNotice}</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-charcoal-800 uppercase tracking-wider">
                            Cancellation Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Schedule conflict, Studio maintenance, etc."
                            className="w-full min-h-[100px] p-3 text-sm bg-cream-50 border border-cream-200 rounded-xl focus:ring-2 focus:ring-rose-gold outline-none transition-all placeholder:text-charcoal-500 text-charcoal-900"
                            autoFocus
                        />
                        {error && (
                            <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {error}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-cream-50/50 border-t border-cream-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-white border border-cream-200 text-charcoal-800 rounded-xl text-sm font-bold hover:bg-cream-100 transition-colors"
                    >
                        Keep Booking
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting || !reason.trim()}
                        className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Cancelling...
                            </>
                        ) : (
                            'Confirm Cancellation'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
