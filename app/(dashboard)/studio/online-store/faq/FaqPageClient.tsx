'use client'

import { useRef, useState } from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { Plus, HelpCircle, Search, Edit3, Trash2, Save, Loader2, X } from 'lucide-react'
import { updateStudioWebsite } from '@/app/(dashboard)/studio/studio-actions'
import { useToast } from '@/components/ui/Toast'
import OnlineStorePageIntro from '@/components/studio/OnlineStorePageIntro'
import LocationSwitcher from '@/components/studio/LocationSwitcher'

interface FaqPageClientProps {
    studio: {
        id: string
        slug: string
        website_config?: {
            faq?: FaqItem[]
            [key: string]: unknown
        } | null
    }
    outlets: any[]
    currentOutletId?: string
}

interface FaqItem {
    id: string
    question: string
    answer: string
    category: string
}

export default function FaqPageClient({ studio, outlets, currentOutletId }: FaqPageClientProps) {
    const { toast } = useToast()
    
    // Determine the initial config based on the selected outlet or studio master
    const currentOutlet = outlets.find(o => o.id === currentOutletId)
    const initialConfig = (currentOutlet?.website_config || studio.website_config || { faq: [] }) as any
    
    // Inheritance: If branch has no FAQs, fallback to Studio Master (Branch A)
    const finalConfig = (!initialConfig.faq || initialConfig.faq.length === 0) && currentOutletId
        ? (studio.website_config || { faq: [] }) as any
        : initialConfig

    const [config, setConfig] = useState(finalConfig)
    const [isSaving, setIsSaving] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const nextFaqId = useRef(1000)

    const faqs: FaqItem[] = config.faq || [
        { id: 'f1', category: 'Classes', question: 'What should I wear to my first pilates class?', answer: 'We recommend comfortable, form-fitting athletic wear. Grip socks are required for safety and hygiene on the reformer.' },
        { id: 'f2', category: 'General', question: 'Do I need to be flexible to start pilates?', answer: 'Not at all! One of the primary goals of pilates is to improve flexibility. Our instructors will provide modifications for all levels.' },
        { id: 'f3', category: 'Memberships', question: 'Can I freeze my membership?', answer: 'Yes, members on our monthly plans can freeze their accounts for up to 30 days once per year.' }
    ]

    const filteredFaqs = faqs.filter(f => f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.category.toLowerCase().includes(searchQuery.toLowerCase()))

    const handleSaveConfig = async (newFaqs: FaqItem[]) => {
        setIsSaving(true)
        const newConfig = { ...config, faq: newFaqs }
        const formData = new FormData()
        formData.append('studioId', studio.id)
        if (currentOutletId) {
            formData.append('outletId', currentOutletId)
        }
        formData.append('slug', studio.slug)
        formData.append('websiteConfig', JSON.stringify(newConfig))

        const result = await updateStudioWebsite(formData)
        if (result.success) {
            setConfig(newConfig)
            toast('FAQ updated!', 'success')
            setIsModalOpen(false)
        } else {
            toast(result.error || 'Failed to update FAQ', 'error')
        }
        setIsSaving(false)
    }

    const handleAddOrEdit = (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)
        if (!editingFaq) {
            nextFaqId.current += 1
        }
        const faqData: FaqItem = {
            id: editingFaq?.id || `faq-item-${nextFaqId.current}`,
            question: formData.get('question') as string,
            answer: formData.get('answer') as string,
            category: formData.get('category') as string
        }

        const newFaqs = editingFaq 
            ? faqs.map(f => f.id === editingFaq.id ? faqData : f)
            : [...faqs, faqData]
        
        handleSaveConfig(newFaqs)
    }

    const handleDelete = (id: string) => {
        if (confirm('Delete this FAQ?')) {
            handleSaveConfig(faqs.filter(f => f.id !== id))
        }
    }

    const actions = (
        <div className="flex items-center gap-4">
            {outlets.length > 1 && <LocationSwitcher outlets={outlets} currentOutletId={currentOutletId} />}
            <button 
                onClick={() => { setEditingFaq(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-6 py-3 bg-[#2D3282] rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-zinc-800 transition-all shadow-xl"
            >
                <Plus className="w-4 h-4" />
                Add FAQ
            </button>
        </div>
    )

    return (
        <StudioDashboardShell
            title="FAQ"
            description="Anticipate your clients' questions and provide instant answers."
            breadcrumbs={[{ label: 'Online Store', href: '/studio/online-store' }, { label: 'FAQ' }]}
            actions={actions}
        >
            <div className="space-y-12">
                <OnlineStorePageIntro
                    eyebrow="Content"
                    title="Answer the questions customers usually ask before they book."
                    description="A good FAQ reduces friction, cuts repetitive support messages, and helps visitors feel confident enough to move into checkout."
                    primaryAction={{ label: 'Back To Overview', href: '/studio/online-store' }}
                    secondaryAction={{ label: 'View Live Site', href: `/s/${studio.slug}` }}
                    metrics={[
                        { label: 'FAQ Items', value: String(faqs.length) },
                        { label: 'Visible Results', value: String(filteredFaqs.length) },
                    ]}
                />

                <div className="relative group max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-[#2D3282] transition-colors" />
                    <input 
                        type="text"
                        placeholder="Search questions or categories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white border border-zinc-200 rounded-2xl text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                    />
                </div>

                <div className="space-y-4">
                    {filteredFaqs.map((faq) => (
                        <div key={faq.id} className="group bg-white rounded-[2rem] border border-zinc-100 hover:shadow-2xl hoverShadow-zinc-200/50 transition-all duration-700">
                            <div className="p-8 space-y-4">
                                <div className="flex items-start justify-between gap-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] bg-[#2D3282]/5 text-[#2D3282] px-3 py-1 rounded-full border border-[#2D3282]/10 whitespace-nowrap">
                                                {faq.category}
                                            </span>
                                            <h4 className="text-[15px] font-black text-zinc-900 tracking-tight leading-tight">{faq.question}</h4>
                                        </div>
                                        <p className="text-[13px] text-zinc-500 font-medium leading-relaxed pl-4 border-l-2 border-zinc-50">{faq.answer}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button 
                                            onClick={() => { setEditingFaq(faq); setIsModalOpen(true); }}
                                            className="p-3 hover:bg-zinc-50 rounded-2xl transition-all border border-transparent hover:border-zinc-100 text-zinc-400 hover:text-zinc-900 shadow-sm shadow-transparent hover:shadow-zinc-200"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(faq.id)}
                                            className="p-3 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 text-zinc-200 hover:text-red-500"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {filteredFaqs.length === 0 && (
                        <div className="py-20 text-center space-y-4 bg-zinc-50/50 rounded-[3rem] border border-dashed border-zinc-200">
                             <HelpCircle className="w-12 h-12 text-zinc-200 mx-auto" />
                             <p className="text-zinc-400 text-sm font-medium italic">No matching questions found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 bg-zinc-50/50 border-b border-zinc-100 flex items-center justify-between">
                             <h3 className="text-xl font-black text-zinc-900 tracking-tight">{editingFaq ? 'Modify FAQ' : 'New Question'}</h3>
                             <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-all border border-transparent hover:border-zinc-200 shadow-sm">
                                <X className="w-5 h-5 text-zinc-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddOrEdit} className="p-10 space-y-8">
                             <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Category</label>
                                <input 
                                    name="category" 
                                    defaultValue={editingFaq?.category || 'General'} 
                                    required 
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all placeholder:text-zinc-300"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">The Question</label>
                                <input 
                                    name="question" 
                                    defaultValue={editingFaq?.question} 
                                    required 
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all placeholder:text-zinc-300"
                                />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">The Answer</label>
                                <textarea 
                                    name="answer" 
                                    defaultValue={editingFaq?.answer}
                                    required
                                    rows={5}
                                    className="w-full px-6 py-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] text-[13px] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2D3282]/10 focus:border-[#2D3282] transition-all resize-none placeholder:text-zinc-300"
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
                                    {editingFaq ? 'Keep Changes' : 'Publish Answer'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-10 py-4 bg-zinc-100 text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                                >
                                    Back
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </StudioDashboardShell>
    )
}

