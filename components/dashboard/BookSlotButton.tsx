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
            <button disabled className="w-full mt-2 py-4 px-6 bg-sage/10 text-sage rounded-[20px] text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-sage/20 cursor-default shadow-sm">
                <Check className="w-4 h-4" />
                Request Sent
            </button>
        )
    }

    if (status === 'selecting') {
        return (
            <div className="w-full mt-4 space-y-4 animate-in fade-in zoom-in duration-300">
                <div className="bg-white/40 backdrop-blur-md p-4 rounded-[20px] border border-white/60 shadow-cloud">
                    <p className="text-[10px] font-bold text-charcoal/40 mb-3 uppercase tracking-widest px-1">Select Equipment</p>
                    <select
                        value={selectedEquipment}
                        onChange={(e) => setSelectedEquipment(e.target.value)}
                        className="w-full text-[11px] font-bold p-3 rounded-xl border border-white/60 bg-white/50 text-charcoal focus:ring-1 focus:ring-sage focus:border-sage outline-none transition-all appearance-none cursor-pointer"
                    >
                        {availableEquipment.map(eq => (
                            <option key={eq} value={eq}>{eq}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setStatus('idle')}
                        className="flex-1 py-4 px-4 bg-white/50 border border-white/60 text-charcoal/60 rounded-[20px] text-[11px] font-bold uppercase tracking-widest hover:bg-white/80 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBook}
                        disabled={loading}
                        className="flex-1 py-4 px-4 bg-sage text-white rounded-[20px] text-[11px] font-bold uppercase tracking-widest hover:bg-sage/90 disabled:opacity-50 transition-all shadow-cloud shadow-sage/20"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full mt-4">
            <button
                onClick={handleInitialClick}
                disabled={loading}
                className={`w-full py-4 px-6 rounded-[20px] text-[11px] font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-cloud ${status === 'error'
                        ? 'bg-red-50 text-red-400 border border-red-100'
                        : 'bg-charcoal text-white hover:opacity-90'
                    }`}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (status === 'error' ? 'Retry' : 'Request to Book')}
            </button>
            {status === 'error' && errorMessage && (
                <p className="text-[10px] font-bold text-red-400 mt-2 text-center animate-in fade-in slide-in-from-top-1">
                    {errorMessage}
                </p>
            )}
        </div>
    )
}
