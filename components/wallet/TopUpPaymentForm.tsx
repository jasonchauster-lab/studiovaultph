'use client'

import { useState, useEffect } from 'react'
import { Upload, CheckCircle, AlertCircle, Eye, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { submitTopUpPaymentProof } from '@/app/(dashboard)/customer/actions'

interface TopUpPaymentFormProps {
    topUpId: string
    amount: number
}

export default function TopUpPaymentForm({ topUpId, amount }: TopUpPaymentFormProps) {
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            setError(null)

            if (selectedFile.type.startsWith('image/')) {
                const url = URL.createObjectURL(selectedFile)
                setPreviewUrl(url)
            } else {
                setPreviewUrl(null)
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) {
            setError('Please select a screenshot of your payment.')
            return
        }

        setIsUploading(true)
        setError(null)

        try {
            // 1. Upload File
            const fileExt = file.name.split('.').pop()
            const fileName = `topup_${topUpId}_${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('payment-proofs')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('payment-proofs')
                .getPublicUrl(filePath)

            // 3. Submit Top-up proof
            const result = await submitTopUpPaymentProof(topUpId, publicUrl)

            if (result.error) {
                throw new Error(result.error)
            }

            setSuccess(true)
            router.refresh()

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Failed to upload payment proof.')
        } finally {
            setIsUploading(false)
        }
    }

    if (success) {
        return (
            <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center animate-in fade-in duration-500">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-green-900 mb-2">Request Submitted!</h3>
                <p className="text-green-700 mb-6">
                    Your top-up request is now pending Admin verification.
                    You will receive an email once it has been approved.
                </p>
                <button
                    onClick={() => router.push('/customer/wallet')}
                    className="bg-charcoal-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-charcoal-800 transition-colors"
                >
                    Back to Wallet
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h4 className="font-medium text-charcoal-900 mb-3 text-sm uppercase tracking-wider opacity-60">Upload Payment Proof</h4>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 mb-4 text-sm animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                <label className="block w-full border-2 border-dashed border-cream-300 rounded-xl p-8 text-center transition-all cursor-pointer hover:border-rose-gold hover:bg-rose-gold/5 group">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    {file ? (
                        <div className="space-y-4">
                            <div className="text-charcoal-900 font-medium flex flex-col items-center">
                                <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                                <span className="text-sm truncate max-w-[240px]">{file.name}</span>
                                <span className="text-xs text-charcoal-500 mt-1">Click to change</span>
                            </div>

                            {previewUrl && (
                                <div className="relative mx-auto w-48 h-48 rounded-xl overflow-hidden border border-cream-200 bg-white group shadow-sm">
                                    <img
                                        src={previewUrl}
                                        alt="Payment proof preview"
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-charcoal-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                        <Eye className="w-6 h-6" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-charcoal-500 flex flex-col items-center">
                            <div className="w-12 h-12 bg-cream-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Upload className="w-6 h-6 text-rose-gold" />
                            </div>
                            <span className="font-medium text-charcoal-900">Click to upload screenshot</span>
                            <span className="text-xs mt-1">JPG, PNG supported</span>
                        </div>
                    )}
                </label>
            </div>

            <button
                type="submit"
                disabled={!file || isUploading}
                className="w-full py-4 bg-charcoal-900 text-white rounded-xl font-bold hover:bg-charcoal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-charcoal-900/10 flex items-center justify-center gap-2"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                    </>
                ) : (
                    'Submit Top-up Receipt'
                )}
            </button>
        </form>
    )
}
