import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BillingSettingsClient from './BillingSettingsClient'

export default async function BillingSettingsPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) {
        redirect('/login')
    }

    // Fetch studio — whitelist columns to prevent leakage of internal config
    const { data: studio, error } = await supabase
        .from('studios')
        .select('id, name, owner_id, subscription_tier, billing_cycle, next_billing_date, logo_url, business_contact_email')
        .eq('owner_id', user.id)
        .maybeSingle()

    if (error || !studio) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <p className="text-charcoal-500 text-sm">Studio not found. Please contact support.</p>
                    <Link href="/studio/settings" className="inline-flex items-center gap-2 text-xs font-bold text-[#2D3282] hover:underline">
                        <ArrowLeft className="w-4 h-4" /> Back to Settings
                    </Link>
                </div>
            </div>
        )
    }

    // Fetch outlets count for billing display
    const { count: locationCount } = await supabase
        .from('outlets')
        .select('id', { count: 'exact', head: true })
        .eq('studio_id', studio.id)

    return (
        <div className="space-y-10 py-6 sm:py-10 max-w-5xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-charcoal-400">
                <Link href="/studio/settings" className="hover:text-charcoal-700 transition-colors font-medium">Settings</Link>
                <span className="text-charcoal-200">›</span>
                <span className="text-charcoal-700 font-bold">Billing</span>
            </div>

            {/* Title */}
            <div>
                <h1 className="text-3xl sm:text-4xl font-serif text-charcoal-900 font-bold tracking-tight">Billing</h1>
                <p className="text-charcoal-500 text-sm mt-1">
                    Manage your <span className="text-[#2D3282] font-semibold">billing</span> information and view your <span className="text-[#2D3282] font-semibold">invoices</span>.
                </p>
            </div>

            <BillingSettingsClient 
                studio={studio} 
                locationCount={locationCount || 1} 
            />
        </div>
    )
}
