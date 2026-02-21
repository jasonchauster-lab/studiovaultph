import { getCustomerWalletDetails } from '../actions'
import PayoutForm from './PayoutForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function CustomerPayoutPage() {
    const { available, error } = await getCustomerWalletDetails()

    if (error) {
        return <div className="p-8">Error loading wallet information.</div>
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Link href="/customer/wallet" className="inline-flex items-center gap-2 text-charcoal-600 hover:text-charcoal-900 mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Wallet
            </Link>

            <PayoutForm availableBalance={available || 0} />
        </div>
    )
}
