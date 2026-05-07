'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Sparkles, Building2, Loader2, ArrowRight, ShieldCheck, CreditCard, Package } from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { selectCmsPlanAction } from './actions'

const plans = [
    { 
        id: 'starter', 
        name: 'Starter', 
        price: 680, 
        popular: false, 
        description: 'For solo instructors and freelancers.',
        features: ['1 owner account', 'One location only', 'Custom branded link', 'Schedule classes & appts'] 
    },
    { 
        id: 'team', 
        name: 'Team', 
        price: 2600, 
        popular: true, 
        description: 'For boutique studios and growing teams.',
        features: ['Unlimited staff accounts', 'Multi-location ready', 'Advanced staff roles', 'Waitlist & group booking'] 
    },
    { 
        id: 'business', 
        name: 'Business', 
        price: 4400, 
        popular: false, 
        description: 'For established studios scaling up.',
        features: ['Whitelabel branded app', 'Dedicated account manager', 'Franchise model', 'API access & integrations'] 
    }
]

export default function PlanSelectionPage() {
    const router = useRouter()
    const [selectedPlan, setSelectedPlan] = useState('team')
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('annually')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handlePlanSelect = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await selectCmsPlanAction(selectedPlan, billingCycle)
            if (res.error) {
                setError(res.error)
            } else {
                router.push('/studio')
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#faf9f6] flex flex-col py-12 px-6">
            <div className="max-w-6xl mx-auto w-full space-y-12">
                {/* Header */}
                <div className="text-center space-y-6 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-forest/5 rounded-full border border-forest/10 mb-2">
                        <ShieldCheck className="w-4 h-4 text-forest" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-forest">Business Verification Complete</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-serif text-charcoal leading-tight">Activate your <span className="italic !text-forest inline-block mt-2">Studio Dashboard</span></h1>
                    <p className="text-slate/60 text-lg font-light leading-relaxed">
                        To unlock your branded storefront and management tools, please select a plan. 
                        Every plan starts with a <span className="text-charcoal font-bold underline">1-month free trial</span>.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-6 mt-12 bg-white p-2 rounded-2xl border border-cream-100 shadow-sm inline-flex">
                        <button 
                            onClick={() => setBillingCycle('monthly')}
                            className={clsx(
                                "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                billingCycle === 'monthly' ? "bg-charcoal text-white shadow-lg" : "text-slate/40 hover:text-charcoal"
                            )}
                        >
                            Monthly
                        </button>
                        <button 
                            onClick={() => setBillingCycle('annually')}
                            className={clsx(
                                "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                billingCycle === 'annually' ? "bg-charcoal text-white shadow-lg" : "text-slate/40 hover:text-charcoal"
                            )}
                        >
                            Annually
                            <span className="bg-emerald-100 text-emerald-600 text-[8px] px-1.5 py-0.5 rounded uppercase">Save 20%</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="max-w-md mx-auto p-4 bg-red-50 border border-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-xl text-center">
                        {error}
                    </div>
                )}

                {/* Plan Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((p) => {
                        const originalPrice = p.price
                        const finalPrice = billingCycle === 'annually' ? Math.floor(originalPrice * 0.8) : originalPrice
                        const isSelected = selectedPlan === p.id

                        return (
                            <motion.div 
                                key={p.id}
                                whileHover={{ y: -8 }}
                                onClick={() => setSelectedPlan(p.id)}
                                className={clsx(
                                    "p-10 rounded-[2.5rem] border-2 cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between group h-full",
                                    isSelected 
                                        ? "border-forest bg-white ring-8 ring-forest/5 shadow-2xl" 
                                        : "border-cream-100 bg-white hover:border-forest/20 shadow-tight"
                                )}
                            >
                                {p.popular && (
                                    <div className="absolute top-6 right-6">
                                        <span className="bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase px-3 py-1 rounded-full border border-emerald-200 shadow-sm">Most Popular</span>
                                    </div>
                                )}

                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-2xl font-bold text-charcoal">{p.name}</h3>
                                        <p className="text-xs text-slate/50 leading-relaxed font-light min-h-[40px] uppercase tracking-widest font-black">
                                            {p.description}
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-3xl font-black text-charcoal tracking-tight">PHP {finalPrice.toLocaleString()}</span>
                                            <span className="text-[10px] text-slate/40 font-black uppercase tracking-widest">/ month</span>
                                        </div>
                                        <p className="text-[9px] text-slate/30 font-black uppercase tracking-widest">
                                            {billingCycle === 'annually' ? `PHP ${(finalPrice * 12).toLocaleString()} billed annually` : 'Billed monthly'}
                                        </p>
                                    </div>

                                    <ul className="space-y-5 flex-1">
                                        {p.features.map(f => (
                                            <li key={f} className="flex items-start gap-4 text-[10px] font-black text-slate/80 uppercase tracking-widest leading-relaxed">
                                                <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/10">
                                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                                </div>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-10 pt-8 border-t border-cream-50">
                                    <div className={`w-full h-1 rounded-full transition-all duration-500 ${isSelected ? 'bg-forest' : 'bg-cream-100'}`} />
                                </div>
                            </motion.div>
                        )
                    })}
                </div>

                {/* Footer Action */}
                <div className="max-w-2xl mx-auto space-y-8 text-center pt-8">
                    <div className="p-8 bg-forest/[0.03] border border-forest/10 rounded-[2.5rem] flex flex-col sm:flex-row items-center gap-8 shadow-inner">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <Sparkles className="w-7 h-7 text-emerald-600" />
                        </div>
                        <div className="space-y-2 text-center sm:text-left">
                            <h5 className="text-xs font-black uppercase tracking-widest text-charcoal">Free Trial Terms</h5>
                            <p className="text-[10px] text-slate/50 font-bold uppercase tracking-[0.2em] leading-relaxed">
                                You will not be charged today. Your first payment is due in <span className="text-forest">30 days</span>. 
                                We&apos;ll notify you before your trial ends. Cancel anytime with one click.
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={handlePlanSelect}
                        disabled={isLoading}
                        className="w-full sm:w-auto px-12 py-5 bg-charcoal text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-forest transition-all shadow-xl shadow-forest/10 flex items-center justify-center gap-4 group disabled:opacity-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Begin 30-Day Free Trial <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>

                    <p className="text-[9px] text-slate/30 font-black uppercase tracking-widest">
                        By continuing, you agree to StudioVault&apos;s Merchant Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    )
}
