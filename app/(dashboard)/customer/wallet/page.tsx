import { getCustomerWalletDetails } from '../actions'
import CustomerWalletClient from '@/components/customer/CustomerWalletClient'

export default async function CustomerWalletPage() {
    // 1. Fetch data on the server
    const result = await getCustomerWalletDetails()

    let data = null;

    if (result.error) {
        data = { available: 0, pending: 0, transactions: [], error: result.error }
    } else {
        data = {
            available: result.available || 0,
            pending: result.pending || 0,
            transactions: result.transactions || [],
            error: null
        }
    }

    // 2. Pass pre-fetched data to the Client Component
    return <CustomerWalletClient data={data} />
}
