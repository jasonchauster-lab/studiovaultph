'use client'

import { useState } from 'react'
import { updateStudioPaymentSettings } from '@/app/(dashboard)/studio/studio-actions'
import { 
    Loader2, Save, Plus, Smartphone, 
    Sparkles, Upload, 
    X, CheckCircle, AlertCircle, HelpCircle, Copy, Check, ChevronDown, ChevronUp
} from 'lucide-react'
import clsx from 'clsx'
import Image from 'next/image'
import { getSupabaseAssetUrl } from '@/lib/supabase/utils'
import { normalizeImageFile } from '@/lib/utils/image-utils'
import { useToast } from '@/components/ui/Toast'

interface ManualMethod {
    id: string
    type: string
    recipient_name: string
    account_number: string
    qr_code_url?: string
    qr_code_file?: File | null
    qr_preview_url?: string | null
}

interface PaymentStudio {
    id: string
    enable_xendit?: boolean
    xendit_api_key?: string | null
    xendit_callback_token?: string | null
    enable_manual_payments?: boolean
    manual_payment_methods?: ManualMethod[]
}

export default function PaymentMethodsSettings({ studio }: { studio: PaymentStudio }) {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [showGuide, setShowGuide] = useState(false)
    const [copied, setCopied] = useState(false)

    // Xendit State
    const [enableXendit, setEnableXendit] = useState(studio.enable_xendit || false)
    const [xenditApiKey, setXenditApiKey] = useState(studio.xendit_api_key || '')
    const [xenditCallbackToken, setXenditCallbackToken] = useState(studio.xendit_callback_token || '')

    // Manual Methods State
    const [enableManual, setEnableManual] = useState(studio.enable_manual_payments || false)
    const [manualMethods, setManualMethods] = useState<ManualMethod[]>(
        studio.manual_payment_methods || []
    )

    const webhookUrl = 'https://studiovaultph.com/api/webhooks/xendit'

    const copyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast('Webhook URL copied to clipboard', 'success')
    }

    const addManualMethod = () => {
        // IMPROVED: Use secure UUIDs instead of Math.random
        const newMethod: ManualMethod = {
            id: crypto.randomUUID(),
            type: 'GCash',
            recipient_name: '',
            account_number: '',
            qr_code_file: null,
            qr_preview_url: null
        }
        setManualMethods([...manualMethods, newMethod])
    }

    const removeManualMethod = (id: string) => {
        setManualMethods(manualMethods.filter(m => m.id !== id))
    }

    const updateManualMethod = (id: string, updates: Partial<ManualMethod>) => {
        setManualMethods(manualMethods.map(m => m.id === id ? { ...m, ...updates } : m))
    }

    const handleQrChange = async (id: string, file: File | null) => {
        if (!file) {
            updateManualMethod(id, { qr_code_file: null, qr_preview_url: null })
            return
        }

        try {
            const normalized = await normalizeImageFile(file, { maxWidth: 800, quality: 0.8 })
            const url = URL.createObjectURL(normalized)
            updateManualMethod(id, { qr_code_file: normalized, qr_preview_url: url })
        } catch (err) {
            console.error('QR code normalization error:', err)
            toast('Failed to process image', 'error')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccess(false)

        try {
            const formData = new FormData()
            formData.append('studioId', studio.id)
            formData.append('enableXendit', String(enableXendit))
            formData.append('xenditApiKey', xenditApiKey)
            formData.append('xenditCallbackToken', xenditCallbackToken)
            formData.append('enableManualPayments', String(enableManual))

            const methodsToStore = manualMethods.map((m) => {
                const method = { ...m }
                delete method.qr_code_file
                delete method.qr_preview_url
                
                if (m.qr_code_file) {
                    formData.append(`qr_code_file_${m.id}`, m.qr_code_file)
                }
                return method
            })

            formData.append('manualPaymentMethods', JSON.stringify(methodsToStore))

            const result = await updateStudioPaymentSettings(formData)
            
            if (result?.error) {
                setError(result.error)
                toast(result.error, 'error')
            } else {
                setSuccess(true)
                toast('Payment settings updated', 'success')
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
            setError(message)
            toast('An unexpected error occurred', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 gap-8">
                {/* Auto Checkout (Xendit) Card */}
                <div className={clsx(
                    "bg-white p-8 rounded-2xl border transition-all space-y-6 shadow-sm",
                    enableXendit ? "border-indigo-100 ring-1 ring-indigo-50" : "border-zinc-100"
                )}>
                    <div className="flex items-center justify-between pb-6 border-b border-zinc-50">
                        <div className="flex items-center gap-4">
                            <div className={clsx(
                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                enableXendit ? "bg-indigo-50 text-[#2D3282]" : "bg-zinc-50 text-zinc-300"
                            )}>
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-zinc-900 tracking-tight">Auto Checkout</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Powered by Xendit</p>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setEnableXendit(!enableXendit)}
                            className={clsx(
                                "w-12 h-6 rounded-full p-1 transition-all relative",
                                enableXendit ? "bg-[#2D3282]" : "bg-zinc-200"
                            )}
                        >
                            <div className={clsx(
                                "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                enableXendit ? "translate-x-6" : "translate-x-0"
                            )} />
                        </button>
                    </div>

                    {enableXendit && (
                        <div className="space-y-6 pt-2 animate-in slide-in-from-top-2">
                            <button
                                type="button"
                                onClick={() => setShowGuide(!showGuide)}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#2D3282] hover:opacity-70 transition-all border border-indigo-100 bg-indigo-50/50 px-4 py-2 rounded-lg"
                            >
                                <HelpCircle className="w-3 h-3" />
                                {showGuide ? 'Hide Setup Guide' : 'Need help finding your keys?'}
                                {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {showGuide && (
                                <div className="p-6 bg-indigo-50/30 border border-indigo-100 rounded-2xl space-y-4 text-sm text-zinc-600 leading-relaxed animate-in zoom-in-95 duration-300">
                                    <h4 className="font-black text-zinc-900 text-xs uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-[#2D3282]" />
                                        Step-by-Step Setup
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                        <div className="space-y-2">
                                            <p className="font-bold text-zinc-900 text-xs italic">1. Get your API Keys</p>
                                            <p className="text-xs">Log in to your <strong>Xendit Dashboard</strong>, go to <strong>Settings &gt; Developers &gt; API Keys</strong>. Create a new <strong>Secret Key</strong> with "Write" permissions for Invoices and Refunds.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="font-bold text-zinc-900 text-xs italic">2. Enable Webhooks</p>
                                            <p className="text-xs">Go to <strong>Settings &gt; Developers &gt; Webhooks</strong>. Under "Invoice Paid", paste the Webhook URL provided below.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="font-bold text-zinc-900 text-xs italic">3. Copy Verification Token</p>
                                            <p className="text-xs">Copy the "Verification Token" from Xendit and paste it into the <strong>Webhook Callback Token</strong> field here.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <p className="font-bold text-zinc-900 text-xs italic">4. Save & Test</p>
                                            <p className="text-xs">Click "Save Changes" at the bottom of this page. Your storefront will now automatically accept payments!</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="p-5 bg-zinc-900 rounded-2xl space-y-3 shadow-lg">
                                <div className="flex items-center justify-between">
                                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Your Webhook URL</label>
                                    <button 
                                        type="button"
                                        onClick={copyWebhook}
                                        className="text-[9px] font-black uppercase tracking-widest text-[#8E94F2] hover:text-white transition-colors flex items-center gap-1.5"
                                    >
                                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        {copied ? 'Copied!' : 'Copy Link'}
                                    </button>
                                </div>
                                <div className="text-xs font-mono text-zinc-300 break-all bg-white/5 p-3 rounded-lg border border-white/10 uppercase tracking-tighter">
                                    {webhookUrl}
                                </div>
                                <p className="text-[9px] text-zinc-500 font-medium">Paste this into Xendit Dashboard &gt; Developers &gt; Webhooks</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Xendit Secret API Key</label>
                                    <input 
                                        type="password"
                                        value={xenditApiKey}
                                        onChange={(e) => setXenditApiKey(e.target.value)}
                                        placeholder="xnd_development_..."
                                        className="w-full px-5 py-3 bg-zinc-50/50 border border-zinc-200 rounded-lg text-sm font-mono focus:ring-1 focus:ring-[#2D3282] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Webhook Callback Token</label>
                                    <input 
                                        type="password"
                                        value={xenditCallbackToken}
                                        onChange={(e) => setXenditCallbackToken(e.target.value)}
                                        placeholder="Verify token"
                                        className="w-full px-5 py-3 bg-zinc-50/50 border border-zinc-200 rounded-lg text-sm font-mono focus:ring-1 focus:ring-[#2D3282] outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Manual Payouts Card */}
                <div className={clsx(
                    "bg-white p-8 rounded-2xl border transition-all space-y-6 shadow-sm",
                    enableManual ? "border-indigo-100 ring-1 ring-indigo-50" : "border-zinc-100"
                )}>
                    <div className="flex items-center justify-between pb-6 border-b border-zinc-50">
                        <div className="flex items-center gap-4">
                            <div className={clsx(
                                "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                enableManual ? "bg-indigo-50 text-[#2D3282]" : "bg-zinc-50 text-zinc-300"
                            )}>
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-zinc-900 tracking-tight">Manual Payments</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">GCash, Maya, or Bank Transfer</p>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => setEnableManual(!enableManual)}
                            className={clsx(
                                "w-12 h-6 rounded-full p-1 transition-all relative",
                                enableManual ? "bg-[#2D3282]" : "bg-zinc-200"
                            )}
                        >
                            <div className={clsx(
                                "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                                enableManual ? "translate-x-6" : "translate-x-0"
                            )} />
                        </button>
                    </div>

                    {enableManual && (
                        <div className="space-y-6 pt-2 animate-in slide-in-from-top-2">
                            {manualMethods.map((method) => (
                                <div key={method.id} className="relative p-6 rounded-xl bg-zinc-50/50 border border-zinc-100 group">
                                    <button 
                                        type="button" 
                                        onClick={() => removeManualMethod(method.id)}
                                        className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                    
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                                        <div className="lg:col-span-8 space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Method Type</label>
                                                    <select 
                                                        value={method.type}
                                                        onChange={(e) => updateManualMethod(method.id, { type: e.target.value })}
                                                        className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-bold text-zinc-900 focus:ring-1 focus:ring-[#2D3282] outline-none"
                                                    >
                                                        <option value="GCash">GCash</option>
                                                        <option value="Maya">Maya</option>
                                                        <option value="BDO">BDO Transfer</option>
                                                        <option value="BPI">BPI Transfer</option>
                                                        <option value="UBP">UnionBank</option>
                                                        <option value="Others">Other Bank</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Account No. / Phone</label>
                                                    <input 
                                                        type="text"
                                                        value={method.account_number}
                                                        onChange={(e) => updateManualMethod(method.id, { account_number: e.target.value })}
                                                        placeholder="0917-XXX-XXXX"
                                                        className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-bold text-zinc-900 focus:ring-1 focus:ring-[#2D3282] outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Recipient Name</label>
                                                <input 
                                                    type="text"
                                                    value={method.recipient_name}
                                                    onChange={(e) => updateManualMethod(method.id, { recipient_name: e.target.value })}
                                                    placeholder="Juan De La Cruz"
                                                    className="w-full px-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-bold text-zinc-900 focus:ring-1 focus:ring-[#2D3282] outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="lg:col-span-4 space-y-2">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">QR Image</label>
                                            <div className="relative aspect-square bg-white border border-dashed border-zinc-200 rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-50 transition-all overflow-hidden">
                                                {(method.qr_preview_url || method.qr_code_url) ? (
                                                    <div className="absolute inset-0">
                                                        <Image 
                                                            src={method.qr_preview_url || getSupabaseAssetUrl(method.qr_code_url, 'studios') || '/default-qr.svg'} 
                                                            alt="QR Code"
                                                            fill
                                                            className="object-contain p-2"
                                                            unoptimized
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center text-center p-4">
                                                        <Upload className="w-5 h-5 text-zinc-200 mb-2" />
                                                        <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-300">Upload</span>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleQrChange(method.id, e.target.files?.[0] || null)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button 
                                type="button" 
                                onClick={addManualMethod}
                                className="w-full py-4 border-2 border-dashed border-zinc-100 rounded-xl flex items-center justify-center gap-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-all"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Add Payment Method</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    {success && <div className="text-[#2D3282] text-[10px] font-bold uppercase bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 flex items-center gap-2 animate-in fade-in"><CheckCircle className="w-4 h-4" /> Published</div>}
                    {error && <div className="text-rose-500 text-[10px] font-bold uppercase bg-rose-50 px-4 py-2 rounded-lg border border-rose-100 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
                </div>
                
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto px-10 py-3.5 bg-[#2D3282] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-indigo-900 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>
        </form>
    )
}
