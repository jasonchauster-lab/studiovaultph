'use client'

import { useState } from 'react'
import { bookSlot } from '@/app/(dashboard)/instructor/actions'
import { Loader2, Check, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BookSlotGroupProps {
    startTime: string; // Display string
    endTime: string;   // Display string
    slots: {           // Raw slots in this group
        id: string;
        equipment?: string[];
    }[];
}

export default function BookSlotGroup({ startTime, endTime, slots }: BookSlotGroupProps) {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<'idle' | 'selecting' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    // Selection state
    const [selectedEquipment, setSelectedEquipment] = useState<string>('')
    const [quantity, setQuantity] = useState<number>(1)

    const router = useRouter()

    // 1. Aggregate Equipment Counts
    const equipmentCounts: Record<string, number> = {};
    slots.forEach(slot => {
        if (slot.equipment) {
            slot.equipment.forEach(eq => {
                equipmentCounts[eq] = (equipmentCounts[eq] || 0) + 1;
            });
        }
    });

    const equipmentTypes = Object.keys(equipmentCounts);

    // Initial click handler
    const handleStart = () => {
        if (equipmentTypes.length > 0) {
            setSelectedEquipment(equipmentTypes[0])
            setQuantity(1)
        }
        setStatus('selecting')
    }

    const handleBook = async () => {
        if (!selectedEquipment) return;

        setLoading(true)
        setErrorMessage('')

        try {
            // Find a valid slot ID to start the chain
            // Ideally we pick one that has the equipment
            const validSlot = slots.find(s => s.equipment?.includes(selectedEquipment));

            if (!validSlot) {
                setErrorMessage('No slot found for this equipment (unexpected).');
                setLoading(false);
                return;
            }

            const result = await bookSlot(validSlot.id, selectedEquipment, quantity)

            if (result.error) {
                setStatus('error')
                setErrorMessage(result.error)
                setTimeout(() => {
                    setStatus('idle') // Return to idle or selecting? Idle clears error better visually
                    setErrorMessage('')
                }, 4000)
            } else if (result.bookingId) {
                setStatus('success')
                router.push(`/instructor/payment/${result.bookingId}`)
            }
        } catch (err) {
            setStatus('error')
            setErrorMessage('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const maxQuantity = selectedEquipment ? equipmentCounts[selectedEquipment] : 1;

    // --- Render ---

    if (status === 'success') {
        return (
            <div className="bg-white border border-green-200 rounded-lg p-3 shadow-sm flex flex-col items-center justify-center gap-2 h-full">
                <div className="text-sm font-medium text-charcoal-900">
                    {startTime} - {endTime}
                </div>
                <div className="w-full py-2 px-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Booked!
                </div>
            </div>
        )
    }

    if (status === 'selecting') {
        return (
            <div className="bg-white border border-charcoal-200 rounded-lg p-3 shadow-md flex flex-col gap-3 h-full animate-in fade-in zoom-in duration-200">
                <div className="text-sm font-medium text-charcoal-900 text-center border-b border-cream-100 pb-2">
                    {startTime} - {endTime}
                </div>

                <div className="space-y-3">
                    {/* Equipment Selector */}
                    <div>
                        <label className="text-xs font-medium text-charcoal-500 block mb-1">Equipment</label>
                        <select
                            value={selectedEquipment}
                            onChange={(e) => {
                                setSelectedEquipment(e.target.value);
                                setQuantity(1); // Reset qty when eq changes
                            }}
                            className="w-full text-sm p-2 rounded border border-cream-300 bg-white text-charcoal-900 outline-none focus:border-charcoal-500"
                        >
                            {equipmentTypes.map(eq => (
                                <option key={eq} value={eq}>
                                    {eq} ({equipmentCounts[eq]} avail)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Quantity Selector */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-medium text-charcoal-500">Quantity</label>
                            <span className="text-[10px] text-charcoal-400">Max: {maxQuantity}</span>
                        </div>
                        <input
                            type="number"
                            min="1"
                            max={maxQuantity}
                            value={quantity}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) {
                                    if (val > maxQuantity) setQuantity(maxQuantity);
                                    else if (val < 1) setQuantity(1);
                                    else setQuantity(val);
                                }
                            }}
                            className="w-full text-sm p-2 rounded border border-cream-300 bg-white text-charcoal-900 outline-none focus:border-charcoal-500"
                        />
                    </div>
                </div>

                <div className="flex gap-2 mt-auto pt-2">
                    <button
                        onClick={() => setStatus('idle')}
                        className="flex-1 py-1.5 px-2 bg-white border border-cream-300 text-charcoal-600 rounded text-xs font-medium hover:bg-cream-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBook}
                        disabled={loading}
                        className="flex-1 py-1.5 px-2 bg-rose-gold text-white rounded text-xs font-bold hover:brightness-110 disabled:opacity-50 flex justify-center items-center gap-1 shadow-sm transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                            <>
                                Book <span className="opacity-75">({quantity})</span>
                            </>
                        )}
                    </button>
                </div>
                {errorMessage && (
                    <p className="text-xs text-red-600 text-center animate-in fade-in">{errorMessage}</p>
                )}
            </div>
        )
    }

    // IDLE STATE
    return (
        <div className="bg-white border border-cream-200 rounded-lg p-3 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-charcoal-300 transition-colors h-full">
            <div className="text-sm font-medium text-charcoal-900">
                {startTime} - {endTime}
            </div>

            {/* Availability Badge */}
            <div className="flex flex-wrap gap-1 justify-center max-w-[180px]">
                {equipmentTypes.slice(0, 2).map(eq => (
                    <span key={eq} className="text-[10px] bg-cream-100 text-charcoal-600 px-1.5 py-0.5 rounded-full">
                        {eq}: {equipmentCounts[eq]}
                    </span>
                ))}
                {equipmentTypes.length > 2 && (
                    <span className="text-[10px] bg-cream-100 text-charcoal-600 px-1.5 py-0.5 rounded-full">
                        +{equipmentTypes.length - 2} more
                    </span>
                )}
            </div>

            <button
                onClick={handleStart}
                className="w-full mt-1 py-2 px-4 bg-rose-gold text-white rounded-lg text-sm font-bold hover:brightness-110 transition-all active:scale-[0.98] shadow-sm"
            >
                Book Slot
            </button>
            {status === 'error' && errorMessage && (
                <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
            )}
        </div>
    )
}
