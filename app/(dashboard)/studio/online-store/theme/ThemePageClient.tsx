'use client'

import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { Palette, Brush, ExternalLink, Layout, Sparkles } from 'lucide-react'
import { themes } from '@/lib/studio/themes'
import Link from 'next/link'
import OnlineStorePageIntro from '@/components/studio/OnlineStorePageIntro'

interface ThemeConfig {
    theme?: {
        themeId?: string
    }
    [key: string]: unknown
}

interface ThemeColorConfig {
    primary: string
}

interface ThemeDefinition {
    name: string
    colors: ThemeColorConfig
}

interface ThemePageClientProps {
    studio: {
        slug: string
        website_config?: ThemeConfig | null
    }
}

export default function ThemePageClient({ studio }: ThemePageClientProps) {
    const config = studio.website_config || {}
    const themeId = config.theme?.themeId || 'zen-minimalist'
    const activeTheme = (themes[themeId] || themes['zen-minimalist']) as ThemeDefinition

    return (
        <StudioDashboardShell
            title="Theme"
            description="Manage your studio's visual identity and select from premium templates."
            breadcrumbs={[{ label: 'Online Store', href: '/studio/online-store' }, { label: 'Theme' }]}
        >
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <OnlineStorePageIntro
                    eyebrow="Store Setup"
                    title="Set the visual language customers recognize across your storefront."
                    description="Theme controls your storefront identity, while the Website builder handles page layout and section composition. Use both together for a polished brand experience."
                    primaryAction={{ label: 'Open Visual Editor', href: '/studio/website?view=settings&subView=templates' }}
                    secondaryAction={{ label: 'View Live Site', href: `/s/${studio.slug}` }}
                    metrics={[
                        { label: 'Active Theme', value: activeTheme.name },
                        { label: 'Primary Color', value: activeTheme.colors.primary },
                    ]}
                />

                {/* Hero Feature Card */}
                <div className="relative group overflow-hidden bg-zinc-900 rounded-[3rem] p-12 min-h-[500px] flex flex-col justify-between shadow-2xl">
                    {/* Background Decorative Elements */}
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-[120px] -translate-y-1/2 translate-x-1/4 opacity-50 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 blur-[100px] translate-y-1/2 -translate-x-1/4 opacity-30 pointer-events-none" />
                    
                    <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Active Design</span>
                            </div>
                        </div>

                        <div className="space-y-4 max-w-xl">
                            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tightest leading-tight">
                                {activeTheme.name}<span className="text-indigo-400">.</span>
                            </h2>
                            <p className="text-xl text-white/50 font-medium leading-relaxed">
                                Your studio&apos;s visual identity is live. Customize every detail from colors to typography in our immersive visual editor.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 pt-12">
                        <Link 
                            href="/studio/website?view=settings&subView=templates"
                            className="group/btn relative px-12 py-5 bg-white text-zinc-900 rounded-[2rem] text-[13px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 flex items-center gap-3"
                        >
                            <Brush className="w-5 h-5" />
                            Open Visual Editor
                        </Link>
                        <Link 
                            href={`/s/${studio.slug}`}
                            target="_blank"
                            className="px-8 py-5 bg-white/5 text-white/80 border border-white/10 rounded-[2rem] text-[13px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3"
                        >
                            <ExternalLink className="w-5 h-5" />
                            View Live Site
                        </Link>
                    </div>

                    {/* Preview Mockup Overlay */}
                    <div className="absolute -bottom-20 -right-20 w-[500px] h-full hidden xl:block opacity-40 group-hover:opacity-100 group-hover:-translate-y-4 transition-all duration-1000 rotate-6 group-hover:rotate-3 pointer-events-none">
                        <div className="w-full h-full bg-white rounded-[3rem] border-[12px] border-zinc-800 shadow-2xl overflow-hidden p-1">
                             <div className="w-full h-full bg-zinc-50 rounded-[2rem] flex flex-col">
                                 <div className="h-12 border-b border-zinc-100 px-6 flex items-center justify-between">
                                     <div className="flex gap-1.5">
                                         <div className="w-2 h-2 rounded-full bg-zinc-200" />
                                         <div className="w-2 h-2 rounded-full bg-zinc-200" />
                                         <div className="w-2 h-2 rounded-full bg-zinc-200" />
                                     </div>
                                 </div>
                                 <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
                                     <div className="w-24 h-24 rounded-full" style={{ backgroundColor: activeTheme.colors.primary }} />
                                     <div className="w-32 h-4 rounded-full bg-zinc-200" />
                                     <div className="w-48 h-3 rounded-full bg-zinc-100" />
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Sub-features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6 hover:shadow-xl hover:shadow-zinc-200/50 transition-all">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center">
                            <Palette className="w-7 h-7 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 tracking-tight">Colour Palette</h3>
                        <p className="text-zinc-500 text-[13px] leading-relaxed">
                            Craft a brand identity that resonates. Sync your primary and secondary colours across the entire storefront.
                        </p>
                    </div>

                    <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6 hover:shadow-xl hover:shadow-zinc-200/50 transition-all">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <Sparkles className="w-7 h-7 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 tracking-tight">Premium Fonts</h3>
                        <p className="text-zinc-500 text-[13px] leading-relaxed">
                            Access our curated library of premium typography to give your studio website a polished, professional look.
                        </p>
                    </div>

                    <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6 hover:shadow-xl hover:shadow-zinc-200/50 transition-all">
                        <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center">
                            <Layout className="w-7 h-7 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-black text-zinc-900 tracking-tight">Smart Templates</h3>
                        <p className="text-zinc-500 text-[13px] leading-relaxed">
                            Switching templates is instant. Your content stays safe while your design gets a complete premium overhaul.
                        </p>
                    </div>
                </div>
            </div>
        </StudioDashboardShell>
    )
}


