import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import {
    ArrowUpRight,
    BadgeCheck,
    Brush,
    ChevronRight,
    ClipboardSignature,
    CreditCard,
    ExternalLink,
    FileText,
    Globe,
    Globe2,
    HelpCircle,
    LayoutTemplate,
    Navigation,
    Palette,
    PenTool,
    Settings,
    ShieldCheck,
    Sparkles
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { activateStudioStorefront } from '@/app/(dashboard)/studio/studio-actions'

interface QuickLink {
    title: string
    description: string
    href: string
    icon: LucideIcon
    accent: string
}

interface SectionBlockProps {
    eyebrow: string
    title: string
    description: string
    links: QuickLink[]
    tone: string
}

interface MetricCardProps {
    label: string
    value: string
    tone: string
}

interface WebsiteConfig {
    legal?: {
        terms?: string
        privacy?: string
        refund?: string
    }
    floatingWidgets?: {
        whatsapp?: {
            enabled?: boolean
        }
        backToTop?: {
            enabled?: boolean
        }
    }
    [key: string]: unknown
}

const setupLinks: QuickLink[] = [
    {
        title: 'Theme',
        description: 'Colors, templates, and storefront styling',
        href: '/studio/online-store/theme',
        icon: Palette,
        accent: 'bg-indigo-50 text-[#2D3282]',
    },
    {
        title: 'Navigation',
        description: 'Menus, footer links, and site structure',
        href: '/studio/online-store/navigation',
        icon: Navigation,
        accent: 'bg-sky-50 text-sky-700',
    },
    {
        title: 'Domains',
        description: 'Subdomain and custom domain settings',
        href: '/studio/online-store/domains',
        icon: Globe2,
        accent: 'bg-zinc-50 text-zinc-700',
    },
]

const commerceLinks: QuickLink[] = [
    {
        title: 'Payments',
        description: 'Control payment methods and booking checkout behavior',
        href: '/studio/online-store/payments',
        icon: CreditCard,
        accent: 'bg-orange-50 text-orange-600',
    },
    {
        title: 'Widgets',
        description: 'Manage floating WhatsApp and back-to-top actions',
        href: '/studio/online-store/widgets',
        icon: Sparkles,
        accent: 'bg-blue-50 text-blue-700',
    },
]

const contentLinks: QuickLink[] = [
    {
        title: 'Blog',
        description: 'Publish updates, campaigns, and studio stories',
        href: '/studio/online-store/blog',
        icon: PenTool,
        accent: 'bg-emerald-50 text-emerald-700',
    },
    {
        title: 'FAQ',
        description: 'Answer common customer questions before they ask',
        href: '/studio/online-store/faq',
        icon: HelpCircle,
        accent: 'bg-amber-50 text-amber-700',
    },
]

const complianceLinks: QuickLink[] = [
    {
        title: 'Waiver Form',
        description: 'Manage client waiver templates and consent records',
        href: '/studio/online-store/waiver-form',
        icon: ClipboardSignature,
        accent: 'bg-orange-50 text-orange-600',
    },
    {
        title: 'Store Policies',
        description: 'Define booking, refund, and cancellation rules',
        href: '/studio/online-store/policies',
        icon: ShieldCheck,
        accent: 'bg-emerald-50 text-emerald-700',
    },
    {
        title: 'Legal Documents',
        description: 'Edit terms, privacy, and other legal storefront copy',
        href: '/studio/online-store/legal',
        icon: FileText,
        accent: 'bg-indigo-50 text-[#2D3282]',
    },
]

function QuickLinkCard({ title, description, href, icon: Icon, accent }: QuickLink) {
    return (
        <Link
            href={href}
            className="group flex items-start gap-4 rounded-[2rem] border border-zinc-200/80 bg-white/90 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-[0_14px_30px_rgba(16,24,40,0.06)]"
        >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent}`}>
                <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-black tracking-tight text-zinc-900 transition-colors group-hover:text-[#2D3282]">
                    {title}
                </p>
                <p className="text-xs leading-relaxed text-zinc-500">{description}</p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-300 transition-all group-hover:translate-x-1 group-hover:text-zinc-500" />
        </Link>
    )
}

function SectionBlock({ eyebrow, title, description, links, tone }: SectionBlockProps) {
    return (
        <section className={`rounded-[2.5rem] border p-8 shadow-sm ${tone}`}>
            <div className="flex flex-col gap-4 border-b border-white/60 pb-6 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">{eyebrow}</p>
                    <h2 className="text-2xl font-black tracking-tight text-zinc-900">{title}</h2>
                    <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {links.map((link) => (
                    <QuickLinkCard key={link.href} {...link} />
                ))}
            </div>
        </section>
    )
}

function MetricCard({ label, value, tone }: MetricCardProps) {
    return (
        <div className={`rounded-[1.75rem] border p-5 ${tone}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">{label}</p>
            <p className="mt-3 text-2xl font-black tracking-tight text-zinc-900">{value}</p>
        </div>
    )
}

