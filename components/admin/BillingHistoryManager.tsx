'use client'

import React, { useState } from 'react'
import { Receipt } from 'lucide-react'
import BillingHistoryModal from './BillingHistoryModal'

interface BillingHistoryManagerProps {
    studioId: string
    studioName: string
}

export default function BillingHistoryManager({ studioId, studioName }: BillingHistoryManagerProps) {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-burgundy/60 text-[9px] font-black rounded-lg transition-all tracking-widest uppercase shadow-sm border border-stone-200"
            >
                <Receipt className="w-3.5 h-3.5" />
                Billing
            </button>

            {isOpen && (
                <BillingHistoryModal 
                    studioId={studioId} 
                    studioName={studioName} 
                    onClose={() => setIsOpen(false)} 
                />
            )}
        </>
    )
}
