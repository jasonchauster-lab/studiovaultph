import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import {
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    Globe,
    Settings2,
    ShieldCheck,
    Sparkles
} from 'lucide-react'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import OnlineStorePageIntro from '@/components/studio/OnlineStorePageIntro'
import Link from 'next/link'

export default async function DomainsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: studio } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

    if (!studio) notFound()

    const hasPremium = studio.subscription_tier === 'premium' || studio.subscription_tier === 'business'
    const storefrontLabel = studio.custom_domain || `${studio.slug}.studiovault.co`

    return (
        <StudioDashboardShell
            title="Domains"
            description="Manage the web address where customers can find your studio storefront."
            breadcrumbs={[{ label: 'Online Store', href: '/studio/online-store' }, { label: 'Domains' }]}
        >
            <div className="space-y-8">
                <OnlineStorePageIntro
                    eyebrow="Publishing"
                    title="Control the address customers use to discover your storefront."
                    description="Your StudioVault subdomain gives you a live publishing address right away. Custom domains let you move that same storefront onto your own branded URL when you are ready."
                    primaryAction={{ label: 'View Live Site', href: `https://${storefrontLabel}` }}
                    secondaryAction={{ label: 'Back To Overview', href: '/studio/online-store' }}
                    metrics={[
                        { label: 'Default Domain', value: `${studio.slug}.studiovault.co` },
                        { label: 'Custom Domain', value: studio.custom_domain ? 'Connected' : 'Not Set' },
                    ]}
                    aside={
                        <div className="space-y-5">
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                                <Sparkles className="h-4 w-4" />
                                Domain Strategy
                            </div>
                            <div className="space-y-4 text-sm leading-relaxed text-zinc-500">
                                <p>
                                    Start with the StudioVault slug while you build confidence in the storefront and content flow.
                                </p>
                                <p>
                                    Connect a custom domain when you want stronger branding, clearer SEO ownership, and a cleaner marketing URL.
                                </p>
                            </div>
                        </div>
                    }
                />

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    <div className="space-y-8 lg:col-span-7">
                        <div className="rounded-[2.5rem] border border-zinc-200 bg-white p-10 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[#2D3282]">
                                        <Globe className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-[15px] font-black tracking-tight text-zinc-900">StudioVault Subdomain</h3>
                                        <p className="text-xs text-zinc-500">Your live default storefront address.</p>
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Connected
                                </div>
                            </div>

                            <div className="mt-8 flex items-center justify-between rounded-[2rem] border border-zinc-100 bg-zinc-50 p-8">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Public URL</span>
                                    <p className="text-sm font-black text-zinc-900 break-all">{studio.slug}.studiovault.co</p>
                                </div>
                                <Link
                                    href={`https://${studio.slug}.studiovault.co`}
                                    target="_blank"
                                    className="rounded-2xl border border-zinc-200 bg-white p-4 text-[#2D3282] transition-all hover:border-zinc-900 hover:bg-zinc-900 hover:text-white"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-[2.5rem] border border-zinc-200 bg-white p-10 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-500">
                                        <Settings2 className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-[15px] font-black tracking-tight text-zinc-900">Custom Domain</h3>
                                        <p className="text-xs text-zinc-500">Move the storefront onto your own branded web address.</p>
                                    </div>
                                </div>
                                <button className="rounded-2xl bg-[#2D3282] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-zinc-800">
                                    Connect Domain
                                </button>
                            </div>

                            {!hasPremium && (
                                <div className="mt-8 flex gap-5 rounded-[2rem] border border-amber-100 bg-amber-50 p-8 text-amber-800">
                                    <AlertCircle className="mt-1 h-6 w-6 shrink-0" />
                                    <div className="space-y-2">
                                        <h5 className="text-[11px] font-black uppercase tracking-widest">Premium Upgrade Required</h5>
                                        <p className="text-[13px] leading-relaxed opacity-80">
                                            Custom domains like `.com` and `.studio` are currently available for Premium storefront plans.
                                        </p>
                                        <Link href="/studio/pricing" className="inline-block border-b-2 border-amber-300 pb-0.5 text-[10px] font-black uppercase tracking-widest">
                                            View Pricing Packages
                                        </Link>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 flex items-center gap-3 text-zinc-400">
                                <ShieldCheck className="h-5 w-5" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Automatic SSL protection is included</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8 lg:col-span-5">
                        <div className="relative group overflow-hidden rounded-[2.75rem] bg-zinc-900 p-10 text-white shadow-xl ring-1 ring-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10">
                            {/* Decorative gradient blur */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-50" />
                            
                            <div className="relative z-10 space-y-6">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="h-4 w-4 text-indigo-400" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Why It Matters</p>
                                </div>
                                <h4 className="text-3xl font-black tracking-tight text-white leading-[1.15] text-balance">
                                    A clean domain makes the storefront feel like your brand, not just a tool.
                                </h4>
                                <p className="text-[13px] leading-relaxed text-zinc-400 font-medium">
                                    Use the StudioVault slug to launch quickly, then connect your own domain when you want a stronger marketing and trust signal.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-[2.5rem] border-2 border-dashed border-zinc-200 bg-white p-10">
                            <h5 className="text-[11px] font-black uppercase tracking-widest text-zinc-400">DNS Checklist</h5>
                            <div className="mt-5 space-y-3">
                                {[
                                    'Point the root domain or subdomain to the storefront target',
                                    'Create the www alias if you want both versions live',
                                    'Wait for SSL provisioning to finish after DNS resolves',
                                ].map((step) => (
                                    <div key={step} className="flex items-center gap-3 text-zinc-500">
                                        <div className="h-4 w-4 rounded-full border border-zinc-200" />
                                        <span className="text-[12px] font-medium">{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </StudioDashboardShell>
    )
}
