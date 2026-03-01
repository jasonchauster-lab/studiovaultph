'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Upload, CheckCircle2, QrCode, CreditCard } from 'lucide-react'
import { topUpWallet, submitTopUpPaymentProof } from '@/app/(dashboard)/customer/actions'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

interface TopUpModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function TopUpModal({ isOpen, onClose }: TopUpModalProps) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [amount, setAmount] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [topUpId, setTopUpId] = useState<string | null>(null)
    const [proofFile, setProofFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)
    const [zoomedImage, setZoomedImage] = useState<string | null>(null)

    useEffect(() => {
        // Cleanup the object URL when the component unmounts or previewUrl changes
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

    if (!isOpen) return null

    const handleAmountSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount.')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const result = await topUpWallet(parseFloat(amount))
            if (result.error) {
                setError(result.error)
            } else if (result.topUpId) {
                setTopUpId(result.topUpId)
                setStep(2)
            }
        } catch (err) {
            setError('Failed to create top-up request.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Clean up old preview URL if it exists
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl)
            }
            setProofFile(file)
            setPreviewUrl(URL.createObjectURL(file))
        }
    }

    const handleProofSubmit = async () => {
        if (!proofFile || !topUpId) {
            setError('Please upload a proof of payment.')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            // 1. Convert file to base64
            const reader = new FileReader()
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(proofFile)
            })

            const base64String = await base64Promise

            // 2. Submit Top-up proof via server action (handles storage upload & DB update)
            const result = await submitTopUpPaymentProof(topUpId!, base64String)

            if (result.error) {
                setError(result.error)
            } else {
                setIsSuccess(true)
                setStep(4) // Success step
                router.refresh()
            }
        } catch (err: any) {
            console.error('Submission error:', err)
            setError('Failed to process payment proof. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const resetAndClose = () => {
        setStep(1)
        setAmount('')
        setTopUpId(null)
        setProofFile(null)
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl)
        }
        setPreviewUrl(null)
        setError(null)
        setIsSuccess(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-charcoal-900/60 backdrop-blur-sm" onClick={resetAndClose} />

            {/* Zoom Overlay */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-charcoal-900/90 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <button
                        onClick={() => setZoomedImage(null)}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={zoomedImage}
                        alt="Zoomed View"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300"
                    />
                </div>
            )}

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-cream-100 bg-cream-50/30">
                    <h3 className="text-xl font-serif text-charcoal-900">
                        {step === 1 && 'Top-Up Wallet'}
                        {step === 2 && 'Payment Details'}
                        {step === 3 && 'Upload Proof'}
                        {step === 4 && 'Request Submitted'}
                    </h3>
                    <button onClick={resetAndClose} className="p-2 hover:bg-cream-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-charcoal-500" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Amount */}
                    {step === 1 && (
                        <form onSubmit={handleAmountSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-charcoal-700 mb-2">
                                    How much would you like to top up?
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-400 font-medium">₱</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-3 bg-cream-50/50 border border-cream-200 rounded-xl focus:ring-2 focus:ring-rose-gold focus:border-rose-gold outline-none transition-all text-lg font-medium text-charcoal-900 placeholder:text-charcoal-400"
                                        required
                                    />
                                </div>
                                <p className="mt-2 text-xs text-charcoal-500">
                                    This amount will be added to your balance once the payment is verified.
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-charcoal-900 text-cream-50 rounded-xl font-bold hover:bg-charcoal-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Payment Details */}
                    {step === 2 && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* GCash */}
                                <div className="group bg-blue-50/50 border border-blue-100 rounded-2xl p-6 text-center hover:bg-blue-50 transition-all cursor-default">
                                    <div
                                        className="bg-white p-2 rounded-xl shadow-md mb-4 inline-block transform group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                                        onClick={() => setZoomedImage('/gcash-qr.jpg')}
                                    >
                                        <img src="/gcash-qr.jpg" alt="GCash QR" className="w-48 h-48 object-contain mx-auto rounded-lg" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400?text=GCash+QR' }} />
                                    </div>
                                    <h4 className="font-bold text-blue-900 flex items-center justify-center gap-2 mb-1">
                                        <QrCode className="w-5 h-5" /> GCash
                                    </h4>
                                    <p className="text-xs text-blue-700 font-medium opacity-70 italic mb-2">Scan & Pay via App</p>
                                    <p className="text-sm text-blue-800 font-bold bg-white/50 py-1 px-3 rounded-full inline-block text-center">0917 500 0000</p>
                                </div>

                                {/* BPI */}
                                <div className="group bg-red-50/50 border border-red-100 rounded-2xl p-6 text-center hover:bg-red-50 transition-all cursor-default">
                                    <div
                                        className="bg-white p-2 rounded-xl shadow-md mb-4 inline-block transform group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                                        onClick={() => setZoomedImage('/bpi-qr.jpg')}
                                    >
                                        <img src="/bpi-qr.jpg" alt="BPI QR" className="w-48 h-48 object-contain mx-auto rounded-lg" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400?text=BPI+QR' }} />
                                    </div>
                                    <h4 className="font-bold text-red-900 flex items-center justify-center gap-2 mb-1">
                                        <CreditCard className="w-5 h-5" /> BPI
                                    </h4>
                                    <p className="text-xs text-red-700 font-medium opacity-70 italic mb-2">Transfer to Account</p>
                                    <p className="text-sm text-red-800 font-bold bg-white/50 py-1 px-3 rounded-full inline-block text-center">1234-5678-90</p>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3">
                                <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-900 leading-relaxed">
                                    Scan either QR code above and pay exactly <span className="font-bold">₱{parseFloat(amount).toLocaleString()}</span>.
                                    Once done, click "I have paid" to upload your receipt.
                                </p>
                            </div>

                            <button
                                onClick={() => setStep(3)}
                                className="w-full py-4 bg-charcoal-900 text-cream-50 rounded-xl font-bold hover:bg-charcoal-800 transition-all"
                            >
                                I have paid
                            </button>
                        </div>
                    )}

                    {/* Step 3: Proof Upload */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-cream-200 rounded-2xl p-8 text-center bg-cream-50/30">
                                {previewUrl ? (
                                    <div className="relative inline-block group">
                                        <img
                                            src={previewUrl}
                                            alt="Proof Preview"
                                            className="max-h-64 rounded-lg shadow-md border border-white cursor-zoom-in hover:opacity-90 transition-opacity"
                                            onClick={() => setZoomedImage(previewUrl)}
                                        />
                                        <button
                                            onClick={() => { setProofFile(null); setPreviewUrl(null); }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                            <Upload className="w-8 h-8 text-rose-gold" />
                                        </div>
                                        <p className="font-medium text-charcoal-900">Upload Transfer Receipt</p>
                                        <p className="text-xs text-charcoal-500 mt-1">PNG, JPG or JPEG (Max 5MB)</p>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </label>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-4 bg-cream-100 text-charcoal-700 rounded-xl font-bold hover:bg-cream-200 transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleProofSubmit}
                                    disabled={isLoading || !proofFile}
                                    className="flex-[2] py-4 bg-charcoal-900 text-cream-50 rounded-xl font-bold hover:bg-charcoal-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <div className="py-8 text-center">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-12 h-12 text-green-500" />
                            </div>
                            <h4 className="text-2xl font-serif text-charcoal-900 mb-2">Request Submitted!</h4>
                            <p className="text-charcoal-600 mb-8 max-w-sm mx-auto">
                                Your top-up is pending admin verification. Your balance will update once approved.
                            </p>
                            <button
                                onClick={resetAndClose}
                                className="w-full py-4 bg-charcoal-900 text-cream-50 rounded-xl font-bold hover:bg-charcoal-800 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer / Progress Indicator */}
                {step < 4 && (
                    <div className="p-6 bg-cream-50/30 border-t border-cream-100">
                        <div className="flex justify-between items-center max-w-[200px] mx-auto">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step === s ? 'bg-charcoal-900 w-8' :
                                        step > s ? 'bg-green-500' : 'bg-cream-200'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
