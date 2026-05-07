import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { BadgeCheck, CreditCard, ShieldCheck, Wallet } from 'lucide-react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import PaymentMethodsSettings from '@/components/studio/PaymentMethodsSettings'
import OnlineStorePageIntro from '@/components/studio/OnlineStorePageIntro'
import { getCachedStudio } from '@/lib/studio/data'
import { maskSecretKey } from '@/lib/utils/security'

/**
 * Payments Configuration Page (Security Hardened)
 * 
 * Security: Masks secret API keys on the server before sending to the client.
 */
export default async function PaymentsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const studio = await getCachedStudio()
    if (!studio) notFound()

    // Fetch secure payment config
    const { data: paymentConfig } = await supabase
        .from('studio_payment_configs')
        .select('*')
        .eq('id', studio.id)
        .single()

    const manualMethods = Array.isArray(studio.manual_payment_methods) ? studio.manual_payment_methods : []
    const checkoutCount = (studio.enable_xendit ? 1 : 0) + manualMethods.length

    // SECURITY: Mask keys on the server so they never reach the client as plain text
    const studioWithConfig = {
        ...studio,
        xendit_api_key: maskSecretKey(paymentConfig?.xendit_api_key),
        xendit_callback_token: maskSecretKey(paymentConfig?.xendit_callback_token)
    }

    return (
        <StudioDashboardShell
            title="Payments"
            description="Configure how customers pay when they book classes or purchase memberships."
            breadcrumbs={[
                { label: 'Online Store', href: '/studio/online-store' },
                { label: 'Payments' },
            ]}
        >
            <div className="space-y-8">
                <OnlineStorePageIntro
                    eyebrow="Commerce"
                    title="Set up checkout with the payment methods your customers trust."
                    description="Use automatic checkout for a smoother purchase flow, or add manual payment methods for local wallets. These settings are server-hardened for your security."
                    primaryAction={{ label: 'Back To Overview', href: '/studio/online-store' }}
                    secondaryAction={{ label: 'Open Visual Editor', href: '/studio/website' }}
                    metrics={[
                        { label: 'Checkout Methods', value: String(checkoutCount) },
                        { label: 'Manual Methods', value: String(manualMethods.length) },
                    ]}
                    aside={
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                                <CreditCard className="h-4 w-4" />
                                Security Notes
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 rounded-xl bg-emerald-50 p-2 text-emerald-600">
                                        <ShieldCheck className="h-4 w-4" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-zinc-900">Key Protection</p>
                                        <p className="text-xs leading-relaxed text-zinc-500">Your API keys are encrypted at rest and masked in the UI. They are never sent as plain text to the browser.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                />

                <PaymentMethodsSettings studio={studioWithConfig as any} />
            </div>
        </StudioDashboardShell>
    )
}
