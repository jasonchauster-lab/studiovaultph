'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { 
    CreditCard, Download, ChevronRight, Pencil, Shield, 
    Zap, Sparkles, Crown, Calendar, Building2, 
    AlertTriangle, CheckCircle, Clock, Plus, X,
    Smartphone, Loader2, Check
} from 'lucide-react'
import clsx from 'clsx'
import { updateStudioPlan } from '@/app/(dashboard)/studio/studio-actions'

// ─── Plan Configuration ───
const PLANS = [
    {
        id: 'pro',
        name: 'Pro',
        monthlyPrice: 2500,
        annualPrice: 25000,
        icon: Sparkles,
        color: 'from-[#2D3282] to-[#1a1f5c]',
        badge: 'Popular',
        features: ['Up to 3 Locations', 'Staff Accounts', 'Advanced Reports', 'Custom Branding', 'Priority Support']
    },
    {
        id: 'premium',
        name: 'Premium',
        monthlyPrice: 4500,
        annualPrice: 45000,
        icon: Crown,
        color: 'from-[#2D3282] to-indigo-900',
        badge: 'Best Value',
        features: ['Unlimited Locations', 'Custom Domain', 'CMS Website Builder', 'API Access', 'All Pro Features']
    },
    {
        id: 'business',
        name: 'Business',
        monthlyPrice: 8000,
        annualPrice: 80000,
        icon: Building2,
        color: 'from-indigo-800 to-purple-900',
        badge: 'Enterprise',
        features: ['Everything in Premium', 'Dedicated Account Manager', 'Custom Integrations', 'SLA Guarantee', 'White-label Options']
    }
]

interface BillingSettingsClientProps {
    studio: any
    locationCount: number
}

