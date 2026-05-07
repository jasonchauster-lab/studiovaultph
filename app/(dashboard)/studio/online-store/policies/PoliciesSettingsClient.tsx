'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Search, Plus, MoreVertical, 
    ChevronDown, Trash2, Edit2, Clock,
    Timer, AlertTriangle, Save, Loader2, CheckCircle,
    ShieldCheck, FileText, RefreshCcw
} from 'lucide-react'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import { useToast } from '@/components/ui/Toast'
import Modal from '@/components/shared/Modal'
import { upsertPolicyAction, deletePolicyAction, updateCancellationRulesAction } from './actions'
import { updateStudioWebsite } from '@/app/(dashboard)/studio/studio-actions'

interface PolicyRecord {
    id: string
    title: string
    content: string
    type: string | null
    status: string | null
    updated_at: string | null
}

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

interface PoliciesSettingsClientProps {
    policies: PolicyRecord[]
    studio: {
        id: string
        slug: string
        late_cancel_hours: number
        no_show_penalty: boolean
        website_config: WebsiteConfig
    }
}

export default function PoliciesSettingsClient({ policies: initialPolicies, studio }: PoliciesSettingsClientProps) {
    const { toast } = useToast()
    const router = useRouter()
    
    // Global Tab state
    const [activeTab, setActiveTab] = useState<'rules' | 'agreements' | 'policies'>('rules')
    
    // Master Agreements state
    const [config, setConfig] = useState<WebsiteConfig>({
        ...studio.website_config,
        legal: studio.website_config.legal || {}
    })
    const [activeDoc, setActiveDoc] = useState<LegalDocKey>('terms')
    const [currentLegalContent, setCurrentLegalContent] = useState<string>(studio.website_config.legal?.[activeDoc] || '')
    const [isSavingLegal, setIsSavingLegal] = useState(false)

    // Dynamic Policies state
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editingPolicy, setEditingPolicy] = useState<PolicyRecord | null>(null)
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

    // Form state for dynamic policies
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'general',
        status: 'Active'
    })

    // Cancellation rules state
    const [lateCancelHours, setLateCancelHours] = useState(studio.late_cancel_hours)
    const [noShowPenalty, setNoShowPenalty] = useState(studio.no_show_penalty)
    const [rulesChanged, setRulesChanged] = useState(false)
    const [rulesSaving, setRulesSaving] = useState(false)
    const [rulesSaved, setRulesSaved] = useState(false)

    const masterDocs = [
        { id: 'm1', title: 'Terms and Conditions', key: 'terms' as const },
        { id: 'm2', title: 'Privacy Policy', key: 'privacy' as const },
        { id: 'm3', title: 'Refund & Cancellation', key: 'refund' as const }
    ]

    const handleSaveLegal = async () => {
        setIsSavingLegal(true)
        const newLegal: LegalConfig = { ...(config.legal || {}), [activeDoc]: currentLegalContent }
        const newConfig = { ...config, legal: newLegal }

        const formData = new FormData()
        formData.append('studioId', studio.id)
        formData.append('slug', studio.slug)
        formData.append('websiteConfig', JSON.stringify(newConfig))

        const result = await updateStudioWebsite(formData)
        if (result.success) {
            setConfig(newConfig)
            toast(`${masterDocs.find(d => d.key === activeDoc)?.title} saved!`, 'success')
        } else {
            toast(result.error || 'Failed to update legal document', 'error')
        }
        setIsSavingLegal(false)
    }

    const resetToTemplate = () => {
        if (confirm('Reset to standard template? This will overwrite your current draft.')) {
            const templates: Record<LegalDocKey, string> = {
                terms: "These Terms & Conditions govern your use of our Pilates studio services...",
                privacy: "We value your privacy and are committed to protecting your personal data...",
                refund: `Cancellations made within ${lateCancelHours} hours of the class start time are non-refundable...`
            }
            setCurrentLegalContent(templates[activeDoc])
        }
    }

    const handleOpenModal = (policy?: PolicyRecord) => {
        if (policy) {
            setEditingPolicy(policy)
            setFormData({
                title: policy.title,
                content: policy.content,
                type: policy.type || 'general',
                status: policy.status || 'Active'
            })
        } else {
            setEditingPolicy(null)
            setFormData({
                title: '',
                content: '',
                type: 'general',
                status: 'Active'
            })
        }
        setIsModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.content) {
            toast('Please fill in all required fields', 'error')
            return
        }

        setIsSaving(true)
        try {
            const result = await upsertPolicyAction({
                id: editingPolicy?.id,
                studioId: studio.id,
                ...formData
            })
            if (result?.error) {
                toast(result.error, 'error')
            } else {
                toast(editingPolicy ? 'Policy updated' : 'Policy created', 'success')
                setIsModalOpen(false)
                router.refresh()
            }
        } catch {
            toast('Failed to save policy', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return
        try {
            const result = await deletePolicyAction(id, studio.id)
            if (result?.error) toast(result.error, 'error')
            else {
                toast('Policy deleted', 'success')
                setActiveMenuId(null)
                router.refresh()
            }
        } catch {
            toast('Failed to delete', 'error')
        }
    }

    const handleSaveCancellationRules = async () => {
        setRulesSaving(true)
        try {
            const result = await updateCancellationRulesAction(studio.id, lateCancelHours, noShowPenalty)
            if (result?.error) toast(result.error, 'error')
            else {
                toast('Cancellation rules updated', 'success')
                setRulesChanged(false)
                setRulesSaved(true)
                setTimeout(() => setRulesSaved(false), 3000)
            }
        } catch {
            toast('Failed to save', 'error')
        } finally {
            setRulesSaving(false)
        }
    }

    const filteredPolicies = initialPolicies.filter(p => 
        p.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Tabs Navigation */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-zinc-100/50 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('rules')}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        activeTab === 'rules' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                    )}
                >
                    <Timer className="w-3.5 h-3.5" />
                    Function Rules
                </button>
                <button
                    onClick={() => setActiveTab('agreements')}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        activeTab === 'agreements' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                    )}
                >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Master Agreements
                </button>
                <button
                    onClick={() => setActiveTab('policies')}
                    className={clsx(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        activeTab === 'policies' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                    )}
                >
                    <Plus className="w-3.5 h-3.5" />
                    Custom Rules
                </button>
            </div>

            {/* Content Areas */}
            {activeTab === 'rules' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-500">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                            Late Cancellation Rules
                        </h2>
                        <p className="text-sm font-bold text-zinc-400">
                            Set the functional window that automates your credit refunds.
                        </p>
                    </div>

                    <div className="bg-white border border-zinc-100 rounded-3xl p-8 shadow-sm space-y-8 max-w-2xl">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                Cancellation Window
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={lateCancelHours}
                                    onChange={(e) => { setLateCancelHours(Number(e.target.value)); setRulesChanged(true) }}
                                    className="w-28 px-5 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-black text-zinc-900 text-center"
                                />
                                <span className="text-sm font-bold text-zinc-400">hours before class</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-5 border-t border-zinc-50">
                            <div className="space-y-1">
                                <p className="text-sm font-black text-zinc-900">No-Show Penalty</p>
                                <p className="text-xs text-zinc-400 font-medium">Auto-deduct credits for non-attendance.</p>
                            </div>
                            <button 
                                onClick={() => { setNoShowPenalty(!noShowPenalty); setRulesChanged(true) }}
                                className={clsx("w-12 h-6 rounded-full p-1 transition-all", noShowPenalty ? "bg-[#2D3282]" : "bg-zinc-200")}
                            >
                                <div className={clsx("w-4 h-4 bg-white rounded-full transition-all", noShowPenalty ? "translate-x-6" : "translate-x-0")} />
                            </button>
                        </div>

                        <button
                            onClick={handleSaveCancellationRules}
                            disabled={!rulesChanged || rulesSaving}
                            className={clsx(
                                "flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md",
                                rulesChanged ? "bg-[#2D3282] text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-400"
                            )}
                        >
                            {rulesSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Rules
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'agreements' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-500">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
                            Master Legal Agreements
                        </h2>
                        <p className="text-sm font-bold text-zinc-400">
                            Write the legal documents customers must agree to before booking.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        <div className="md:col-span-4 flex flex-col gap-3">
                            {masterDocs.map((doc) => (
                                <button
                                    key={doc.key}
                                    onClick={() => {
                                        setActiveDoc(doc.key)
                                        setCurrentLegalContent(config.legal?.[doc.key] || '')
                                    }}
                                    className={clsx(
                                        "p-5 rounded-3xl border-2 transition-all text-left flex items-start justify-between group",
                                        activeDoc === doc.key
                                            ? "border-[#2D3282] bg-indigo-50/50"
                                            : "border-transparent bg-white shadow-sm hover:border-zinc-200"
                                    )}
                                >
                                    <div className="space-y-0.5">
                                        <h5 className="text-[13px] font-black tracking-tight">{doc.title}</h5>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            {config.legal?.[doc.key] ? 'Drafted' : 'Missing'}
                                        </p>
                                    </div>
                                    <div className={clsx("p-1.5 rounded-lg", activeDoc === doc.key ? "bg-[#2D3282] text-white" : "text-zinc-300")}>
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                </button>
                            ))}

                            <div className="bg-amber-50 rounded-3xl border border-amber-100 p-6 space-y-3 mt-4">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <AlertTriangle className="w-4 h-4" />
                                    <h6 className="text-[10px] font-black uppercase tracking-widest">Legal Tip</h6>
                                </div>
                                <p className="text-[11px] text-amber-700 leading-relaxed italic">
                                    Your Refund policy should consistently mention your {lateCancelHours}-hour functional window to avoid disputes.
                                </p>
                            </div>
                        </div>

                        <div className="md:col-span-8 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    Editing: {masterDocs.find(d => d.key === activeDoc)?.title}
                                </h4>
                                <button
                                    onClick={resetToTemplate}
                                    className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
                                >
                                    <RefreshCcw className="w-3.5 h-3.5" />
                                    Reset to Template
                                </button>
                            </div>

                            <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-xl overflow-hidden focus-within:border-indigo-100 transition-colors">
                                <textarea
                                    value={currentLegalContent}
                                    onChange={(e) => setCurrentLegalContent(e.target.value)}
                                    placeholder={`Write your ${activeDoc} policy here...`}
                                    className="w-full min-h-[400px] p-10 text-[14px] font-medium leading-relaxed bg-transparent focus:outline-none resize-none"
                                />
                            </div>

                            <button
                                onClick={handleSaveLegal}
                                disabled={isSavingLegal}
                                className="w-full flex items-center justify-center gap-2 px-8 py-5 bg-[#2D3282] text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-zinc-800 transition-all disabled:opacity-50"
                            >
                                {isSavingLegal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save {masterDocs.find(d => d.key === activeDoc)?.title}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'policies' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Custom Studio Rules</h2>
                            <p className="text-sm font-bold text-zinc-400">Add smaller rules like grip sock requirements or newcomer instructions.</p>
                        </div>
                        <button 
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 px-8 py-3 bg-[#2D3282] text-white rounded-full text-sm font-black shadow-lg hover:bg-zinc-800 transition-all uppercase tracking-widest"
                        >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            Add Rule
                        </button>
                    </div>

                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                        <input 
                            type="text"
                            placeholder="Search rules..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5"
                        />
                    </div>

                    <div className="bg-white border border-zinc-50 rounded-[2rem] overflow-hidden shadow-sm">
                        {filteredPolicies.map((policy) => (
                            <div key={policy.id} className="px-10 py-6 grid grid-cols-[1fr_2fr_1fr_0.5fr] items-center gap-4 hover:bg-zinc-50/20 transition-all group border-b border-zinc-50 last:border-0">
                                <span className="text-xs font-bold text-zinc-400">{policy.updated_at ? format(new Date(policy.updated_at), 'dd MMM yyyy') : '—'}</span>
                                <span className="text-sm font-black text-zinc-900">{policy.title}</span>
                                <span className="text-xs font-bold text-zinc-400 capitalize">{policy.type || 'General'}</span>
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(policy)} className="p-2 text-zinc-400 hover:text-[#2D3282]"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(policy.id)} className="p-2 text-zinc-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingPolicy ? "Edit Rule" : "New Rule"}
            >
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-[#2D3282]/30"
                            placeholder="e.g. Grip Socks Rule"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Rule Content</label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                            rows={8}
                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-[#2D3282]/30 resize-none"
                            placeholder="Describe the rule..."
                            required
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Cancel</button>
                        <button type="submit" disabled={isSaving} className="px-10 py-5 bg-[#2D3282] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                            {isSaving ? 'Saving...' : 'Save Rule'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
