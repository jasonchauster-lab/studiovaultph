'use client'

import React, { useState } from 'react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { 
    Mail, Plus, Send, History, 
    BarChart3, Users, Clock, AlertCircle,
    CheckCircle2, XCircle, Loader2, Search
} from 'lucide-react'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import { sendMarketingCampaignAction } from '../marketing-actions'
import { useToast } from '@/components/ui/Toast'

interface EmailMarketingPageClientProps {
    studio: any
    campaigns: any[]
    usage: {
        sent: number
        limit: number
        resetAt: string
    }
}

export default function EmailMarketingPageClient({ 
    studio, 
    campaigns: initialCampaigns, 
    usage 
}: EmailMarketingPageClientProps) {
    const { toast } = useToast()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [campaigns, setCampaigns] = useState(initialCampaigns)

    // Form State
    const [title, setTitle] = useState('')
    const [subject, setSubject] = useState('')
    const [content, setContent] = useState('')
    const [segment, setSegment] = useState<'all' | 'new' | 'inactive'>('all')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !subject || !content) {
            toast('Please fill in all fields', 'error')
            return
        }

        setIsSending(true)
        const res = await sendMarketingCampaignAction({
            studioId: studio.id,
            title,
            subject,
            content,
            segment
        })
        setIsSending(false)

        if (res.success) {
            toast(`Successfully sent to ${res.sent} customers!`, 'success')
            setIsModalOpen(false)
            // Reset form
            setTitle('')
            setSubject('')
            setContent('')
            // Refresh would happen via revalidatePath, but we can optimistically update or just let the page reload
            window.location.reload()
        } else {
            toast(res.error || 'Failed to send campaign', 'error')
        }
    }

    const usagePercent = Math.min(100, (usage.sent / usage.limit) * 100)

    return (
        <StudioDashboardShell 
            title="Email Marketing"
            breadcrumbs={[{ label: 'Marketing' }, { label: 'Email' }]}
            actions={
                <button 
                    onClick={() => setIsModalOpen(true)}
                    disabled={usage.limit === 0}
                    className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-600 transition-all shadow-xl disabled:opacity-50"
                >
                    <Plus className="w-4 h-4" />
                    New Campaign
                </button>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Campaign History */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-10 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <h3 className="text-2xl font-serif font-black text-zinc-900 tracking-tight">Recent Campaigns</h3>
                                <p className="text-sm text-zinc-400 font-medium">History of your sent emails and their performance.</p>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                                <input 
                                    type="text" 
                                    placeholder="Search campaigns..." 
                                    className="pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-xs focus:bg-white outline-none transition-all w-64"
                                />
                            </div>
                        </div>

                        {campaigns.length === 0 ? (
                            <div className="py-20 text-center space-y-4 border-2 border-dashed border-zinc-100 rounded-[2rem]">
                                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                                    <History className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-zinc-900">No campaigns yet</p>
                                    <p className="text-xs text-zinc-400 mt-1">Your marketing history will appear here.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {campaigns.map((camp) => (
                                    <div key={camp.id} className="group flex items-center justify-between p-6 bg-white border border-zinc-100 rounded-3xl hover:border-zinc-200 hover:shadow-xl hover:shadow-zinc-200/40 transition-all">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                                <Mail className="w-6 h-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-lg font-black text-zinc-900 tracking-tight">{camp.title}</h4>
                                                <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {camp.recipient_count} Recipients</span>
                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(camp.created_at), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={clsx(
                                                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                camp.status === 'sent' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                            )}>
                                                {camp.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Stats & Quota */}
                <div className="space-y-8">
                    {/* Quota Card */}
                    <div className="bg-zinc-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                        
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Monthly Quota</p>
                                    <h3 className="text-3xl font-serif tracking-tight">{usage.sent} / {usage.limit}</h3>
                                </div>
                                <BarChart3 className="w-8 h-8 text-white/20" />
                            </div>

                            <div className="space-y-3">
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-400 rounded-full transition-all duration-1000" 
                                        style={{ width: `${usagePercent}%` }}
                                    />
                                </div>
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                    Resets on {format(new Date(usage.resetAt), 'MMMM dd')}
                                </p>
                            </div>

                            {usage.limit === 0 && (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                                    <div className="flex items-center gap-2 text-amber-400">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Feature Locked</span>
                                    </div>
                                    <p className="text-xs text-white/60 leading-relaxed">
                                        Marketing emails are not available on your current plan. Upgrade to **Team** to unlock this feature.
                                    </p>
                                    <button className="w-full py-3 bg-white text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">
                                        Upgrade Plan
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Best Practices Card */}
                    <div className="bg-emerald-50 rounded-[2.5rem] p-10 border border-emerald-100 space-y-6">
                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-lg font-black text-zinc-900 tracking-tight">Pro Tip: Timing Matters</h4>
                            <p className="text-sm text-emerald-900/60 leading-relaxed font-medium">
                                Studies show that emails sent on **Tuesday or Thursday mornings** have the highest open rates for fitness studios.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* New Campaign Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-md" onClick={() => !isSending && setIsModalOpen(false)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <form onSubmit={handleSubmit} className="p-12 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-serif font-black text-zinc-900 tracking-tight">New Campaign</h3>
                                    <p className="text-sm text-zinc-400 font-medium">Reach out to your customers with a beautiful update.</p>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-50 transition-colors">
                                    <XCircle className="w-6 h-6 text-zinc-300" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Internal Name</label>
                                        <input 
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g. Summer Promo 2026" 
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm focus:bg-white outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Target Segment</label>
                                        <select 
                                            value={segment}
                                            onChange={(e) => setSegment(e.target.value as any)}
                                            className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm focus:bg-white outline-none transition-all appearance-none"
                                        >
                                            <option value="all">All Active Customers</option>
                                            <option value="new">New Customers (Last 30 days)</option>
                                            <option value="inactive">Inactive Customers</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Subject</label>
                                    <input 
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="What your customers see in their inbox" 
                                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-sm focus:bg-white outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email Content</label>
                                    <textarea 
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        rows={8}
                                        placeholder="Write your message here... (HTML supported)" 
                                        className="w-full px-6 py-6 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm focus:bg-white outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSending}
                                className="w-full py-5 bg-zinc-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:-translate-y-1 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:translate-y-0"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sending to Customers...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Launch Campaign
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </StudioDashboardShell>
    )
}
