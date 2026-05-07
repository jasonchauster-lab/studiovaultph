'use client'

import React, { useState, useEffect } from 'react'
import { Check, Loader2, Upload, Ticket, CreditCard, ChevronRight, AlertCircle, Trash2 } from 'lucide-react'
import { validatePromoCode, uploadPlanPaymentProof } from '@/app/(dashboard)/customer/pricing-actions'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'
import { normalizeImageFile } from '@/lib/utils/image-utils'
import Image from 'next/image'
import LegalAgreementCheckbox from '@/components/storefront/LegalAgreementCheckbox'

interface PlanPaymentFormProps {
    plan: any
    studio: any
}

export default function PlanPaymentForm({ plan, studio }: PlanPaymentFormProps) {
    const { toast } = useToast()
    const [promoCode, setPromoCode] = useState('')
    const [isValidating, setIsValidating] = useState(false)
    const [appliedPromo, setAppliedPromo] = useState<any>(null)
    const [finalPrice, setFinalPrice] = useState(plan.total_amount || 0)
    
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [agreedToLegal, setAgreedToLegal] = useState(false)

    const supabase = createClient()

    const handleApplyPromo = async () => {
        if (!promoCode) return
        setIsValidating(true)
        try {
            // We need the original package/membership ID
            const targetId = plan.package_id || plan.membership_id
            const result = await validatePromoCode(promoCode, plan.studio_id, targetId)
            
            if (result.success && result.promo) {
                setAppliedPromo(result.promo)
                
                // Calculate new price
                let discount = 0
                const basePrice = plan.total_amount
                if (result.promo.discount_type === 'percentage') {
                    discount = (basePrice * result.promo.discount_value) / 100
                } else {
                    discount = result.promo.discount_value
                }
                
                const newPrice = Math.max(0, basePrice - discount)
                setFinalPrice(newPrice)
                toast('Promo code applied!', 'success')
            } else {
                toast(result.error || 'Invalid promo code', 'error')
            }
        } catch (error) {
            toast('Failed to apply promo code', 'error')
        } finally {
            setIsValidating(false)
        }
    }

    const removePromo = () => {
        setAppliedPromo(null)
        setFinalPrice(plan.total_amount)
        setPromoCode('')
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const processed = await normalizeImageFile(e.target.files[0])
                setFile(processed)
                setPreviewUrl(URL.createObjectURL(processed))
            } catch (err) {
                toast('Failed to process image', 'error')
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) {
            toast('Please upload payment proof', 'error')
            return
        }

        setIsSubmitting(true)
        try {
            // 1. Upload to storage
            const fileExt = file.name.split('.').pop()
            const fileName = `${plan.id}_proof_${Date.now()}.${fileExt}`
            const filePath = `plan-proofs/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('payment-proofs')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Update record via action
            const result = await uploadPlanPaymentProof(
                plan.id, 
                filePath, 
                appliedPromo?.id, 
                finalPrice
            )
            
            if (result.success) {
                setIsSuccess(true)
                toast('Payment proof submitted!', 'success')
            } else {
                toast(result.error || 'Failed to submit proof', 'error')
            }
        } catch (error: any) {
            toast(error.message || 'An error occurred', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isSuccess || plan.payment_proof_url) {
        return (
            <div className="bg-green-50/50 border border-green-200 rounded-3xl p-12 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-200">
                    <Check className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-serif font-black text-charcoal-900 mb-4">Payment Proof Submitted</h2>
                <p className="text-charcoal-600 max-w-sm mx-auto leading-relaxed">
                    We've received your payment proof! The studio will verify it shortly and activate your {plan.plan_type}.
                </p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Price Summary & Promo Code */}
            <div className="bg-white rounded-3xl border border-charcoal-100 p-8 shadow-tight">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-charcoal-900 uppercase tracking-widest text-xs">Summary</h3>
                    <div className="px-3 py-1 bg-charcoal-50 rounded-full text-[10px] font-bold text-charcoal-500 uppercase">
                        {plan.plan_type}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-charcoal-500">Subtotal</span>
                        <span className="text-charcoal-900 font-medium">₱{plan.total_amount?.toLocaleString()}</span>
                    </div>

                    {appliedPromo && (
                        <div className="flex justify-between text-sm text-green-600 font-medium animate-in slide-in-from-right-2">
                            <span className="flex items-center gap-2">
                                <Ticket className="w-3 h-3" />
                                Discount ({appliedPromo.discount_type === 'percentage' ? `${appliedPromo.discount_value}%` : `₱${appliedPromo.discount_value}`})
                            </span>
                            <span>-₱{(plan.total_amount - finalPrice).toLocaleString()}</span>
                        </div>
                    )}

                    <div className="pt-4 border-t border-charcoal-50 flex justify-between items-center">
                        <span className="text-lg font-serif font-black text-charcoal-900">Total to Pay</span>
                        <span className="text-3xl font-serif font-black text-charcoal-900">₱{finalPrice.toLocaleString()}</span>
                    </div>
                </div>

                {/* Promo Code Input */}
                {!appliedPromo ? (
                    <div className="mt-8 flex gap-2">
                        <div className="relative flex-1">
                            <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-300" />
                            <input 
                                type="text"
                                placeholder="PROMO CODE"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                className="w-full pl-11 pr-4 py-4 bg-charcoal-50 rounded-2xl border-none text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-charcoal-900/10 placeholder:text-charcoal-200 transition-all"
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={handleApplyPromo}
                            disabled={!promoCode || isValidating}
                            className="px-6 rounded-2xl bg-charcoal-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-charcoal-800 disabled:opacity-50 transition-all flex items-center justify-center min-w-[100px]"
                        >
                            {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                        </button>
                    </div>
                ) : (
                    <div className="mt-8 p-4 bg-green-50 rounded-2xl flex justify-between items-center border border-green-100">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500 text-white rounded-lg flex items-center justify-center">
                                <Check className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Code Applied</p>
                                <p className="text-xs font-bold text-green-900">{promoCode}</p>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={removePromo}
                            className="p-2 text-charcoal-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Proof Upload */}
            <div className="space-y-4">
                <h3 className="font-bold text-charcoal-900 uppercase tracking-widest text-xs ml-2">Upload Payment Proof</h3>
                
                <label className={`block w-full border-2 border-dashed rounded-[32px] p-12 text-center transition-all cursor-pointer group hover:bg-white hover:shadow-tight
                    ${file ? 'border-green-500/30 bg-green-50/10' : 'border-charcoal-100 bg-charcoal-50/50'}
                `}>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    
                    {file ? (
                        <div className="space-y-6">
                            <div className="relative mx-auto w-48 h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-white rotate-2 group-hover:rotate-0 transition-transform">
                                {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-charcoal-900">{file.name}</p>
                                <p className="text-[10px] text-charcoal-400 uppercase tracking-widest mt-1">Click to replace</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-8">
                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-tight border border-charcoal-50 group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-charcoal-300" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-charcoal-900">Select payment screenshot</p>
                                <p className="text-[10px] text-charcoal-400 uppercase tracking-widest mt-1">PNG, JPG, or HEIC</p>
                            </div>
                        </div>
                    )}
                </label>
            </div>
            
            {/* Legal Agreement */}
            <div className="py-2">
                <LegalAgreementCheckbox 
                    checked={agreedToLegal}
                    onChange={setAgreedToLegal}
                    legalConfig={studio.website_config?.legal}
                />
            </div>

            <button 
                type="submit"
                disabled={!file || isSubmitting || !agreedToLegal}
                className="w-full py-6 rounded-[24px] bg-charcoal-900 text-white text-xs font-black uppercase tracking-[0.3em] hover:bg-charcoal-800 disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl shadow-charcoal-900/20 active:scale-[0.98]"
            >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                        Complete Purchase
                        <ChevronRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </form>
    )
}
