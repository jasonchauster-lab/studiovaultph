'use client'

import React, { memo, useState } from 'react'
import clsx from 'clsx'
import { Check, Ticket, Star, Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import { purchasePlan } from '@/app/(dashboard)/customer/pricing-actions'
import { useToast } from '@/components/ui/Toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/Button"

interface MembershipCardProps {
    id: string
    name: string
    price: number
    credits: number | null
    validity_days: number | null
    features: string[]
    bestValue?: boolean
    studioId: string
    referralRewards?: any[]
    theme?: any
    isMobile?: boolean
    enableXendit?: boolean
    enableManualPayments?: boolean
    isPreview?: boolean
    onNavigate?: (id: string) => void
}

function MembershipCard({ id, name, price, credits, validity_days, features, bestValue, studioId, theme, isMobile, referralRewards, enableXendit, enableManualPayments, isPreview, onNavigate }: MembershipCardProps) {
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
            planType: 'membership',
            studioId,
            paymentMethod,
            referralRewardId: applicableReward?.id
        })

        if (result.success) {
            if (result.checkoutUrl) {
                toast('Redirecting to secure payment...', 'success')
                window.location.href = result.checkoutUrl
            } else {
                toast('Membership request submitted! Redirecting to checkout to upload your payment proof...', 'success')
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
                "relative flex flex-col transition-all duration-700 hover:-translate-y-4",
                isMobile ? "px-5 py-8 rounded-[2.5rem]" : "p-10 md:p-12 rounded-[3.5rem]",

                bestValue 
                    ? 'shadow-2xl md:scale-105 z-10 border border-white/10' 
                    : 'bg-white border border-zinc-100 transition-shadow'
            )}
            style={{ 
                backgroundColor: bestValue ? (theme?.primaryColor || '#1a1a1a') : '#ffffff',
                color: bestValue ? '#ffffff' : (theme?.textColor || '#1a1a1a'),
                boxShadow: bestValue ? undefined : 'var(--card-shadow)'
            }}

        >
            {bestValue && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[var(--primary-brand)] text-white px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-xl flex items-center gap-2">
                    <Star className="w-3 h-3 fill-white" />
                    Best Choice
                </div>
            )}

            <div className={`flex-1 ${isMobile ? 'space-y-10' : 'space-y-12'}`}>
                <div className="space-y-8">
                    <h3 
                        className={`text-2xl md:text-3xl font-bold tracking-tight`}
                        style={{ fontFamily: 'var(--font-heading)', color: bestValue ? '#ffffff' : 'var(--global-text)' }}
                    >
                        {name}
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span 
                            className={clsx(
                                "font-bold tracking-tighter",
                                isMobile ? "text-3xl" : "text-4xl md:text-5xl"
                            )}
                            style={{ fontFamily: 'var(--font-heading)' }}
                        >
                            ₱{finalPrice.toLocaleString()}
                        </span>
                        {finalPrice < price && (
                            <span className={clsx(
                                "ml-3 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                                bestValue ? "bg-white text-burgundy" : "bg-forest/10 text-forest"
                            )}>
                                {discountText}
                            </span>
                        )}
                        {finalPrice < price && (
                            <span className={clsx(
                                "block text-xs line-through mt-1",
                                bestValue ? "text-white/40" : "text-zinc-400"
                            )}>
                                Original: ₱{price.toLocaleString()}
                            </span>
                        )}
                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${bestValue ? 'text-white/40' : 'text-zinc-400'}`}>
                            / {validity_days ? (validity_days === 30 ? 'Month' : `${validity_days} Days`) : 'Access'}
                        </span>
                    </div>
                </div>

                <div className={`h-px ${bestValue ? 'bg-white/10' : 'bg-zinc-100'}`} />

                {validity_days && validity_days > 0 && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${bestValue ? 'bg-white/10 text-white' : 'bg-zinc-50 text-zinc-900'}`}>
                                <Ticket className="w-5 h-5" />
                            </div>
                            <div>
                                <p 
                                    className={`text-[12px] font-black uppercase tracking-[0.25em] ${bestValue ? 'text-white' : 'text-zinc-900'}`}
                                    style={{ fontFamily: 'var(--font-body)' }}
                                >
                                    {credits ? `${credits} Sessions` : 'Unlimited Sessions'}
                                </p>
                                <p className={`text-[11px] font-medium opacity-60`}>
                                    Valid for {validity_days} days
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <ul className="space-y-5">
                    {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                            <div className={`p-1 rounded-full mt-0.5 shrink-0 ${bestValue ? 'bg-[var(--primary-brand)]/20 text-[var(--primary-brand)]' : 'bg-emerald-50 text-emerald-600'}`}>
                                <Check className="w-3 h-3" />
                            </div>
                            <span 
                                className={`text-[13px] leading-relaxed font-medium ${bestValue ? 'text-white/70' : 'text-zinc-500'}`}
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
                        <p className={clsx("text-[10px] font-black uppercase tracking-[0.2em] opacity-40", bestValue ? "text-white/60" : "text-zinc-400")}>
                            Select Payment
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPaymentMethod('xendit')}
                                className={clsx(
                                    "flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                                    paymentMethod === 'xendit' 
                                        ? (bestValue ? "bg-white text-zinc-900 border-white" : "bg-zinc-900 text-white border-zinc-900") 
                                        : (bestValue ? "bg-white/10 text-white border-white/20" : "bg-zinc-50 text-zinc-400 border-zinc-100")
                                )}
                            >
                                Card/E-Wallet
                            </button>
                            <button
                                onClick={() => setPaymentMethod('manual')}
                                className={clsx(
                                    "flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all",
                                    paymentMethod === 'manual' 
                                        ? (bestValue ? "bg-white text-zinc-900 border-white" : "bg-zinc-900 text-white border-zinc-900") 
                                        : (bestValue ? "bg-white/10 text-white border-white/20" : "bg-zinc-50 text-zinc-400 border-zinc-100")
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
                className={`mt-14 w-full py-6 text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.4em] transition-all flex items-center justify-center gap-2 hover:brightness-110 active:scale-95`}
                style={{
                    backgroundColor: bestValue ? '#ffffff' : (theme?.buttonColor || theme?.primaryColor || '#1a1a1a'),
                    color: bestValue ? (theme?.primaryColor || '#1a1a1a') : '#ffffff',
                    borderRadius: theme?.buttonRadius || '12px',
                    fontFamily: 'var(--font-body)'
                }}
            >
                {isPurchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Apply Now'}
            </button>
        </div>

        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
            <DialogContent className="sm:max-w-[440px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl text-zinc-900">
                <div className="bg-zinc-50 p-8 text-center space-y-4 border-b border-zinc-100">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                        <ShieldCheck className="w-8 h-8 text-zinc-900" />
                    </div>
                    <div>
                        <DialogTitle className="text-2xl font-black tracking-tightest leading-tight text-zinc-900">Confirm Membership</DialogTitle>
                        <DialogDescription className="text-zinc-500 font-medium tracking-tight mt-1">Review your membership details before proceeding</DialogDescription>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-zinc-400">
                            <span>Membership</span>
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

function StorefrontMemberships({ config, studioName, memberships = [], studioId, theme, isMobile = false, referralRewards, enableXendit, enableManualPayments, isPreview = false, onNavigate }: { config: any, studioName: string, memberships?: any[], studioId: string, theme?: any, isMobile?: boolean, referralRewards?: any[], enableXendit?: boolean, enableManualPayments?: boolean, isPreview?: boolean, onNavigate?: (id: string) => void }) {
    const isPremium = theme?.layoutStyle === 'premium'
    
    // Fallback data for preview if no memberships exist
    const displayMemberships = memberships

    return (
        <section 
            id={config?.id || 'packages'} 
            className={clsx(
                "px-4 sm:px-6 transition-all duration-500",
                isMobile ? "py-12" : "",
                !isPremium && 'bg-cream-50/50 border-y border-cream-100'
            )}
            style={{ 
                paddingBlock: isMobile ? '3rem' : 'var(--section-padding)' 
            }}

        >
            <div className={clsx(
                "space-y-6 max-w-7xl mx-auto",
                isMobile ? "mb-12" : "mb-24",
                isPremium ? 'text-center' : 'text-left'
            )}>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary-brand)]/5 rounded-full border border-[var(--primary-brand)]/10 text-[var(--primary-brand)] text-[10px] font-black uppercase tracking-[0.2em]">
                    Pricing Plans
                </div>
                <h2 
                    className={clsx(
                        "font-bold text-zinc-900 tracking-tighter leading-[0.95] break-words",
                        isMobile ? "text-3xl px-1" : "text-3xl sm:text-5xl md:text-6xl lg:text-[6rem]"
                    )}
                    style={{ fontFamily: 'var(--font-heading)' }}
                >
                    {config?.content?.title || 'Pricing & Memberships'}
                </h2>

                <p 
                    className={clsx(
                        "text-zinc-500 leading-relaxed font-medium tracking-tight opacity-70 text-base md:text-xl",
                        !isPremium && "max-w-2xl"
                    )}
                    style={{ fontFamily: 'var(--font-body)' }}
                >
                    {config?.content?.subtitle || `Choose the perfect plan to sustain your practice at ${studioName}.`}
                </p>
            </div>

            {displayMemberships.length > 0 ? (
                <div className={clsx(
                    "grid items-stretch gap-10 lg:gap-14 max-w-7xl mx-auto",
                    isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                )}>
                        {displayMemberships.map((membership, idx) => (
                            <MembershipCard 
                                key={idx}
                                {...membership}
                                studioId={studioId}
                                referralRewards={referralRewards}
                                theme={theme}
                                isMobile={isMobile}
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
                        No memberships available yet. 
                        <br />
                        <span className="text-sm font-sans not-italic font-bold uppercase tracking-widest opacity-60">
                            Please add memberships in your Studio Dashboard.
                        </span>
                    </p>
                </div>
            )}
        </section>
    )
}

export default memo(StorefrontMemberships)
