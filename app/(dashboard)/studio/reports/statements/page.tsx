import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getEarningsData } from '../../earnings/actions'
import StatementsPageClient from './StatementsPageClient'

export default async function StatementsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: studio } = await supabase
        .from('studios')
        .select('id, name')
        .eq('owner_id', user.id)
        .single()

    if (!studio) notFound()

    // Fetch data for the current month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    
    const { summary, transactions, error } = await getEarningsData(
        studio.id, 
        startOfMonth.toISOString().split('T')[0]
    )

    if (error) return <div className="p-8 text-red-600">Error loading statement: {error}</div>

    const statementData = {
        month: startOfMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        gross: summary?.totalEarnings || 0,
        compensation: summary?.totalCompensation || 0,
        penalty: summary?.totalPenalty || 0,
        net: summary?.netEarnings || 0,
        transactions: transactions || []
    }

    return (
        <SalesPageClientWrapper>
             <StatementsPageClient initialData={statementData} />
        </SalesPageClientWrapper>
    )
}

// Simple wrapper to ensure consistent layout if needed, though shell is already in client
function SalesPageClientWrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