export default async function OnlineStoreDashboard() {
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

    const hasWebsiteAddon = studio.subscription_tier === 'premium' || studio.subscription_tier === 'business'
    const storefrontUrl = studio.custom_domain
        ? `https://${studio.custom_domain}`
        : `https://${studio.slug}.studiovault.co`
    const storefrontLabel = studio.custom_domain || `${studio.slug}.studiovault.co`
    const websiteConfig = (studio.website_config || {}) as WebsiteConfig
    const legalConfig = websiteConfig.legal || {}
    const completedLegalDocs = [legalConfig.terms, legalConfig.privacy, legalConfig.refund]
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
        .length
    const manualMethods = Array.isArray(studio.manual_payment_methods) ? studio.manual_payment_methods : []
    const checkoutCount = (studio.enable_xendit ? 1 : 0) + manualMethods.length
    const widgetsEnabled = [
        websiteConfig.floatingWidgets?.whatsapp?.enabled ?? studio.show_whatsapp_button ?? false,
        websiteConfig.floatingWidgets?.backToTop?.enabled ?? false,
    ].filter(Boolean).length
    const contentCount = [
        studio.blog_enabled ?? false,
        studio.faq_enabled ?? false,
    ].filter(Boolean).length

    return (
        <StudioDashboardShell
            title="Online Store"
            description="Manage how your storefront is branded, published, and sold through."
            breadcrumbs={[{ label: 'Storefront' }, { label: 'Online Store' }]}
        >
            <div className="space-y-8">
                {!hasWebsiteAddon ? (
                    <div className="overflow-hidden rounded-[2.75rem] border border-zinc-200 bg-white shadow-sm">
                        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(45,50,130,0.12),_transparent_38%),linear-gradient(180deg,_#ffffff,_#faf8f3)] p-12 text-center">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50">
                                <Globe className="h-10 w-10 text-[#2D3282]" />
                            </div>
                            <div className="mx-auto mt-8 max-w-2xl space-y-4">
                                <h2 className="text-3xl font-black tracking-tight text-zinc-900">Professional Storefront</h2>
                                <p className="text-base leading-relaxed text-zinc-500">
                                    Unlock your live website, checkout tools, and customer-facing store controls in one place.
                                </p>
                            </div>
                            <form
                                className="mt-8"
                                action={async () => {
                                    'use server'
                                    await activateStudioStorefront(studio.id)
                                }}
                            >
                                <button className="rounded-2xl bg-[#2D3282] px-10 py-3.5 text-xs font-black uppercase tracking-[0.24em] text-white shadow-lg shadow-indigo-950/10 transition-all hover:bg-indigo-900">
                                    Activate Premium Storefront
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                        <div className="overflow-hidden rounded-[2.75rem] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,_rgba(45,50,130,0.18),_transparent_40%),linear-gradient(180deg,_#ffffff,_#f7f4ee)] p-8 shadow-sm lg:p-10">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600 shadow-sm">
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                    Storefront Live
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                                    <LayoutTemplate className="h-3.5 w-3.5" />
                                    {studio.custom_domain ? 'Custom Domain Connected' : 'Using Default StudioVault Domain'}
                                </span>
                            </div>

                            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                                <div className="max-w-2xl space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-400">Storefront Control Center</p>
                                    <h2 className="text-4xl font-black tracking-tight text-zinc-900">
                                        Publish, sell, and support customers from one storefront hub.
                                    </h2>
                                    <p className="max-w-xl text-sm leading-relaxed text-zinc-500">
                                        Online Store owns your customer-facing setup: domains, navigation, checkout, widgets,
                                        blog, FAQ, waivers, and legal pages.
                                    </p>
                                </div>

                                <div className="rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
                                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Current URL</p>
                                    <p className="mt-2 break-all text-lg font-black tracking-tight text-zinc-900">{storefrontLabel}</p>
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <Link
                                            href={storefrontUrl}
                                            target="_blank"
                                            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-zinc-800"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            View Live Site
                                        </Link>
                                        <Link
                                            href="/studio/website"
                                            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-700 transition-all hover:border-zinc-300"
                                        >
                                            <Brush className="h-4 w-4" />
                                            Open Visual Editor
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            <div className="rounded-[2.5rem] border border-zinc-200 bg-white p-7 shadow-sm">
                                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                                    <Settings className="h-4 w-4" />
                                    At A Glance
                                </div>
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <MetricCard
                                        label="Checkout Methods"
                                        value={String(checkoutCount)}
                                        tone="border-orange-100 bg-orange-50/70"
                                    />
                                    <MetricCard
                                        label="Active Widgets"
                                        value={String(widgetsEnabled)}
                                        tone="border-sky-100 bg-sky-50/70"
                                    />
                                    <MetricCard
                                        label="Legal Docs"
                                        value={`${completedLegalDocs}/3`}
                                        tone="border-emerald-100 bg-emerald-50/70"
                                    />
                                    <MetricCard
                                        label="Content Areas"
                                        value={String(contentCount)}
                                        tone="border-indigo-100 bg-indigo-50/70"
                                    />
                                </div>
                            </div>

                            <div className="relative group overflow-hidden rounded-[2.5rem] bg-zinc-900 p-8 text-white shadow-xl ring-1 ring-white/10 transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10">
                                {/* Decorative gradient blur */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-50" />
                                
                                <div className="relative z-10 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Ownership Rule</p>
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tight text-white leading-tight text-balance">
                                        Keep the builder visual and keep Online Store operational.
                                    </h3>
                                    <div className="space-y-4 text-[13px] leading-relaxed text-zinc-400 font-medium">
                                        <p>
                                            Use <span className="font-black text-white px-2 py-0.5 bg-white/5 rounded-md">Website</span> for layout and page design.
                                        </p>
                                        <p>
                                            Use <span className="font-black text-white px-2 py-0.5 bg-white/5 rounded-md">Online Store</span> for publishing, checkout, policies, and storefront systems.
                                        </p>
                                        <p>
                                            Use <span className="font-black text-white px-2 py-0.5 bg-white/5 rounded-md">Management</span> for business records and operational source data.
                                        </p>
                                    </div>
                                    <Link
                                        href="/studio/online-store/domains"
                                        className="inline-flex items-center gap-2 group/link text-[10px] font-black uppercase tracking-[0.22em] text-white/60 hover:text-white transition-colors pt-2"
                                    >
                                        Start With Store Setup
                                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {hasWebsiteAddon && (
                    <>
                        <SectionBlock
                            eyebrow="Store Setup"
                            title="Brand and publish your storefront"
                            description="These controls shape how your storefront looks, how visitors move through it, and which address it lives on."
                            links={setupLinks}
                            tone="border-zinc-200 bg-[linear-gradient(180deg,_#ffffff,_#faf7f2)]"
                        />

                        <SectionBlock
                            eyebrow="Commerce"
                            title="Control checkout and conversion"
                            description="Handle how customers pay and which floating helper actions support booking and purchase flow across the storefront."
                            links={commerceLinks}
                            tone="border-orange-100 bg-[linear-gradient(180deg,_#fffdf8,_#fff7ef)]"
                        />

                        <SectionBlock
                            eyebrow="Content"
                            title="Support discovery and customer confidence"
                            description="Use customer-facing content to answer questions, share updates, and reduce friction before someone books."
                            links={contentLinks}
                            tone="border-emerald-100 bg-[linear-gradient(180deg,_#fcfffd,_#f4fbf7)]"
                        />

                        <SectionBlock
                            eyebrow="Compliance"
                            title="Protect the storefront experience"
                            description="Keep waivers, cancellation rules, and legal documentation easy to find and properly maintained."
                            links={complianceLinks}
                            tone="border-indigo-100 bg-[linear-gradient(180deg,_#fcfcff,_#f5f6ff)]"
                        />
                    </>
                )}
            </div>
        </StudioDashboardShell>
    )
}
