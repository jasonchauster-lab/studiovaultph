'use client'

import { useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { topUpWallet } from '@/app/(dashboard)/customer/actions'
import { useRouter } from 'next/navigation'

export default function TopUpButton() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleTopUp = async () => {
        const amountStr = window.prompt('Enter amount to top up (PHP):')
        if (!amountStr) return

        const amount = parseFloat(amountStr)
        if (isNaN(amount) || amount <= 0) {
            alert('Invalid amount.')
            return
        }

        setIsLoading(true)
        const res = await topUpWallet(amount)
        setIsLoading(false)

        if (res.error) {
            alert(res.error)
        } else {
            alert(`Successfully topped up ₱${amount}`)
            router.refresh()
        }
    }

    return (
        <button
            onClick={handleTopUp}
            disabled={isLoading}
            className="bg-charcoal-900 text-cream-50 px-6 py-3 rounded-lg font-medium hover:bg-charcoal-800 transition-colors flex items-center gap-2 disabled:opacity-70"
        >
            <PlusCircle className="w-4 h-4" />
            {isLoading ? 'Processing...' : 'Top Up Wallet'}
        </button>
    )
}