export default function BillingSettingsClient({ studio, locationCount }: BillingSettingsClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [showPlanModal, setShowPlanModal] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [changingTo, setChangingTo] = useState<string | null>(null)

    const currentTier = studio.subscription_tier || studio.plan || 'starter'
    const currentPlan = PLANS.find(p => p.id === currentTier) || PLANS[0]
    const PlanIcon = currentPlan.icon
    const isTrial = studio.subscription_status === 'trial'
    const isActive = studio.subscription_status === 'active'

    // Calculate trial remaining days
    const trialEndsAt = studio.trial_ends_at ? new Date(studio.trial_ends_at) : null
    const now = new Date()
    const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
    const trialExpired = trialEndsAt ? trialEndsAt < now : false

    // Next billing date
    const nextBillingDate = studio.next_billing_date 
        ? new Date(studio.next_billing_date)
        : (trialEndsAt || null)

    const formatCurrency = (amount: number) => {
        return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }

    const formatDate = (date: Date | string) => {
        return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const handleChangePlan = async (newTier: string) => {
        setChangingTo(newTier)
        startTransition(async () => {
            const result = await updateStudioPlan(studio.id, newTier)
            if (result?.error) {
                alert(result.error)
            } else {
                setShowPlanModal(false)
                router.refresh()
            }
            setChangingTo(null)
        })
    }

    return (
        <div className="space-y-10">
            {/* ─── Trial Warning Banner ─── */}
            {isTrial && (
                <div className={clsx(
                    "flex items-start gap-4 p-5 rounded-2xl border backdrop-blur-sm",
                    trialDaysLeft <= 7 
                        ? "bg-amber-50/80 border-amber-200 text-amber-900" 
                        : "bg-indigo-50/80 border-indigo-100 text-[#2D3282]"
                )}>
                    <div className={clsx(
                        "p-2.5 rounded-xl flex-shrink-0",
                        trialDaysLeft <= 7 ? "bg-amber-100" : "bg-indigo-100"
                    )}>
                        {trialDaysLeft <= 7 
                            ? <AlertTriangle className="w-5 h-5" /> 
                            : <Clock className="w-5 h-5" />
                        }
                    </div>
                    <div>
                        <p className="text-sm font-bold">
                            {trialExpired 
                                ? 'Your free trial has ended' 
                                : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining in your free trial`
                            }
                        </p>
                        <p className="text-xs mt-1 opacity-80">
                            {trialExpired 
                                ? 'Add a payment method to continue using all features.' 
                                : `Your trial ends on ${formatDate(trialEndsAt!)}. Add a payment method to ensure uninterrupted service.`
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* ─── Plan & Next Payment Row ─── */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Current Plan Card */}
                <div className={clsx(
                    "relative md:col-span-3 rounded-2xl p-8 text-white overflow-hidden bg-gradient-to-br shadow-xl",
                    currentPlan.color
                )}>
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                    
                    <div className="relative z-10 space-y-5">
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-white/70">Current plan</p>
                        </div>
                        
                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl font-black tracking-tight">
                                {isTrial ? 'Free Trial' : formatCurrency(currentPlan.monthlyPrice)}
                            </span>
                            {isTrial && (
                                <span className="text-xs font-bold uppercase px-3 py-1 bg-white/20 rounded-full tracking-widest">Trial</span>
                            )}
                            {!isTrial && currentPlan.monthlyPrice > 0 && (
                                <span className="text-xs font-bold uppercase px-3 py-1 bg-white/20 rounded-full tracking-widest">Monthly</span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-white/80 text-sm">
                            <div className="flex items-center gap-1.5">
                                <PlanIcon className="w-4 h-4" />
                                <span className="font-bold">{currentPlan.name}</span>
                            </div>
                            <span className="text-white/30">|</span>
                            <span>{locationCount} location{locationCount !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            <button 
                                onClick={() => setShowPlanModal(true)}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all backdrop-blur-sm"
                            >
                                Change Plan
                            </button>
                            <button 
                                onClick={() => setShowPlanModal(true)}
                                className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all backdrop-blur-sm"
                            >
                                Add Location
                            </button>
                            {currentTier !== 'starter' && (
                                <button 
                                    onClick={() => handleChangePlan('starter')}
                                    disabled={isPending}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-all disabled:opacity-30"
                                >
                                    {isPending && changingTo === 'starter' ? 'Cancelling...' : 'Cancel Plan'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Next Payment Card */}
                <div className="md:col-span-2 rounded-2xl border border-zinc-100 bg-white p-8 flex flex-col justify-between shadow-sm">
                    <div className="space-y-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-charcoal-400">Next payment</p>
                        
                        <div>
                            {nextBillingDate ? (
                                <>
                                    <span className="text-3xl font-black text-charcoal-900 tracking-tight">
                                        {isTrial ? formatCurrency(currentPlan.monthlyPrice) : formatCurrency(currentPlan.monthlyPrice)}
                                    </span>
                                </>
                            ) : (
                                <span className="text-xl font-bold text-charcoal-300">—</span>
                            )}
                        </div>

                        <p className="text-sm text-charcoal-500">
                            {nextBillingDate ? (
                                <>on <span className="font-bold text-charcoal-700">{formatDate(nextBillingDate)}</span></>
                            ) : (
                                <span className="text-charcoal-300">No upcoming billing date</span>
                            )}
                        </p>
                    </div>

                    <div className="pt-6">
                        <button 
                            onClick={() => setShowPaymentModal(true)}
                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-zinc-200 hover:border-zinc-300 rounded-lg hover:bg-zinc-50 transition-all text-charcoal-600"
                        >
                            Manage Billing
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Billing Details ─── */}
            <div className="space-y-4">
                <h2 className="text-xl font-serif font-bold text-charcoal-900">Billing details</h2>
                
                <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#2D3282]">
                            <Shield className="w-4 h-4" />
                            Payment method
                        </div>
                        <button 
                            onClick={() => setShowPaymentModal(true)}
                            className="p-2 hover:bg-zinc-50 rounded-lg transition-colors text-charcoal-400 hover:text-charcoal-700"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                        <div className="flex items-center gap-6 w-full">
                            <div className="w-14 h-10 bg-gradient-to-br from-zinc-100 to-zinc-200 rounded-lg flex items-center justify-center shadow-inner">
                                <CreditCard className="w-6 h-6 text-zinc-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-charcoal-700">No payment method added</p>
                                <p className="text-xs text-charcoal-400 mt-0.5">Add a credit card, GCash, or Maya to continue after your trial.</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-zinc-50">
                        <button 
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2D3282] hover:bg-indigo-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-[0.98]"
                        >
                            <Plus className="w-4 h-4" />
                            Add Payment Method
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Invoices History ─── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-serif font-bold text-charcoal-900">Invoices history</h2>
                </div>
                
                <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
                    {/* Empty State */}
                    <div className="px-6 py-16 text-center">
                        <Calendar className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
                        <p className="text-sm font-bold text-charcoal-400">No invoices yet</p>
                        <p className="text-xs text-charcoal-300 mt-1">Your billing history will appear here once you have transactions.</p>
                    </div>
                </div>
            </div>

            {/* ─── Change Plan Modal ─── */}
            {showPlanModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100 sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-lg font-serif font-bold text-charcoal-900">Change Plan</h3>
                                <p className="text-xs text-charcoal-400 mt-0.5">Select the plan that best fits your studio.</p>
                            </div>
                            <button 
                                onClick={() => setShowPlanModal(false)}
                                className="p-2 hover:bg-zinc-50 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-charcoal-400" />
                            </button>
                        </div>

                        {/* Plan Cards */}
                        <div className="px-8 py-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {PLANS.map((plan) => {
                                const isCurrent = plan.id === currentTier
                                const PIcon = plan.icon
                                
                                return (
                                    <div 
                                        key={plan.id} 
                                        className={clsx(
                                            "relative rounded-2xl border-2 p-6 transition-all",
                                            isCurrent 
                                                ? "border-[#2D3282] bg-indigo-50/30 ring-1 ring-[#2D3282]/10" 
                                                : "border-zinc-100 hover:border-zinc-300 bg-white"
                                        )}
                                    >
                                        {/* Current Badge */}
                                        {isCurrent && (
                                            <div className="absolute -top-3 left-6 px-3 py-1 bg-[#2D3282] text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                                                Current Plan
                                            </div>
                                        )}

                                        {/* Plan Badge */}
                                        {!isCurrent && plan.badge === 'Popular' && (
                                            <div className="absolute -top-3 left-6 px-3 py-1 bg-green-500 text-white text-[8px] font-black uppercase tracking-widest rounded-full">
                                                Popular
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white",
                                                    plan.color
                                                )}>
                                                    <PIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-black text-charcoal-900">{plan.name}</h4>
                                                </div>
                                            </div>

                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-charcoal-900">
                                                    {plan.monthlyPrice === 0 ? 'Free' : formatCurrency(plan.monthlyPrice)}
                                                </span>
                                                {plan.monthlyPrice > 0 && (
                                                    <span className="text-xs text-charcoal-400 font-bold">/mo</span>
                                                )}
                                            </div>

                                            <ul className="space-y-2 pt-2">
                                                {plan.features.map((feature, idx) => (
                                                    <li key={idx} className="flex items-center gap-2 text-xs text-charcoal-600">
                                                        <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>

                                            <button
                                                onClick={() => !isCurrent && handleChangePlan(plan.id)}
                                                disabled={isCurrent || isPending}
                                                className={clsx(
                                                    "w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-2 flex items-center justify-center gap-2",
                                                    isCurrent 
                                                        ? "bg-zinc-100 text-charcoal-400 cursor-default" 
                                                        : "bg-[#2D3282] text-white hover:bg-indigo-900 shadow-md active:scale-[0.98] disabled:opacity-50"
                                                )}
                                            >
                                                {isPending && changingTo === plan.id ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Switching...</>
                                                ) : isCurrent ? (
                                                    'Current Plan'
                                                ) : plan.monthlyPrice > currentPlan.monthlyPrice ? (
                                                    'Upgrade'
                                                ) : (
                                                    'Downgrade'
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Payment Method Modal ─── */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100">
                            <h3 className="text-lg font-serif font-bold text-charcoal-900">Add Payment Method</h3>
                            <button 
                                onClick={() => setShowPaymentModal(false)}
                                className="p-2 hover:bg-zinc-50 rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5 text-charcoal-400" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="px-8 py-8 space-y-6">
                            {/* Method Type Selection */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'card', label: 'Credit Card', icon: CreditCard },
                                    { id: 'gcash', label: 'GCash', icon: Smartphone },
                                    { id: 'maya', label: 'Maya', icon: Smartphone },
                                ].map((method) => (
                                    <button 
                                        key={method.id}
                                        className="p-4 border-2 border-zinc-100 rounded-2xl hover:border-[#2D3282] hover:bg-indigo-50/50 transition-all text-center group focus:border-[#2D3282] focus:bg-indigo-50/50"
                                    >
                                        <method.icon className="w-6 h-6 text-zinc-300 mx-auto mb-2 group-hover:text-[#2D3282] group-focus:text-[#2D3282] transition-colors" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-charcoal-500 group-hover:text-[#2D3282] group-focus:text-[#2D3282]">{method.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Card Input Fields */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-400">Card Number</label>
                                    <input 
                                        type="text" 
                                        placeholder="4242 4242 4242 4242"
                                        className="w-full px-5 py-3.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all placeholder:text-charcoal-200 font-mono text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-400">Expiry</label>
                                        <input 
                                            type="text" 
                                            placeholder="MM/YY"
                                            className="w-full px-5 py-3.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all placeholder:text-charcoal-200 font-mono text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-400">CVC</label>
                                        <input 
                                            type="text" 
                                            placeholder="123"
                                            className="w-full px-5 py-3.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all placeholder:text-charcoal-200 font-mono text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-charcoal-400">Name on Card</label>
                                    <input 
                                        type="text" 
                                        placeholder="Juan De La Cruz"
                                        className="w-full px-5 py-3.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all placeholder:text-charcoal-200 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2 text-[10px] text-charcoal-300 font-medium">
                                <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                                <span>Your payment information is encrypted and secured with 256-bit SSL.</span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-6 border-t border-zinc-100 bg-zinc-50/30 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowPaymentModal(false)}
                                className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-charcoal-500 hover:text-charcoal-700 hover:bg-zinc-100 rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button className="px-8 py-3 bg-[#2D3282] hover:bg-indigo-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-[0.98]">
                                Save Method
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
