import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import WalletSettingsClient from './WalletSettingsClient'

export default async function StudioWalletSettingsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch Studio
    const { data: studio, error } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)
        .single()

    if (error || !studio) {
        return <div className="p-8 text-charcoal-500 text-center">Studio not found.</div>
    }

    return (
        <StudioDashboardShell 
            title="Wallet Settings"
            breadcrumbs={[
                { label: 'Settings', href: '/studio/settings' },
                { label: 'Wallet' }
            ]}
        >
            <WalletSettingsClient studio={studio} />
        </StudioDashboardShell>
    )
}
