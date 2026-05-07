'use client'

import { useState } from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { AlertCircle, FileText, Loader2, RefreshCcw, Save, ShieldCheck } from 'lucide-react'
import { updateStudioWebsite } from '@/app/(dashboard)/studio/studio-actions'
import { useToast } from '@/components/ui/Toast'
import { clsx } from 'clsx'
import OnlineStorePageIntro from '@/components/studio/OnlineStorePageIntro'

type LegalDocKey = 'terms' | 'privacy' | 'refund'

interface LegalConfig {
    terms?: string
    privacy?: string
    refund?: string
}

interface WebsiteConfig {
    legal?: LegalConfig
    [key: string]: unknown
}

interface LegalStudio {
    id: string
    slug: string
    late_cancel_hours?: number | null
    website_config?: WebsiteConfig | null
}

interface LegalPageClientProps {
    studio: LegalStudio
}

export default function LegalPageClient({ studio }: LegalPageClientProps) {
    const { toast } = useToast()
    const initialConfig: WebsiteConfig = {
        ...(studio.website_config || {}),
        legal: studio.website_config?.legal || {}
    }

    const [config, setConfig] = useState<WebsiteConfig>(initialConfig)
    const [isSaving, setIsSaving] = useState(false)
    const [activeDoc, setActiveDoc] = useState<LegalDocKey>('terms')
    const [currentContent, setCurrentContent] = useState<string>(initialConfig.legal?.terms || '')
    const lateCancelHours = studio.late_cancel_hours ?? 12
    const completedCount = [initialConfig.legal?.terms, initialConfig.legal?.privacy, initialConfig.legal?.refund]
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
        .length

    const docs = [
        { id: 'l1', title: 'Terms and Conditions', key: 'terms', content: config.legal?.terms || '' },
        { id: 'l2', title: 'Privacy Policy', key: 'privacy', content: config.legal?.privacy || '' },
        { id: 'l3', title: 'Refund & Cancellation', key: 'refund', content: config.legal?.refund || '' }
    ] as const

    const handleSaveDoc = async () => {
        setIsSaving(true)
        const newLegal: LegalConfig = { ...(config.legal || {}), [activeDoc]: currentContent }
        const newConfig = { ...config, legal: newLegal }

        const formData = new FormData()
        formData.append('studioId', studio.id)
        formData.append('slug', studio.slug)
        formData.append('websiteConfig', JSON.stringify(newConfig))

        const result = await updateStudioWebsite(formData)
        if (result.success) {
            setConfig(newConfig)
            toast(`${docs.find(d => d.key === activeDoc)?.title} saved!`, 'success')
        } else {
            toast(result.error || 'Failed to update legal document', 'error')
        }
        setIsSaving(false)
    }

    const resetToTemplate = () => {
        if (confirm('Reset to standard template? This will overwrite your current draft.')) {
            const templates: Record<LegalDocKey, string> = {
                terms: "These Terms & Conditions govern your use of our Pilates studio services...",
                privacy: "We value your privacy and are committed to protecting your personal data...",
                refund: "Cancellations made within 24 hours of the class start time are non-refundable..."
            }
            setCurrentContent(templates[activeDoc])
        }
    }

    const actions = (
        <button
            onClick={handleSaveDoc}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-[#2D3282] rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-zinc-800 transition-all shadow-xl disabled:opacity-50"
        >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Document
        </button>
    )

    return (
        <StudioDashboardShell
            title="Legal Documents"
            description="Manage the terms, privacy, and refund documents displayed on your storefront."
            breadcrumbs={[{ label: 'Online Store', href: '/studio/online-store' }, { label: 'Legal Documents' }]}
            actions={actions}
        >
            <div className="space-y-16">
                <OnlineStorePageIntro
                    eyebrow="Compliance"
                    title="Write the legal documents that support trust across your storefront."
                    description="These pages explain your terms, privacy handling, and refund expectations. Keep them aligned with your cancellation rules and waiver language so customers see one consistent policy system."
                    primaryAction={{ label: 'Back To Overview', href: '/studio/online-store' }}
                    secondaryAction={{ label: 'View Live Site', href: `/s/${studio.slug}` }}
                    metrics={[
                        { label: 'Completed Docs', value: `${completedCount}/3` },
                        { label: 'Late Cancel Rule', value: `${lateCancelHours}h` },
                    ]}
                />

                <div className="space-y-6">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-[#2D3282]" />
                            Legal Documents
                        </h2>
                        <p className="text-sm font-bold text-zinc-400">
                            Write and manage the legal documents displayed on your storefront.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                        <div className="md:col-span-4 space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-2">Documents</h4>
                            <div className="flex flex-col gap-3">
                                {docs.map((doc) => (
                                    <button
                                        key={doc.key}
                                        onClick={() => {
                                            setActiveDoc(doc.key)
                                            setCurrentContent(config.legal?.[doc.key] || '')
                                        }}
                                        className={clsx(
                                            "p-6 rounded-[2rem] border-2 transition-all text-left flex items-start justify-between group",
                                            activeDoc === doc.key
                                                ? "border-[#2D3282] bg-indigo-50/50 shadow-md"
                                                : "border-transparent bg-white shadow-sm hover:border-zinc-200"
                                        )}
                                    >
                                        <div className="space-y-1">
                                            <h5 className={clsx(
                                                "text-[13px] font-black tracking-tight",
                                                activeDoc === doc.key ? "text-zinc-900" : "text-zinc-500"
                                            )}>{doc.title}</h5>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                {config.legal?.[doc.key] ? 'Active' : 'Missing Content'}
                                            </p>
                                        </div>
                                        <div className={clsx(
                                            "p-2 rounded-xl transition-all",
                                            activeDoc === doc.key ? "bg-[#2D3282] text-white" : "bg-zinc-50 text-zinc-300 group-hover:bg-zinc-100"
                                        )}>
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="bg-amber-50 rounded-[2rem] border border-amber-100 p-8 space-y-4">
                                <div className="flex items-center gap-3 text-amber-600">
                                    <AlertCircle className="w-5 h-5" />
                                    <h6 className="text-[11px] font-black uppercase tracking-widest">Compliance Tip</h6>
                                </div>
                                <p className="text-[12px] text-amber-700 leading-relaxed italic">
                                    Ensure your Refund & Cancellation policy clearly states your {lateCancelHours}-hour notice requirement to minimize revenue loss.
                                </p>
                            </div>
                        </div>

                        <div className="md:col-span-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    Editing: {docs.find(d => d.key === activeDoc)?.title}
                                </h4>
                                <button
                                    onClick={resetToTemplate}
                                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
                                >
                                    <RefreshCcw className="w-3.5 h-3.5" />
                                    Reset to Template
                                </button>
                            </div>

                            <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-xl overflow-hidden focus-within:border-indigo-200 transition-colors">
                                <textarea
                                    value={currentContent}
                                    onChange={(e) => setCurrentContent(e.target.value)}
                                    placeholder={`Write your ${docs.find(d => d.key === activeDoc)?.title.toLowerCase()} here...`}
                                    className="w-full min-h-[500px] p-12 text-[14px] font-medium leading-relaxed bg-transparent focus:outline-none focus:ring-0 resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between px-8 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                                <span>Word count: {currentContent.split(/\s+/).filter(w => w.length > 0).length}</span>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5"><FileText className="w-3 h-3" /> Auto-saving disabled</span>
                                    {isSaving && <Loader2 className="w-3 h-3 animate-spin text-[#2D3282]" />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </StudioDashboardShell>
    )
}
