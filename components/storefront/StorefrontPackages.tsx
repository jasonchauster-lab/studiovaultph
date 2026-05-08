'use client'

import React, { memo, useState } from 'react'
import clsx from 'clsx'
import { purchasePlan } from '@/app/(dashboard)/customer/pricing-actions'
import { useToast } from '@/components/ui/Toast'
import { Loader2, Ticket, Check, ShieldCheck, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"

interface Package {
    id: string
    name: string
    price: number
    credits: number
    validity_days: number | null
    features: string[]
}

interface PackageCardProps extends Package {
    studioId: string
    theme?: any
    isMobile?: boolean
    referralRewards?: any[]
    enableXendit?: boolean
    enableManualPayments?: boolean
    isPreview?: boolean
    onNavigate?: (id: string) => void
}

function PackageCard({ id, name, price, credits, validity_days, features, studioId, theme, isMobile, referralRewards, enableXendit, enableManualPayments, isPreview, onNavigate }: PackageCardProps) {
    const { toast } = useToast()
    const [isPurchasing, setIsPurchasing] = React.useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const isPremium = theme?.layoutStyle === 'premium'

    const applicableReward = referralRewards?.find(r => 
        r.status === 'pending' && 
        (r.applicable_item_ids?.length === 0 || r.applicable_item_ids?.includes(id))
    )

    const [paymentMethod, setPaymentMethod] = React.useState<'xendit' | 'manual'>(enableXendit ? 'xendit' : 'manual')

    let finalPrice = price
    let discountText = ''
    if (applicableReward) {
        if (applicableReward.discount_type === 'fixed_amount') {
            finalPrice = Math.max(0, price - applicableReward.discount_value)
            discountText = `₱${applicableReward.discount_value} OFF Applied`
        } else {
            const discount = (price * applicableReward.discount_value) / 100
            finalPrice = Math.max(0, price - discount)
            discountText = `${applicableReward.discount_value}% OFF Applied`
        }
    }

    const handleBuy = async () => {
        if (isPreview) {
            toast('In preview mode, purchase is disabled', 'info')
            onNavigate?.('memberships')
            return
        }

        setIsPurchasing(true)
        const result = await purchasePlan({
            planId: id,
            planType: 'package',
            studioId,
            paymentMethod,
            referralRewardId: applicableReward?.id
        })

        if (result.success) {
            if (result.checkoutUrl) {
                toast('Redirecting to secure payment...', 'success')
                window.location.href = result.checkoutUrl
            } else {
                toast('Request submitted! Redirecting to checkout to upload your payment proof...', 'success')
                window.location.href = `/customer/payment-plans/${result.planId}`
            }
        } else {
            toast(result.error || 'Failed to initiate purchase', 'error')
        }
        setIsPurchasing(false)
        setShowConfirm(false)
    }

    return (
        <>
        <div 
            className={clsx(
                "group relative flex flex-col transition-all duration-700 hover:-translate-y-3 border border-zinc-100 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.06)] hover:shadow-2xl",
                isMobile ? "px-6 py-10 rounded-[2rem]" : "p-8 md:p-12 rounded-[3.5rem]"

            )}
            style={{
                backgroundColor: '#ffffff',
                color: theme?.textColor || '#1a1a1a'
            }}
        >
            <div className={`flex-1 ${isMobile ? 'space-y-10' : 'space-y-14'}`}>
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                         <div 
                            className={`p-3 rounded-2xl transition-colors duration-500 bg-zinc-50 text-zinc-400 group-hover:bg-[var(--primary-brand)] group-hover:text-white`}
                            style={{ '--primary-brand': theme?.primaryColor || '#1a1a1a' } as any}
                         >
                            <Ticket className="w-5 h-5" />
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-[0.4em] opacity-40`}>
                             {credits ? `${credits} Sessions` : 'Class Bundle'}
                        </span>
                    </div>
                    <h3 
                        className={`text-2xl md:text-3xl font-bold tracking-tight`}
                        style={{ fontFamily: 'var(--font-heading)', color: 'var(--global-text)' }}
                    >
                        {name}
                    </h3>
                </div>

                <div className={`h-px ${isPremium ? 'bg-zinc-50' : 'bg-charcoal-900/5'}`} />

                <div className="space-y-4">
                    <p 
                        className={clsx(
                            "font-bold tracking-tighter leading-none",
                            isMobile ? "text-4xl" : "text-4xl md:text-5xl"
                        )}
                        style={{ fontFamily: 'var(--font-heading)', color: 'var(--global-text)' }}
                    >
                        ₱{finalPrice.toLocaleString()}
                        {finalPrice < price && (
                            <span className="ml-3 text-sm text-forest font-black uppercase tracking-widest bg-forest/10 px-3 py-1 rounded-full">
                                {discountText}
                            </span>
                        )}
                        {finalPrice < price && (
                            <span className="block text-xs text-zinc-400 line-through mt-1">
                                Original: ₱{price.toLocaleString()}
                            </span>
                        )}
                    </p>
                    {( (credits && credits > 0) || (validity_days && validity_days > 0) ) && (
                        <p 
                            className={`text-[11px] font-medium opacity-60 tracking-tight leading-relaxed`}
                            style={{ fontFamily: 'var(--font-body)' }}
                        >
                            {credits && credits > 0 && `₱${(price / credits).toFixed(0)} per session`}
                            {credits && credits > 0 && validity_days && validity_days > 0 && ` • `}
                            {validity_days && validity_days > 0 && `Valid for ${validity_days} days`}
                        </p>
                    )}
                </div>

                <ul className="space-y-4 pt-4">
                    {features.map((feature: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-4">
                            <Check className={`w-4 h-4 mt-0.5 shrink-0 ${isPremium ? 'text-zinc-900' : 'text-forest'}`} />
                            <span 
                                className={`text-[13px] leading-relaxed font-medium ${isPremium ? 'text-zinc-500' : 'text-charcoal-500'}`}
                                style={{ fontFamily: 'var(--font-body)' }}
                            >
                                {feature}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* Payment Method Selector (if both enabled) */}
                {enableXendit && enableManualPayments && (
                    <div className="pt-8 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Select Payment</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPaymentMethod('xendit')}
                                className={clsx(
                                    "flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                                    paymentMethod === 'xendit' ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-100 bg-zinc-50 text-zinc-400"
                                )}
                            >
                                Card/E-Wallet
                            </button>
                            <button
                                onClick={() => setPaymentMethod('manual')}
                                className={clsx(
                                    "flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                                    paymentMethod === 'manual' ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-100 bg-zinc-50 text-zinc-400"
                                )}
                            >
                                GCash/BPI
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={() => setShowConfirm(true)}
                disabled={isPurchasing}
                className={`mt-14 w-full py-6 text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] transition-all flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 shadow-lg shadow-indigo-100`}
                style={{
                    backgroundColor: theme?.buttonColor || theme?.primaryColor || '#1a1a1a',
                    color: '#ffffff',
                    borderRadius: theme?.buttonRadius || '12px',
                    fontFamily: 'var(--font-body)'
                }}
            >
                {isPurchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Claim Package'}
            </button>
        </div>

        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogContent className="sm:max-w-[440px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                <div className="bg-zinc-50 p-8 text-center space-y-4 border-b border-zinc-100">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <ShieldCheck className="w-8 h-8 text-zinc-900" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black tracking-tightest leading-tight">Confirm Purchase</DialogTitle>
                        <DialogDescription className="text-zinc-500 font-medium tracking-tight mt-1">Review your plan details before proceeding</DialogDescription>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-zinc-400">
                            <span>Plan</span>
                            <span className="text-zinc-900">{name}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-zinc-400">
                            <span>Price</span>
                            <span className="text-zinc-900">₱{price.toLocaleString()}</span>
                        </div>
                        {finalPrice < price && (
                            <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-forest">
                                <span>Discount</span>
                                <span>-₱{(price - finalPrice).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="h-px bg-zinc-100" />
                        <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest text-zinc-900 pt-2">
                            <span>Total Due</span>
                            <span className="text-2xl tracking-tighter">₱{finalPrice.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-zinc-400 shrink-0" />
                        <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                            {paymentMethod === 'xendit' 
                                ? "You will be redirected to Xendit for a secure payment via Card, GCash, or Maya." 
                                : "You will be redirected to upload your proof of payment for manual verification."}
                        </p>
                    </div>

                    <DialogFooter className="flex-col sm:flex-col gap-3 mt-4">
                        <Button 
                            className="w-full py-7 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] bg-zinc-900 hover:bg-zinc-800 text-white shadow-xl shadow-zinc-200"
                            onClick={handleBuy}
                            disabled={isPurchasing}
                        >
                            {isPurchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Proceed'}
                        </Button>
                        <Button 
                            variant="ghost" 
                            className="w-full text-zinc-400 hover:text-zinc-900 text-[10px] font-black uppercase tracking-widest"
                            onClick={() => setShowConfirm(false)}
                            disabled={isPurchasing}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
        </>
    )
}

function StorefrontPackages({ config, studioName, packages = [], studioId, theme, isMobile = false, referralRewards, enableXendit, enableManualPayments, isPreview = false, onNavigate }: { config: any, studioName: string, packages?: Package[], studioId: string, theme?: any, isMobile?: boolean, referralRewards?: any[], enableXendit?: boolean, enableManualPayments?: boolean, isPreview?: boolean, onNavigate?: (id: string) => void }) {
    const isPremium = theme?.layoutStyle === 'premium'
    
    // Fallback data for preview if no packages exist
    const displayPackages = packages

    return (
        <section 
            id={config?.id || 'packages'} 
            className={clsx(
                "px-4 sm:px-6 transition-all duration-500",
                isMobile ? "py-12" : "",
                !isPremium && "bg-zinc-50 border-y border-zinc-100"
            )}
            style={{ 
                paddingBlock: isMobile ? '3rem' : 'var(--section-padding)' 
            }}
        >
            <div className="max-w-7xl mx-auto w-full">
                <div className={clsx(
                    "space-y-6",
                    isMobile ? "mb-12" : "mb-24",
                    isPremium ? 'text-center' : 'text-left max-w-2xl'
                )}>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-brand)]/5 rounded-full border border-[var(--primary-brand)]/10 text-[var(--primary-brand)] text-[10px] font-black uppercase tracking-[0.4em]">
                        Bundles
                    </div>
                    <h2 
                        className={clsx(
                            "font-bold text-zinc-900 tracking-tighter leading-[0.95] break-words px-2",
                            isMobile ? "text-3xl" : "text-4xl sm:text-5xl md:text-6xl lg:text-[6rem]"
                        )}
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        {config?.content?.title || 'Session Packages'}
                    </h2>
                    <p 
                        className={clsx(
                            "text-zinc-500 mx-auto leading-relaxed font-medium tracking-tight opacity-70",
                            isMobile ? "text-base" : "text-base md:text-xl",
                            !isPremium && "mx-0"
                        )}
                        style={{ fontFamily: 'var(--font-body)' }}
                    >
                        {config?.content?.subtitle || `Flexible bundles to keep your practice moving at ${studioName}.`}
                    </p>
                </div>

                {displayPackages.length > 0 ? (
                    <div className={clsx(
                        "grid grid-cols-1 items-stretch gap-10",
                        !isMobile && "md:grid-cols-2 lg:grid-cols-3 lg:gap-14"
                    )}>
                        {displayPackages.map((pkg: Package, idx: number) => (
                            <PackageCard 
                                key={idx}
                                {...pkg}
                                studioId={studioId}
                                theme={theme}
                                isMobile={isMobile}
                                referralRewards={referralRewards}
                                enableXendit={enableXendit}
                                enableManualPayments={enableManualPayments}
                                isPreview={isPreview}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-zinc-50 rounded-[3rem] border border-dashed border-zinc-200">
                        <p className="text-zinc-400 italic font-serif text-xl">
                            No packages available yet. 
                            <br />
                            <span className="text-sm font-sans not-italic font-bold uppercase tracking-widest opacity-60">
                                Please add packages in your Studio Dashboard.
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </section>
    )
}

export default memo(StorefrontPackages)
