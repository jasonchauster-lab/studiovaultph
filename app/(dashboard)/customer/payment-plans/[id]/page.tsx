import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, ShieldCheck, MapPin } from 'lucide-react'
import PlanPaymentForm from '@/components/customer/PlanPaymentForm'
import ExpandableImage from '@/components/ui/ExpandableImage'
import XenditStatusPolling from '@/components/customer/XenditStatusPolling'

export default async function PlanCheckoutPage(props: {
    params: Promise<{ id: string }>
}) {
    const { id } = await props.params
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) redirect('/login')

    // 1. Fetch the Customer Plan
    const { data: plan, error: pErr } = await supabase
        .from('customer_plans')
        .select(`
            *,
            packages (name, description, price, credits, validity_days),
            memberships (name, description, price, credits, validity_days)
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

    if (pErr || !plan) {
        console.error('[PlanCheckoutPage] Error fetching plan:', pErr)
        return notFound()
    }

    // 2. Fetch Studio Details
    const { data: studio, error: sErr } = await supabase
        .from('studios')
        .select('*')
        .eq('id', plan.studio_id)
        .single()

    if (sErr || !studio) {
        console.error('[PlanCheckoutPage] Error fetching studio:', sErr)
        return notFound()
    }

    const planDetails = plan.packages || plan.memberships
    const studioConfig = studio.website_config || {}
    const theme = studioConfig.theme || { primaryColor: '#2D3282' }

    const isXendit = plan.payment_method === 'xendit' && plan.xendit_checkout_url
    const manualMethods = studio.manual_payment_methods || []

    return (
        <div 
            className="min-h-screen pt-32 pb-24 px-6 md:px-12"
            style={{ 
                '--primary-brand': theme.primaryColor,
                backgroundColor: '#FBF9F6' 
            } as any}
        >
            <div className="max-w-4xl mx-auto">
                <Link 
                    href={studio.slug ? `/s/${studio.slug}/dashboard` : "/customer"} 
                    className="inline-flex items-center text-charcoal-400 hover:text-charcoal-900 mb-12 text-[10px] font-black uppercase tracking-widest transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Left Column: Plan Details & Instructions */}
                    <div className="space-y-12">
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-5xl font-serif font-black text-charcoal-900 leading-tight">
                                Finalize your purchase
                            </h1>
                            <p className="text-charcoal-500 text-sm leading-relaxed max-w-sm">
                                You are purchasing the <strong>{planDetails?.name}</strong> from {studio.name}. 
                                Please complete the payment below to activate your plan.
                            </p>
                        </div>

                        {/* Payment Interface */}
                        <div className="space-y-8">
                            <h3 className="font-bold text-charcoal-900 uppercase tracking-widest text-xs">
                                {isXendit ? 'Secure Checkout' : 'Payment Instructions'}
                            </h3>
                            
                            {isXendit ? (
                                <XenditStatusPolling 
                                    planId={plan.id} 
                                    checkoutUrl={plan.xendit_checkout_url} 
                                />
                            ) : (
                                <div className="grid grid-cols-2 gap-6">
                                    {manualMethods.length > 0 ? manualMethods.map((method: any, idx: number) => (
                                        <div key={idx} className="space-y-4">
                                            <div className="aspect-square bg-white rounded-3xl p-4 shadow-tight border border-charcoal-50 flex items-center justify-center overflow-hidden">
                                                <ExpandableImage 
                                                    src={method.qr_code_url} 
                                                    bucket="studios"
                                                    alt={`${method.type} QR`} 
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-charcoal-900 text-[10px] uppercase tracking-widest">{method.type}</p>
                                                <p className="text-[10px] text-charcoal-500 font-medium mt-1">{method.recipient_name}</p>
                                                <p className="text-[10px] text-charcoal-400 font-mono mt-0.5">{method.account_number}</p>
                                                <p className="text-[9px] text-zinc-400 mt-2 uppercase tracking-tighter">Scan to pay</p>
                                            </div>
                                        </div>
                                    )) : (
                                        // Fallback legacy
                                        <>
                                            <div className="space-y-4">
                                                <div className="aspect-square bg-white rounded-3xl p-4 shadow-tight border border-charcoal-50 flex items-center justify-center overflow-hidden">
                                                    <ExpandableImage 
                                                        src="/gcash-qr.jpg" 
                                                        alt="GCash QR" 
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-bold text-charcoal-900 text-[10px] uppercase tracking-widest">GCash</p>
                                                    <p className="text-[10px] text-charcoal-400 mt-1">Scan to pay</p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="aspect-square bg-white rounded-3xl p-4 shadow-tight border border-charcoal-50 flex items-center justify-center overflow-hidden">
                                                    <ExpandableImage 
                                                        src="/bpi-qr.jpg" 
                                                        alt="BPI QR" 
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-bold text-charcoal-900 text-[10px] uppercase tracking-widest">BPI</p>
                                                    <p className="text-[10px] text-charcoal-400 mt-1">Scan to pay</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Trust Badges */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-charcoal-50 shadow-sm">
                                <div className="w-10 h-10 bg-forest/10 rounded-xl flex items-center justify-center text-forest">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-charcoal-900">Secure Verification</p>
                                    <p className="text-[10px] text-charcoal-500">Your proof will be reviewed within 24h</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-charcoal-50 shadow-sm">
                                <div className="w-10 h-10 bg-rose-gold/10 rounded-xl flex items-center justify-center text-rose-gold">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-charcoal-900">Studio Location</p>
                                    <p className="text-[10px] text-charcoal-500">{studio.address || studio.location}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Checkout Form */}
                    <div>
                        {isXendit ? (
                            <div className="bg-white rounded-[32px] border border-charcoal-100 p-8 shadow-tight text-center">
                                <CreditCard className="w-12 h-12 text-charcoal-900 mx-auto mb-6" />
                                <h3 className="text-xl font-serif font-black text-charcoal-900 mb-4">Complete Payment on Xendit</h3>
                                <p className="text-sm text-charcoal-500 mb-8 leading-relaxed">
                                    Please use the button on the left to complete your payment on our secure payment gateway. 
                                    Once paid, your plan will be activated immediately.
                                </p>
                            </div>
                        ) : (
                            <PlanPaymentForm plan={plan} studio={studio} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
