'use client'

import React from 'react'
import { purchasePlan } from '@/app/(dashboard)/customer/pricing-actions'
import { useToast } from '@/components/ui/Toast'
import { Loader2, Ticket, MapPin, Clock, CreditCard, Check } from 'lucide-react'
import clsx from 'clsx'

interface PricingCardProps {
    id: string
    name: string
    price: number
    credits: number | null
    validity_days: number | null
    description?: string
    features?: string[]
    studioId: string
    studioLocation?: string
    type?: 'membership' | 'package'
    activation_type?: 'purchase' | 'first_booking'
}

export default function PricingCard({ 
    id, 
    name, 
    price, 
    credits, 
    validity_days, 
    description,
    features = [], 
    studioId, 
    studioLocation,
    type = 'package',
    activation_type = 'purchase'
}: PricingCardProps) {
    const { toast } = useToast()
    const [isPurchasing, setIsPurchasing] = React.useState(false)

    const handleBuy = async () => {
        setIsPurchasing(true)
        try {
            const result = await purchasePlan({
                planId: id,
                planType: type,
                studioId,
                paymentMethod: 'manual'
            })

            if (result.success) {
                toast('Request submitted! Please upload your payment proof in your dashboard.', 'success')
                window.location.href = `/customer/payment-plans/${result.planId}`
            } else {
                toast(result.error || 'Failed to initiate purchase', 'error')
            }
        } catch (error) {
            toast('An error occurred. Please try again.', 'error')
        } finally {
            setIsPurchasing(false)
        }
    }

    return (
        <div className="flex flex-col bg-white rounded-[3rem] overflow-hidden shadow-tight hover:shadow-card transition-all duration-500 group border border-charcoal-100/50">
            <div className="p-8 md:p-10 space-y-8 flex-1 flex flex-col">
                <div className="space-y-6">
                    <h3 className="text-lg font-bold text-charcoal-900 leading-tight">
                        {name}
                    </h3>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-serif font-black text-charcoal-900">₱{price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                </div>

                <div className="space-y-6 py-8 px-8 bg-[#F5F3EE] rounded-[2rem] flex-1">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-charcoal-500">
                            <CreditCard className="w-4 h-4 shrink-0 opacity-60" />
                            <span className="text-[12px] font-medium tracking-tight">One time payment</span>
                        </div>
                        {credits && credits > 0 && (
                            <div className="flex items-center gap-3 text-charcoal-500">
                                <Ticket className="w-4 h-4 shrink-0 opacity-60" />
                                <span className="text-[11px] font-medium tracking-tight">{credits} credits for Classes</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 text-charcoal-500">
                            <MapPin className="w-4 h-4 shrink-0 opacity-60" />
                            <span className="text-[11px] font-medium tracking-tight">Location access</span>
                        </div>
                        <div className="flex items-start gap-3 text-charcoal-500 leading-tight">
                            <span className="px-1.5 py-0.5 rounded bg-charcoal-100 text-[8px] font-bold uppercase mt-0.5">@</span>
                            <span className="text-[11px] font-medium tracking-tight">{studioLocation || 'Studio Location'}</span>
                        </div>
                        {validity_days && validity_days > 0 && (
                            <div className="flex items-center gap-3 text-charcoal-500">
                                <Clock className="w-4 h-4 shrink-0 opacity-60" />
                                <span className="text-[12px] font-medium tracking-tight leading-tight">
                                    Valid for {validity_days} days from {activation_type === 'purchase' ? 'purchase' : 'first booking'}
                                </span>
                            </div>
                        )}
                    </div>

                    <button className="text-[10px] font-bold uppercase tracking-widest text-charcoal-900 border-b border-charcoal-400 hover:border-charcoal-900 transition-colors pt-2 block w-fit">
                        Quick View
                    </button>
                </div>

                <button 
                    onClick={handleBuy}
                    disabled={isPurchasing}
                    className="w-full py-6 rounded-[1.5rem] bg-[#D4D4D4] text-[#737373] text-[11px] font-black uppercase tracking-[0.2em] hover:bg-charcoal-900 hover:text-white transition-all flex items-center justify-center gap-2 group-hover:bg-charcoal-800 group-hover:text-white"
                >
                    {isPurchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buy now'}
                </button>
            </div>
        </div>
    )
}
