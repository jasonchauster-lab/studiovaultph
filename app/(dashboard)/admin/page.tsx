import { createAdminClient } from '@/lib/supabase/server'
import { redirect, unstable_rethrow } from 'next/navigation'
import { CheckCircle, Clock, Building2, MessageCircle, BarChart3, Wallet, ShieldAlert, AlertTriangle, Users, Layout, LogOut, Megaphone, Globe, History } from 'lucide-react'
import Link from 'next/link'
import { signOut } from '@/app/(marketplace)/auth/actions'
import clsx from 'clsx'
import SupportNotificationBadge from '@/components/admin/SupportNotificationBadge'
import TriggerFundsUnlockButton from '@/components/admin/TriggerFundsUnlockButton'
import ReportsTab from '@/components/admin/ReportsTab'
import BuilderManager from '@/components/admin/BuilderManager'
import AnnouncementsManager from '@/components/admin/AnnouncementsManager'
import BranchVerificationManager from '@/components/admin/BranchVerificationManager'
import { Suspense } from 'react'

// Tab Components
import OverviewTab from '@/components/admin/tabs/OverviewTab'
import VerificationsTab from '@/components/admin/tabs/VerificationsTab'
import PayoutsTab from '@/components/admin/tabs/PayoutsTab'
import SuspensionsTab from '@/components/admin/tabs/SuspensionsTab'
import AccountsTab from '@/components/admin/tabs/AccountsTab'
import CrmTab from '@/components/admin/tabs/CrmTab'
import StudiosTab from '@/components/admin/tabs/StudiosTab'
import PartnersManagementContent from './partners/PartnersManagementContent'

