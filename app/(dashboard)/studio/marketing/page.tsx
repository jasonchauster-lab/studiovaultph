import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { Mail, MessageSquare, Megaphone, Plus, ArrowRight, Zap } from 'lucide-react'

import Link from 'next/link'

export default function MarketingPage() {
    const marketingActions = (
        <Link 
            href="/studio/marketing/email"
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-600 transition-all shadow-xl"
        >
            <Plus className="w-4 h-4" />
            New Campaign
        </Link>
    )

    return (
        <StudioDashboardShell 
            title="Marketing"
            description="Boost studio awareness and client engagement. Create email campaigns, SMS alerts, and automated loyalty sequences to keep your studio busy."
            breadcrumbs={[{ label: 'Marketing' }]}
            actions={marketingActions}
        >
            <div className="space-y-16">
                {/* Channel Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { title: 'Email Marketing', desc: 'Craft beautiful newsletters & updates.', icon: Mail, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/studio/marketing/email' },
                        { title: 'SMS Campaigns', desc: 'Instant reach with high open rates.', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '#' },
                        { title: 'Social Integration', desc: 'Connect your Instagram & Facebook.', icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50', href: '#' }
                    ].map((channel, i) => (
                        <div key={i} className="group bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-700">
                             <div className={`w-14 h-14 ${channel.bg} rounded-2xl flex items-center justify-center mb-10 group-hover:scale-110 transition-transform`}>
                                <channel.icon className={`w-7 h-7 ${channel.color}`} />
                            </div>
                            <div className="space-y-3 mb-10">
                                <h3 className="text-2xl font-serif font-black text-zinc-900 tracking-tight">{channel.title}</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed">{channel.desc}</p>
                            </div>
                            <Link 
                                href={channel.href}
                                className="block w-full py-4 bg-zinc-50 rounded-2xl text-[10px] text-center font-black uppercase tracking-widest text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all"
                            >
                                Configure
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Automations Section */}
                <div className="relative group overflow-hidden rounded-[3rem] bg-zinc-900 p-12 text-white shadow-2xl ring-1 ring-white/10 transition-all duration-700 hover:shadow-emerald-500/10">
                    {/* Decorative gradient blur */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-60" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="space-y-6 max-w-xl">
                            <div className="flex items-center gap-3">
                                <Zap className="w-5 h-5 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Marketing Automations</span>
                            </div>
                            <h2 className="text-4xl font-serif tracking-tight leading-tight text-white text-balance">
                                Put your studio growth on Autopilot.
                            </h2>
                            <p className="text-zinc-400 text-lg leading-relaxed">
                                Automatically welcome new clients, recover abandoned carts, and re-engage dormant members without lifting a finger.
                            </p>
                            <button className="px-10 py-5 bg-white text-zinc-900 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:-translate-y-1 hover:bg-emerald-50 transition-all">
                                Setup Automation
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 w-full md:w-80">
                            {[
                                { label: 'New Member Welcome', status: 'Active' },
                                { label: 'Re-engagement Sequence', status: 'Draft' },
                                { label: 'Birthday Special', status: 'Paused' }
                            ].map((auto, i) => (
                                <div key={i} className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                                    <span className="text-sm font-bold text-white tracking-tight">{auto.label}</span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${auto.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                                        {auto.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </StudioDashboardShell>
    )
}
