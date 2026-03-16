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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-charcoal/20 backdrop-blur-md animate-in fade-in duration-500">
            <div
                className="glass-card w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500 rounded-[12px] bg-white/95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-[var(--airy-border)] flex justify-between items-center bg-white/40">
                    <h3 className="text-xl font-serif text-charcoal tracking-tighter">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-charcoal/5 rounded-full transition-colors text-charcoal/50 hover:text-charcoal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <p className="text-[11px] text-charcoal/60 leading-relaxed uppercase tracking-wider">
                        {description}
                    </p>

                    {penaltyNotice && (
                        <div className="flex gap-4 p-4 bg-red-50/30 border border-red-100/50 rounded-[12px] text-red-500 text-[10px] items-start">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <p className="font-black uppercase tracking-[0.1em]">{penaltyNotice}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="block text-[9px] font-black text-charcoal/40 uppercase tracking-[0.4em]">
                            Cancellation Reason <span className="text-red-300">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="State your reason for record keeping..."
                            className="w-full min-h-[120px] p-4 text-[11px] bg-white/40 border border-[var(--airy-border)] rounded-[12px] focus:ring-0 focus:border-gold/40 outline-none transition-all placeholder:text-charcoal/10 text-charcoal uppercase tracking-wider"
                            autoFocus
                        />
                        {error && (
                            <p className="text-[9px] text-red-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5" /> {error}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-white/40 border-t border-[var(--airy-border)] flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 bg-white border border-[var(--airy-border)] text-charcoal/40 rounded-[12px] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-charcoal/5 transition-all"
                    >
                        Retain Slot
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting || !reason.trim()}
                        className="flex-1 px-6 py-4 bg-red-500 text-white rounded-[12px] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-red-600 transition-all shadow-md active:scale-95 disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-3"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Confirm Termination'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