export default async function AdminDashboard({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    try {
        const { range, tab, search } = await searchParams
        const activeTab = (tab as string) || 'overview'
        const searchQuery = (search as string) || ''
        
        // Use the cookie-aware client for auth (createAdminClient has NO cookies = always null user)
        const { createClient } = await import('@/lib/supabase/server')
        const authClient = await createClient()
        const { data } = await authClient.auth.getUser()
        const user = data?.user
        if (!user) redirect('/login')

        // Use service-role client for admin data queries (bypasses RLS)
        const supabase = createAdminClient()

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        if (!profile || profile.role !== 'admin') {
            redirect('/studio')
        }

        // --- DATE FILTER LOGIC ---
        let startDate: string | undefined
        let endDate: string | undefined
        const now = new Date()

        if (range === '7d') {
            const d = new Date()
            d.setDate(d.getDate() - 7)
            startDate = d.toISOString()
        } else if (range === '30d') {
            const d = new Date()
            d.setDate(d.getDate() - 30)
            startDate = d.toISOString()
        } else if (range === 'this-month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        } else if (range === 'this-quarter') {
            const quarter = Math.floor(now.getMonth() / 3)
            startDate = new Date(now.getFullYear(), quarter * 3, 1).toISOString()
        } else if (range === 'this-year') {
            startDate = new Date(now.getFullYear(), 0, 1).toISOString()
        }

        // Fetch counts for the sidebar tabs
        const { data: queuesData } = await supabase.rpc('get_admin_dashboard_queues')
        const queues = queuesData || {}
        
        const verificationsCount = (queues.certifications?.length || 0) + (queues.studios_verify?.length || 0) + (queues.studios_payout?.length || 0)
        const payoutsCount = (queues.bookings?.length || 0) + (queues.instructor_payouts?.length || 0) + (queues.studio_payouts?.length || 0) + (queues.customer_payouts?.length || 0) + (queues.top_ups?.length || 0)
        const suspensionsCount = queues.suspended_profiles?.length || 0

        const systemTabs = [
            { id: 'overview', label: 'OVERVIEW', icon: BarChart3 },
            { id: 'accounts', label: 'ACCOUNTS', icon: Users },
            { id: 'payouts', label: 'PAYOUTS', icon: Wallet, count: payoutsCount },
            { id: 'verifications', label: 'VERIFICATIONS', icon: CheckCircle, count: verificationsCount },
            { id: 'suspensions', label: 'SUSPENSIONS', icon: AlertTriangle, count: suspensionsCount },
            { id: 'reports', label: 'REPORTS', icon: Clock },
        ]

        const cmsTabs = [
            { id: 'studios', label: 'STUDIOS', icon: Building2 },
            { id: 'partners', label: 'PARTNERS', icon: Users },
            { id: 'branches', label: 'BRANCHES', icon: Globe },
            { id: 'builder', label: 'BUILDER', icon: Layout },
            { id: 'crm', label: 'CRM DIRECTORY', icon: History },
            { id: 'announcements', label: 'ANNOUNCEMENTS', icon: Megaphone },
        ]

        return (
            <div className="min-h-screen bg-background p-6 sm:p-12 text-charcoal">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black tracking-[0.3em] text-forest uppercase">System Core</span>
                            <h1 className="text-5xl font-serif text-burgundy tracking-tight">Admin Console</h1>
                            <p className="text-burgundy/50 text-sm font-medium">Monitoring studio verifications, financial flows, and user activity.</p>
                        </div>
                        <div className="flex gap-4">
                            <TriggerFundsUnlockButton />
                            <Link href="/admin/support" className="btn-antigravity px-6 py-3 text-xs tracking-[0.1em] flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" />
                                SUPPORT CENTER
                                <SupportNotificationBadge />
                            </Link>
                            <form action={signOut}>
                                <button type="submit" className="px-6 py-3 text-xs tracking-[0.1em] flex items-center gap-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 rounded-xl font-black transition-all">
                                    <LogOut className="w-4 h-4" />
                                    LOG OUT
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Grouped Tab Navigation */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black tracking-[0.2em] text-forest uppercase px-2">Core System</h3>
                            <div className="flex flex-wrap gap-2 p-1.5 bg-stone-100/40 backdrop-blur-md border border-stone-200 rounded-2xl shadow-sm w-fit">
                                {systemTabs.map((t) => {
                                    const Icon = t.icon
                                    const isActive = activeTab === t.id
                                    const count = t.count || 0
                                    return (
                                        <TabLink key={t.id} tab={t} isActive={isActive} count={count} Icon={Icon} />
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black tracking-[0.2em] text-burgundy uppercase px-2">CMS & Storefront</h3>
                            <div className="flex flex-wrap gap-2 p-1.5 bg-stone-100/40 backdrop-blur-md border border-stone-200 rounded-2xl shadow-sm w-fit">
                                {cmsTabs.map((t) => {
                                    const Icon = t.icon
                                    const isActive = activeTab === t.id
                                    const count = (t as any).count || 0
                                    return (
                                        <TabLink key={t.id} tab={t} isActive={isActive} count={count} Icon={Icon} />
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <Suspense fallback={<TabLoader />}>
                        {activeTab === 'overview' && <OverviewTab startDate={startDate} endDate={endDate} />}
                        {activeTab === 'verifications' && <VerificationsTab />}
                        {activeTab === 'payouts' && <PayoutsTab />}
                        {activeTab === 'suspensions' && <SuspensionsTab />}
                        {activeTab === 'builder' && <BuilderManager />}
                        {activeTab === 'studios' && <StudiosTab searchQuery={searchQuery} />}
                        {activeTab === 'partners' && <PartnersTabWrapper />}
                        {activeTab === 'branches' && <BranchVerificationManager />}
                        {activeTab === 'accounts' && <AccountsTab searchQuery={searchQuery} />}
                        {activeTab === 'crm' && <CrmTab />}
                        {activeTab === 'announcements' && <AnnouncementsTabWrapper />}
                        {activeTab === 'reports' && <ReportsTabWrapper />}
                    </Suspense>
                </div>
            </div>
        )
    } catch (err: any) {
        unstable_rethrow(err)
        console.error('GLOBAL DASHBOARD ERROR:', err)
        return <ErrorView message={err.message} />
    }
}

function TabLink({ tab, isActive, count, Icon }: { tab: any, isActive: boolean, count: number, Icon: any }) {
    return (
        <a
            href={`/admin?tab=${tab.id}`}
            className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black tracking-[0.15em] transition-all duration-500 overflow-hidden group ${isActive
                ? 'bg-burgundy text-white shadow-lg shadow-burgundy/20 scale-[1.02]'
                : 'text-burgundy/40 hover:text-burgundy hover:bg-white/50'
                }`}
        >
            <Icon className={clsx("w-3.5 h-3.5 transition-transform duration-500", isActive ? "scale-110" : "group-hover:scale-110")} />
            {tab.label}
            {count > 0 && (
                <span className={clsx("ml-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[8px] font-black shadow-sm",
                    isActive ? "bg-white text-burgundy" : "bg-forest text-white"
                )}>
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </a>
    )
}

// Minimal wrappers or loading states
function TabLoader() {
    return (
        <div className="w-full h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-burgundy"></div>
        </div>
    )
}

function ErrorView({ message }: { message: string }) {
    return (
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-stone-50 flex items-center justify-center">
            <div className="max-w-md w-full atelier-card p-12 text-center space-y-6 border-red-100">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert className="h-10 w-10 text-red-600" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-serif text-burgundy">System Interruption</h2>
                    <p className="text-[10px] text-burgundy/40 font-black uppercase tracking-widest">Reference: Dashboard Failure</p>
                </div>
                <p className="text-burgundy/60 text-sm italic">"{message || 'An unexpected error occurred while loading the dashboard.'}"</p>
                <div className="pt-4">
                    <Link href="/admin" className="inline-block w-full py-4 bg-burgundy text-white text-[10px] font-black rounded-xl hover:brightness-110 transition-all tracking-[0.2em] shadow-xl text-center">
                        RESTART DASHBOARD
                    </Link>
                </div>
            </div>
        </div>
    )
}

// Small wrapper for announcements to handle its own data
async function AnnouncementsTabWrapper() {
    const supabase = createAdminClient()
    const { data } = await supabase.from('platform_announcements').select('*').order('created_at', { ascending: false })
    return <AnnouncementsManager initialAnnouncements={data ?? []} />
}

// Small wrapper for reports to handle its own data fetching
async function ReportsTabWrapper() {
    const supabase = createAdminClient()
    const { data: logs } = await supabase
        .from('admin_logs')
        .select('id, action_type, entity_type, entity_id, details, created_at, admin:profiles!admin_id(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(500)

    const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(500)

    return <ReportsTab logs={logs ?? []} transactions={transactions ?? []} />
}

async function PartnersTabWrapper() {
    const supabase = createAdminClient()
    
    // Fetch Instructors
    const { data: instructorsRaw } = await supabase
        .from('profiles')
        .select(`
            id, 
            full_name, 
            role, 
            is_founding_partner, 
            custom_fee_percentage, 
            email, 
            contact_number,
            gov_id_url,
            gov_id_expiry,
            bir_url,
            bir_expiry,
            certifications(proof_url, expiry_date)
        `)
        .eq('role', 'instructor')
        .order('full_name', { ascending: true });

    // Fetch Studios
    const { data: studiosRaw } = await supabase
        .from('studios')
        .select('id, name, location, is_founding_partner, custom_fee_percentage, contact_number, ai_chat_limit, ai_chat_usage, owner:profiles!owner_id(email), bir_certificate_url, bir_certificate_expiry, gov_id_url, mayors_permit_url, mayors_permit_expiry, secretary_certificate_url, space_photos_urls, insurance_url, insurance_expiry')
        .eq('verified', true)
        .order('name', { ascending: true });

    // Sign Documents
    const allPathsToSign: string[] = [];
    studiosRaw?.forEach(s => {
        if (s.bir_certificate_url) allPathsToSign.push(s.bir_certificate_url);
        if (s.gov_id_url) allPathsToSign.push(s.gov_id_url);
        if (s.mayors_permit_url) allPathsToSign.push(s.mayors_permit_url);
        if (s.secretary_certificate_url) allPathsToSign.push(s.secretary_certificate_url);
        if (s.insurance_url) allPathsToSign.push(s.insurance_url);
    });
    instructorsRaw?.forEach(i => {
        if (i.gov_id_url) allPathsToSign.push(i.gov_id_url);
        if (i.bir_url) allPathsToSign.push(i.bir_url);
        const cert = Array.isArray(i.certifications) ? i.certifications[0] : i.certifications;
        if (cert?.proof_url) allPathsToSign.push(cert.proof_url);
    });

    const globalSignedUrlsMap: Record<string, string> = {};
    if (allPathsToSign.length > 0) {
        const { data: signedData } = await supabase.storage.from('certifications').createSignedUrls(allPathsToSign, 3600);
        signedData?.forEach(item => {
            if (item.signedUrl && item.path) globalSignedUrlsMap[item.path] = item.signedUrl;
        });
    }

    const instructors = (instructorsRaw || []).map((i: any) => {
        const cert = Array.isArray(i.certifications) ? i.certifications[0] : i.certifications;
        return {
            ...i,
            documents: {
                bir: i.bir_url ? globalSignedUrlsMap[i.bir_url] : null,
                birExpiry: i.bir_expiry,
                govId: i.gov_id_url ? globalSignedUrlsMap[i.gov_id_url] : null,
                govIdExpiry: i.gov_id_expiry,
                cert: cert?.proof_url ? globalSignedUrlsMap[cert.proof_url] : null,
                certExpiry: cert?.expiry_date
            }
        };
    });

    const studios = (studiosRaw || []).map((s: any) => ({
        ...s,
        documents: {
            bir: s.bir_certificate_url ? globalSignedUrlsMap[s.bir_certificate_url] : null,
            birExpiry: s.bir_certificate_expiry,
            govId: s.gov_id_url ? globalSignedUrlsMap[s.gov_id_url] : null,
            mayorsPermit: s.mayors_permit_url ? globalSignedUrlsMap[s.mayors_permit_url] : null,
            mayorsPermitExpiry: s.mayors_permit_expiry,
            secretaryCert: s.secretary_certificate_url ? globalSignedUrlsMap[s.secretary_certificate_url] : null,
            insurance: s.insurance_url ? globalSignedUrlsMap[s.insurance_url] : null,
            insuranceExpiry: s.insurance_expiry,
            spacePhotos: s.space_photos_urls || []
        }
    }));

    return <PartnersManagementContent instructors={instructors} studios={studios} />
}
