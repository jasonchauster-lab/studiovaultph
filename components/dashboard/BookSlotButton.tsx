'use client'

import { useState } from 'react'
import { bookSlot } from '@/app/(dashboard)/instructor/actions'
import { Loader2, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function BookSlotButton({ slotId, availableEquipment }: { slotId: string, availableEquipment: string[] }) {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'selecting' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')
    const [selectedEquipment, setSelectedEquipment] = useState<string>('')
    const router = useRouter()

    const handleInitialClick = () => {
        if (availableEquipment.length === 1) {
            // If only one option, select it and book immediately (or maybe just select and ask for confirm? Let's auto-select but still confirm for clarity? No, let's just book)
            // Actually, the user request says "let the instructor choose". If only 1, choice is trivial. 
            // Let's create a flow: 
            // 1. "Request to Book" -> 2. "Select Equipment" (if >1) OR Confirm (if 1).
            // Simpler: Always show selection if > 0.
            if (availableEquipment.length > 0) {
                setSelectedEquipment(availableEquipment[0])
                setStatus('selecting')
            } else {
                // No specific equipment listed? Just book.
                handleBook()
            }
        } else if (availableEquipment.length > 1) {
            setSelectedEquipment(availableEquipment[0])
            setStatus('selecting')
        } else {
            handleBook()
        }
    }

    const handleBook = async () => {
        setLoading(true)
        setErrorMessage('')

        try {
            const result = await bookSlot(slotId, selectedEquipment)

            if (result.error) {
                setStatus('error')
                setErrorMessage(result.error)
                // Reset error after 3 seconds
                setTimeout(() => {
                    setStatus('idle')
                    setErrorMessage('')
                }, 3000)
            } else if (result.bookingId) {
                setStatus('success')
                // Redirect to payment page
                import('next/navigation').then(({ useRouter }) => {
                    // We need router logic inside component.
                    // Refactor: We can't import hooks inside async function easily.
                    // We need to use router from top level.
                });
                window.location.href = `/instructor/payment/${result.bookingId}`;
            } else {
                setStatus('success')
            }
        } catch (err) {
            setStatus('error')
            setErrorMessage('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    if (status === 'success') {
        return (
            <button disabled className="w-full mt-2 py-2 px-4 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 cursor-default">
                <Check className="w-4 h-4" />
                Request Sent
            </button>
        )
    }

    if (status === 'selecting') {
        return (
            <div className="w-full mt-2 space-y-2 animate-in fade-in zoom-in duration-200">
                <div className="bg-cream-50 p-2 rounded-lg border border-cream-200">
                    <p className="text-xs font-medium text-charcoal-600 mb-1.5 px-0.5">Select Equipment:</p>
                    <select
                        value={selectedEquipment}
                        onChange={(e) => setSelectedEquipment(e.target.value)}
                        className="w-full text-sm p-1.5 rounded border border-cream-300 bg-white text-charcoal-900 focus:ring-1 focus:ring-charcoal-500 outline-none"
                    >
                        {availableEquipment.map(eq => (
                            <option key={eq} value={eq}>{eq}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setStatus('idle')}
                        className="flex-1 py-1.5 px-2 bg-white border border-cream-300 text-charcoal-600 rounded text-xs font-medium hover:bg-cream-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBook}
                        disabled={loading}
                        className="flex-1 py-1.5 px-2 bg-charcoal-900 text-cream-50 rounded text-xs font-medium hover:bg-charcoal-800 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Confirm'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full mt-2">
            <button
                onClick={handleInitialClick}
                disabled={loading}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all focus:ring-2 focus:ring-charcoal-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center ${status === 'error'
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-charcoal-900 text-cream-50 hover:bg-charcoal-800'
                    }`}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (status === 'error' ? 'Retry' : 'Request to Book')}
            </button>
            {status === 'error' && errorMessage && (
                <p className="text-xs text-red-600 mt-1 text-center animate-in fade-in slide-in-from-top-1">
                    {errorMessage}
                </p>
            )}
        </div>
    )
}
