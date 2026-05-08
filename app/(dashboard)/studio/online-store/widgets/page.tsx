import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { ArrowUp, ExternalLink, MessageSquare, Sparkles } from 'lucide-react'
import { getCachedStudio } from '@/lib/studio/data'
import OnlineStorePageIntro from '@/components/studio/OnlineStorePageIntro'

export default async function WidgetsPage() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) {
        redirect('/login')
    }

    const studio = await getCachedStudio()
    if (!studio) notFound()

    const websiteConfig = studio.website_config || {}
    const floatingWidgets = websiteConfig.floatingWidgets || {}

    const whatsappEnabled = floatingWidgets.whatsapp?.enabled ?? studio.show_whatsapp_button ?? false
    const whatsappNumber = floatingWidgets.whatsapp?.number || studio.whatsapp_number || ''
    const backToTopEnabled = floatingWidgets.backToTop?.enabled ?? false

    const actions = (
        <Link
            href="/studio/website?view=floating"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#2D3282] rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-zinc-800 transition-all shadow-xl"
        >
            <ExternalLink className="w-4 h-4" />
            Open Widget Editor
        </Link>
    )

    return (
        <StudioDashboardShell
            title="Widgets"
            description="Manage the floating actions that appear across your storefront experience."
            breadcrumbs={[
                { label: 'Online Store', href: '/studio/online-store' },
                { label: 'Widgets' },
            ]}
            actions={actions}
        >
            <div className="space-y-8">
                <OnlineStorePageIntro
                    eyebrow="Commerce"
                    title="Use focused floating actions to support booking, contact, and navigation."
                    description="Widgets help customers act quickly from anywhere on the storefront. Keep them minimal so they support conversion without competing with the main booking flow."
                    primaryAction={{ label: 'Open Widget Editor', href: '/studio/website?view=floating' }}
                    secondaryAction={{ label: 'Back To Overview', href: '/studio/online-store' }}
                    metrics={[
                        { label: 'WhatsApp', value: whatsappEnabled ? 'On' : 'Off' },
                        { label: 'Back To Top', value: backToTopEnabled ? 'On' : 'Off' },
                    ]}
                />

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 text-zinc-400 font-bold uppercase text-[10px] tracking-widest">
                            <Sparkles className="w-4 h-4" />
                            Website Widgets
                        </div>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                            Widgets are lightweight floating actions that help customers contact your studio and navigate your site.
                            Use the visual editor to manage global settings and apply branch-specific overrides where needed.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/studio/website?view=floating"
                                className="inline-flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Edit in Visual Editor
                            </Link>
                            <Link
                                href="/studio/website"
                                className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all"
                            >
                                Open Store Preview
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-5">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-black text-zinc-900 tracking-tight">WhatsApp Button</h2>
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    Let visitors start a conversation with one tap from anywhere on the storefront.
                                </p>
                            </div>
                            <div className="pt-2 space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</p>
                                <p className="text-sm font-bold text-zinc-900">{whatsappEnabled ? 'Enabled' : 'Disabled'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Number</p>
                                <p className="text-sm font-bold text-zinc-900">{whatsappNumber || 'No number configured yet'}</p>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-5">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-50 text-zinc-700 flex items-center justify-center">
                                <ArrowUp className="w-6 h-6" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-xl font-black text-zinc-900 tracking-tight">Back To Top</h2>
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    Show a quick return-to-top control after visitors scroll through your storefront content.
                                </p>
                            </div>
                            <div className="pt-2 space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</p>
                                <p className="text-sm font-bold text-zinc-900">{backToTopEnabled ? 'Enabled' : 'Disabled'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Scope</p>
                                <p className="text-sm text-zinc-500">Global by default, with optional branch-level overrides in the visual editor.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-zinc-900 rounded-[2.5rem] p-8 text-white space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Best Practice</p>
                        <h3 className="text-2xl font-black tracking-tight">Keep widgets focused.</h3>
                        <p className="text-sm text-white/70 leading-relaxed">
                            Turn on only the actions that genuinely help conversion. Too many floating controls can compete with your booking CTA.
                        </p>
                    </div>
                </div>
                </div>
            </div>
        </StudioDashboardShell>
    )
}
