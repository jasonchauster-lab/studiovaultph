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
            <button disabled className="w-full mt-2 py-3.5 px-6 bg-walking-vinnie text-burgundy rounded-lg text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 border border-walking-vinnie/60 cursor-default shadow-tight">
                <Check className="w-4 h-4" />
                Request Sent
            </button>
        )
    }

    if (status === 'selecting') {
        return (
            <div className="w-full mt-3 flex flex-col gap-y-3 animate-in fade-in zoom-in duration-300">
                <div className="bg-off-white p-4 rounded-xl border border-burgundy/10 shadow-tight">
                    <p className="text-[10px] font-bold text-muted-burgundy mb-3 uppercase tracking-widest px-1">Select Equipment</p>
                    <select
                        value={selectedEquipment}
                        onChange={(e) => setSelectedEquipment(e.target.value)}
                        className="w-full text-[11px] font-bold p-3 rounded-lg border border-burgundy/15 bg-white text-burgundy focus:ring-2 focus:ring-burgundy/30 focus:border-burgundy/40 outline-none transition-all appearance-none cursor-pointer"
                    >
                        {availableEquipment.map(eq => (
                            <option key={eq} value={eq}>{eq}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-2.5">
                    <button
                        onClick={() => setStatus('idle')}
                        className="flex-1 py-3 px-4 bg-white border-2 border-burgundy/20 text-muted-burgundy rounded-lg text-[11px] font-bold uppercase tracking-widest hover:border-burgundy/40 hover:bg-off-white transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBook}
                        disabled={loading}
                        className="flex-1 py-3 px-4 bg-forest text-white rounded-lg text-[11px] font-bold uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all shadow-tight"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full mt-3">
            <button
                onClick={handleInitialClick}
                disabled={loading}
                className={`w-full py-3.5 px-6 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center shadow-tight ${status === 'error'
                        ? 'bg-red-50 text-red-500 border border-red-200'
                        : 'bg-forest text-white hover:brightness-110'
                    }`}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (status === 'error' ? 'Retry' : 'Book Now')}
            </button>
            {status === 'error' && errorMessage && (
                <p className="text-[10px] font-bold text-red-500 mt-2 text-center animate-in fade-in slide-in-from-top-1">
                    {errorMessage}
                </p>
            )}
        </div>
    )
}
