import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { Heart, Star, Users, MessageCircle, BarChart3, ArrowRight, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BranchPageSelector from '@/components/dashboard/BranchPageSelector'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function LoyaltyInsightsPage(props: {
    searchParams: SearchParams
}) {
    const searchParams = await props.searchParams
    const outletId = typeof searchParams.outletId === 'string' ? searchParams.outletId : undefined
    
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) redirect('/login')

    // 1. Fetch Studio
    const { data: studio } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)
        .single()

    if (!studio) redirect('/studio')

    // 2. Fetch all outlets
    const { data: outlets = [] } = await supabase
        .from('outlets')
        .select('*')
        .eq('studio_id', studio.id)
        .order('created_at', { ascending: true })

    // 3. Fetch Loyalty & Insights Metrics (Updated to support outlet filter)
    const { data: metrics } = await supabase.rpc('get_studio_centricity', {
        p_studio_id: studio.id,
        p_outlet_id: outletId
    })

    const nps = metrics?.nps || 0
    const npsLabel = nps >= 70 ? 'Excellent' : nps >= 30 ? 'Good' : nps >= 0 ? 'Fair' : 'Needs Focus'
    const npsColor = nps >= 70 ? 'text-emerald-600 bg-emerald-50' : nps >= 30 ? 'text-blue-600 bg-blue-50' : 'text-amber-600 bg-amber-50'

    const stats = [
        { title: 'Repeat Booking Rate', val: `${metrics?.repeat_rate || 0}%`, icon: Users },
        { title: 'Avg. Satisfaction', val: `${metrics?.avg_satisfaction || 0}/5`, icon: Star },
        { title: 'Churn Risk Alerts', val: String(metrics?.churn_risk || 0), icon: BarChart3, color: metrics?.churn_risk > 0 ? 'text-rose-500' : 'text-emerald-500' },
        { title: 'Waitlist Turn', val: `${metrics?.waitlist_turn_minutes || 0}m`, icon: Users }
    ]

    return (
        <div className="min-h-screen p-8 lg:p-12 bg-cream-50/30">
            <div className="max-w-7xl mx-auto space-y-12">
                <div>
                    <Link
                        href={outletId ? `/studio?outletId=${outletId}` : '/studio'}
                        className="inline-flex items-center gap-3 text-[10px] font-black text-zinc-400 hover:text-[#2D3282] uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        BACK TO DASHBOARD
                    </Link>
                    
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-zinc-100 shadow-sm mb-6">
                            <Heart className="w-4 h-4 text-[#2D3282]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Loyalty & Insights</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-zinc-900 tracking-tightest leading-tight">
                            Loyalty & <span className="text-zinc-300">Insights</span>
                        </h1>
                        
                        {/* Centered Branch Selector */}
                        <BranchPageSelector 
                            outlets={outlets || []} 
                            currentOutletId={outletId}
                            isGlobalAllowed={true}
                        />
                    </div>
                </div>

                <div className="space-y-16 animate-in fade-in duration-700">
                    {/* Score Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* NPS Shell */}
                        <div className="bg-white p-12 rounded-[3.5rem] border border-zinc-100 shadow-sm relative overflow-hidden group h-full">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                            <div className="space-y-8 relative z-10">
                                <div className="flex items-center gap-3">
                                    <Heart className="w-5 h-5 text-emerald-500 shrink-0" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Net Promoter Score</span>
                                </div>
                                <div className="flex items-end gap-3">
                                    <h3 className="text-7xl font-black text-zinc-900 tracking-tightest leading-none">{nps}</h3>
                                    <div className="space-y-1 mb-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${npsColor}`}>
                                            {npsLabel}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-zinc-500 text-sm leading-relaxed max-w-[200px]">
                                    Based on {metrics?.total_reviews || 0} recent sessions.
                                </p>
                            </div>
                        </div>

                        {/* Feedback Feed */}
                        <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] border border-zinc-100 shadow-sm space-y-10">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-zinc-900 tracking-tight">Recent Feedback</h3>
                                <button className="text-[10px] font-black text-zinc-400 hover:text-[#2D3282] uppercase tracking-widest flex items-center gap-2">
                                    View All
                                    <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(metrics?.recent_feedback || []).length > 0 ? (
                                    metrics.recent_feedback.map((fb: any, i: number) => (
                                        <div key={i} className="flex items-start gap-6 p-6 bg-zinc-50 rounded-[2rem] hover:bg-zinc-100/50 transition-colors">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                                                <MessageCircle className="w-6 h-6 text-zinc-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black text-zinc-900">{fb.name}</span>
                                                    <div className="flex gap-0.5">
                                                        {[...Array(Math.max(0, Math.floor(fb.score || 0)))].map((_, j) => <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-zinc-500 leading-relaxed italic line-clamp-2">"{fb.msg}"</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 text-center py-12 text-zinc-400 italic font-medium">
                                        No feedback surveys received yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Loyalty & Retention Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                         {stats.map((stat, i) => (
                            <div key={i} className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm space-y-4 hover:shadow-lg transition-shadow">
                                <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center">
                                    <stat.icon className={`w-5 h-5 ${stat.color || 'text-zinc-400'}`} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{stat.title}</p>
                                    <h4 className="text-xl font-black text-zinc-900 leading-none">{stat.val}</h4>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
