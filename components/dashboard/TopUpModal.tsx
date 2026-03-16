'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Loader2, Upload, CheckCircle2, QrCode, CreditCard, Copy, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { normalizeImageFile } from '@/lib/utils/image-utils'
import { topUpWallet, uploadTopUpProof } from '@/app/(dashboard)/customer/actions'

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
    const [copiedAccount, setCopiedAccount] = useState<string | null>(null)

    const handleCopy = async (text: string, accountName: string) => {
        try {
            await navigator.clipboard.writeText(text.replace(/\s|-/g, ''))
            setCopiedAccount(accountName)
            setTimeout(() => setCopiedAccount(null), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setIsLoading(true)
            setError(null)
            try {
                const processedFile = await normalizeImageFile(file)
                
                // Clean up old preview URL if it exists
                if (previewUrl && previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(previewUrl)
                }
                setProofFile(processedFile)
                setPreviewUrl(URL.createObjectURL(processedFile))
            } catch (err) {
                console.error('File processing error:', err)
                setError('Failed to process image format.')
            } finally {
                setIsLoading(false)
            }
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
            const formData = new FormData()
            formData.append('topUpId', topUpId)
            formData.append('file', proofFile)

            const result = await uploadTopUpProof(formData)

            if (result.error) {
                setError(result.error)
            } else {
                setIsSuccess(true)
                setStep(4) // Success step
                router.refresh()
            }
        } catch (err: any) {
            console.error('Submission error:', err)
            setError('Failed to submit payment proof. Please try again.')
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
            <div className="absolute inset-0 bg-burgundy/50" onClick={resetAndClose} />

            {/* Zoom Overlay */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-burgundy/95 animate-in fade-in duration-200 cursor-zoom-out"
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

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center p-8 border-b border-border-grey bg-off-white">
                    <h3 className="text-2xl font-serif font-bold text-burgundy tracking-tight">
                        {step === 1 && 'Top-Up Wallet'}
                        {step === 2 && 'Payment Details'}
                        {step === 3 && 'Upload Proof'}
                        {step === 4 && 'Request Submitted'}
                    </h3>
                    <button onClick={resetAndClose} className="p-2 hover:bg-burgundy/5 rounded-xl transition-colors text-burgundy/40 hover:text-burgundy">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 pb-16">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-wider rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Step 1: Amount */}
                    {step === 1 && (
                        <form onSubmit={handleAmountSubmit} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-bold text-slate uppercase tracking-widest mb-3">
                                    How much would you like to top up?
                                </label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-burgundy font-serif text-2xl font-bold">₱</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-12 pr-6 py-5 bg-off-white border border-border-grey rounded-2xl focus:ring-1 focus:ring-burgundy focus:border-burgundy outline-none transition-all text-2xl font-serif font-bold text-burgundy placeholder:text-burgundy/20"
                                        required
                                    />
                                </div>
                                <p className="mt-4 text-[10px] text-slate font-medium leading-relaxed">
                                    This amount will be added to your balance once the payment transfer is verified by our team.
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-forest w-full py-5 text-xs font-bold uppercase tracking-[0.3em] disabled:opacity-50"
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
                                <div className="group bg-[#007DFF]/5 border border-[#007DFF]/10 rounded-2xl p-6 text-center hover:bg-[#007DFF]/10 transition-all cursor-default shadow-tight">
                                    <div
                                        className="bg-white p-2 rounded-xl shadow-md mb-4 inline-block transform group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                                        onClick={() => setZoomedImage('/gcash-qr.jpg')}
                                    >
                                        <img src="/gcash-qr.jpg" alt="GCash QR" className="w-32 h-32 md:w-40 md:h-40 object-contain mx-auto rounded-lg" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400?text=GCash+QR' }} />
                                    </div>
                                    <h4 className="font-bold text-[#007DFF] flex items-center justify-center gap-2 mb-2 text-xs uppercase tracking-wider">
                                        <QrCode className="w-4 h-4" /> GCash
                                    </h4>
                                    <button
                                        onClick={() => handleCopy('0917 500 0000', 'GCash')}
                                        className="text-[10px] text-blue-800 font-bold bg-white/50 py-1.5 px-3 rounded-full flex items-center justify-center gap-2 mx-auto border border-blue-100 hover:bg-white transition-colors active:scale-95"
                                    >
                                        {copiedAccount === 'GCash' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copiedAccount === 'GCash' ? 'Copied' : '0917 500 0000'}
                                    </button>
                                </div>

                                {/* BPI */}
                                <div className="group bg-red-50/50 border border-red-100 rounded-2xl p-6 text-center hover:bg-red-50 transition-all cursor-default shadow-tight">
                                    <div
                                        className="bg-white p-2 rounded-xl shadow-md mb-4 inline-block transform group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                                        onClick={() => setZoomedImage('/bpi-qr.jpg')}
                                    >
                                        <img src="/bpi-qr.jpg" alt="BPI QR" className="w-32 h-32 md:w-40 md:h-40 object-contain mx-auto rounded-lg" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x400?text=BPI+QR' }} />
                                    </div>
                                    <h4 className="font-bold text-red-900 flex items-center justify-center gap-2 mb-2 text-xs uppercase tracking-wider">
                                        <CreditCard className="w-4 h-4" /> BPI
                                    </h4>
                                    <button
                                        onClick={() => handleCopy('1234-5678-90', 'BPI')}
                                        className="text-[10px] text-red-800 font-bold bg-white/50 py-1.5 px-3 rounded-full flex items-center justify-center gap-2 mx-auto border border-red-100 hover:bg-white transition-colors active:scale-95"
                                    >
                                        {copiedAccount === 'BPI' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copiedAccount === 'BPI' ? 'Copied' : '1234-5678-90'}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-buttermilk/30 border border-buttermilk/50 p-5 rounded-2xl flex gap-4">
                                <CheckCircle2 className="w-5 h-5 text-burgundy/40 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-burgundy/80 font-medium leading-relaxed">
                                    Scan either QR code above and pay exactly <span className="font-bold text-burgundy underline decoration-gold/50 decoration-2 underline-offset-2">₱{parseFloat(amount).toLocaleString()}</span>.
                                    Once done, click "I have paid" to upload your receipt.
                                </p>
                            </div>

                            <button
                                onClick={() => setStep(3)}
                                className="btn-forest w-full py-5 text-xs font-bold uppercase tracking-[0.3em]"
                            >
                                I have paid
                            </button>
                        </div>
                    )}

                    {/* Step 3: Proof Upload */}
                    {step === 3 && (
                        <div className="space-y-8">
                            <div className="border-2 border-dashed border-border-grey rounded-2xl p-10 text-center bg-off-white transition-colors hover:border-burgundy/20 group">
                                {previewUrl ? (
                                    <div className="relative inline-block group/preview">
                                        <img
                                            src={previewUrl}
                                            alt="Proof Preview"
                                            className="max-h-64 rounded-xl shadow-card border-4 border-white cursor-zoom-in hover:opacity-90 transition-opacity"
                                            onClick={() => setZoomedImage(previewUrl)}
                                        />
                                        <button
                                            onClick={() => { setProofFile(null); setPreviewUrl(null); }}
                                            className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover/preview:opacity-100 transition-opacity hover:scale-110 active:scale-90"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex flex-col items-center">
                                        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-tight mb-5 group-hover:scale-105 transition-transform duration-500 border border-border-grey">
                                            <Upload className="w-8 h-8 text-burgundy/40" />
                                        </div>
                                        <p className="font-serif font-bold text-burgundy text-lg">Upload Transfer Receipt</p>
                                        <p className="text-[10px] text-slate font-bold uppercase tracking-widest mt-2">PNG, JPG or iPhone (HEIC) (Max 5MB)</p>
                                        <input type="file" className="hidden" accept="image/*,.heic,.heif" onChange={handleFileChange} />
                                    </label>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-5 bg-off-white text-burgundy border border-border-grey rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white transition-all shadow-tight active:scale-95"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleProofSubmit}
                                    disabled={isLoading || !proofFile}
                                    className="flex-[2] btn-forest py-5 text-xs font-bold uppercase tracking-[0.3em] disabled:opacity-50"
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <div className="py-12 text-center space-y-8">
                            <div className="w-24 h-24 bg-buttermilk rounded-full flex items-center justify-center mx-auto shadow-tight border-4 border-white animate-in zoom-in duration-500">
                                <CheckCircle2 className="w-12 h-12 text-burgundy" />
                            </div>
                            <div>
                                <h4 className="text-4xl font-serif font-bold text-burgundy tracking-tight mb-3">Request Submitted</h4>
                                <p className="text-[11px] text-slate font-bold uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                                    Your top-up is pending verification. Your balance will update once approved by our finance team.
                                </p>
                            </div>
                            <button
                                onClick={resetAndClose}
                                className="btn-forest w-full py-5 text-xs font-bold uppercase tracking-[0.3em]"
                            >
                                Done
                            </button>
                        </div>
                    )}
                    </div>
                </div>

                {/* Footer / Progress Indicator */}
                {step < 4 && (
                    <div className="p-8 bg-off-white border-t border-border-grey">
                        <div className="flex justify-between items-center max-w-[160px] mx-auto">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${step === s ? 'bg-forest w-10' :
                                        step > s ? 'bg-burgundy/20 w-6' : 'bg-border-grey w-6'
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
