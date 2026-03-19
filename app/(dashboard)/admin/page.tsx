import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CheckCircle, Clock, Building2, MessageCircle, BarChart3, Wallet, ShieldAlert, AlertTriangle, Users } from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import VerifyButton from '@/components/admin/VerifyButton'
import RejectBookingButton from '@/components/admin/RejectBookingButton'
import { getAdminAnalytics } from './actions'
import AdminAnalytics from '@/components/admin/AdminAnalytics'
import ExportCsvButton from '@/components/dashboard/ExportCsvButton'
import DateRangeFilters from '@/components/dashboard/DateRangeFilters'
import SupportNotificationBadge from '@/components/admin/SupportNotificationBadge'
import AdminExportButtons from '@/components/admin/AdminExportButtons'
import TriggerFundsUnlockButton from '@/components/admin/TriggerFundsUnlockButton'
import BalanceAdjustmentTool from '@/components/admin/BalanceAdjustmentTool'
import ReportsTab from '@/components/admin/ReportsTab'
import UserSearchBar from '@/components/admin/UserSearchBar'
import { Search } from 'lucide-react'

// Since this is a server component, we fetch data directly
import * as fs from 'fs'

export default async function AdminDashboard({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const log = (msg: string) => console.log(`[AdminDashboard] ${msg}`)
    log('Entered component')
    
    try {
        log('Started render')
        const { range, tab, search } = await searchParams
        const activeTab = (tab as string) || 'overview'
        const searchQuery = (search as string) || ''
        
        let publicSupabase: any = null;
        try {
            publicSupabase = await createClient()
            log('Public Supabase client initialized')
        } catch (e: any) {
            log(`CRITICAL: Public Supabase init failed: ${e.message}`)
            throw e; // Re-throw to be caught by global catch
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
        // --- END DATE FILTER LOGIC ---

        const supabase = createAdminClient() // This is the admin client, now named 'supabase'
        console.log('Analytics: Triggering fetch...')
        log('AdminDashboard: Initial fetches triggered')
        const results = await Promise.all([
            // 1. Certification verification queue
            supabase.from('certifications')
                .select('*, profiles(full_name, contact_number, tin, gov_id_url, gov_id_expiry, bir_url)')
                .eq('verified', false)
                .order('created_at', { ascending: false }),

            // 2. Studio verification queue
            supabase.from('studios')
                .select('*, profiles(full_name)')
                .eq('verified', false)
                .order('created_at', { ascending: false }),

            // 3. Studio payout setup queue
            supabase.from('studios')
                .select('id, name, mayors_permit_url, secretary_certificate_url, mayors_permit_expiry, bir_certificate_url, bir_certificate_expiry, insurance_url, insurance_expiry, created_at, profiles(full_name)')
                .eq('payout_approval_status', 'pending')
                .order('created_at', { ascending: false }),

            // 4. Pending booking requests
            supabase.from('bookings')
                .select(`
                    *,
                    client:profiles!client_id(full_name, email),
                    instructor:profiles!instructor_id(full_name, email),
                    slots(
                        date,
                        start_time,
                        end_time,
                        studios(
                            name,
                            location,
                            address,
                            profiles!owner_id(full_name, email)
                        )
                    )
                `)
                .eq('status', 'pending')
                .or('total_price.eq.0,payment_proof_url.not.is.null')
                .order('created_at', { ascending: false }),

            // 5. Instructor payout requests
            supabase.from('payout_requests')
                .select('*, instructor:profiles!instructor_id(id, full_name, email)')
                .eq('status', 'pending')
                .not('instructor_id', 'is', null)
                .order('created_at', { ascending: false }),

            // 6. Studio payout requests
            supabase.from('payout_requests')
                .select('*, studios(name, profiles(full_name))')
                .eq('status', 'pending')
                .not('studio_id', 'is', null)
                .order('created_at', { ascending: false }),

            // 7. Customer payout requests
            supabase.from('payout_requests')
                .select('*, profile:profiles!user_id(id, full_name, role, email)')
                .eq('status', 'pending')
                .not('user_id', 'is', null)
                .is('instructor_id', null)
                .is('studio_id', null)
                .order('created_at', { ascending: false }),

            // 8. Pending wallet top-ups
            supabase.from('wallet_top_ups')
                .select('*, profiles:profiles!user_id(full_name, email, role)')
                .eq('status', 'pending')
                .eq('type', 'top_up')
                .order('created_at', { ascending: false }),

            // 9. Suspended studios
            supabase.from('profiles')
                .select('id, full_name, email, is_suspended, studios(id, name)')
                .eq('is_suspended', true),

            // 10. Analytics
            getAdminAnalytics(startDate, endDate),

            // 11. Negative balance instructors
            supabase.from('profiles')
                .select('id, full_name, email, available_balance')
                .eq('role', 'instructor')
                .lt('available_balance', 0)
                .order('available_balance', { ascending: true }),

            // 12. Admin activity logs
            supabase.from('admin_activity_logs')
                .select('id, action_type, entity_type, entity_id, details, created_at, admin:profiles!admin_id(full_name, email)')
                .order('created_at', { ascending: false })
                .limit(500),

            // 13. All users (capped at 1000 — prevents unbounded fetch on large platforms)
            (() => {
                let query = supabase.from('profiles')
                    .select('id, full_name, email, role, created_at, available_balance, is_suspended, contact_number, waiver_url, waiver_signed_at')
                    .order('created_at', { ascending: false })
                    .limit(1000)
                
                if (searchQuery) {
                    query = query.or(`email.ilike.%${searchQuery}%,contact_number.ilike.%${searchQuery}%`)
                }
                
                return query
            })(),
        ])
        log('AdminDashboard: Initial fetches completed')
        log('AdminDashboard: Initial fetches completed')

        const [
            pendingCertsResult,
            pendingStudiosResult,
            pendingStudioPayoutsResult,
            pendingBookingsResult,
            payoutRequestsResult,
            studioPayoutsResult,
            rawUserPayoutsResult,
            pendingTopUpsResult,
            suspendedStudiosResult,
            analyticsResult,
            negativeBalanceResult,
            activityLogsResult,
            allUsersResult,
        ] = results

        // ── Data Prep ──────────────────────────────────────────────
        const pendingCerts = pendingCertsResult?.data ?? []
        const pendingStudios = pendingStudiosResult?.data ?? []
        const pendingStudioPayouts = pendingStudioPayoutsResult?.data ?? []
        const pendingBookings = pendingBookingsResult?.data ?? []

        const payoutRequests = (payoutRequestsResult?.data ?? []).map((p: any) => ({
            ...p,
            instructor_name: (Array.isArray(p.instructor) ? p.instructor[0] : p.instructor)?.full_name ?? null,
        }))

        const studioPayouts = studioPayoutsResult?.data ?? []

        const customerPayouts = (rawUserPayoutsResult?.data ?? []).map((p: any) => ({
            ...p,
            profile: Array.isArray(p.profile) ? p.profile[0] : p.profile
        })).filter((p: any) => p.profile?.role === 'customer')

        const pendingTopUps = pendingTopUpsResult?.data ?? []
        const suspendedStudios = suspendedStudiosResult?.data ?? []
        const analytics = analyticsResult
        const negativeBalanceInstructors = negativeBalanceResult?.data ?? []
        const activityLogs = activityLogsResult?.data ?? []
        const allUsers = allUsersResult?.data ?? []

        // ── Signed URLs ──────────────────────────────────────────────
        const certUrlPaths = pendingCerts.flatMap((cert: any) =>
            [cert.proof_url, cert.profiles?.gov_id_url, cert.profiles?.bir_url].filter(Boolean)
        )
        const studioUrlPaths = pendingStudios.flatMap((s: any) =>
            [s.bir_certificate_url, s.gov_id_url, s.insurance_url].filter(Boolean)
        )
        const payoutUrlPaths = pendingStudioPayouts.flatMap((s: any) =>
            [s.mayors_permit_url, s.secretary_certificate_url, s.insurance_url].filter(Boolean)
        )
        const isStoragePath = (url: string) => url && !url.startsWith('http')
        const paymentProofPaths = [
            ...(pendingBookings?.map((b: any) => b.payment_proof_url).filter(isStoragePath) || []),
            ...(pendingTopUps?.map((t: any) => t.payment_proof_url).filter(isStoragePath) || [])
        ]
        const waiverPaths = allUsers?.map((u: any) => u.waiver_url).filter(isStoragePath) || []

        const [certSignedRes, studioSignedRes, payoutSignedRes, paymentSignedRes, waiverSignedRes] = await Promise.all([
            certUrlPaths.length > 0 ? supabase.storage.from('certifications').createSignedUrls(certUrlPaths, 3600) : Promise.resolve({ data: [] }),
            studioUrlPaths.length > 0 ? supabase.storage.from('certifications').createSignedUrls(studioUrlPaths, 3600) : Promise.resolve({ data: [] }),
            payoutUrlPaths.length > 0 ? supabase.storage.from('certifications').createSignedUrls(payoutUrlPaths, 3600) : Promise.resolve({ data: [] }),
            paymentProofPaths.length > 0 ? supabase.storage.from('payment-proofs').createSignedUrls(paymentProofPaths, 3600) : Promise.resolve({ data: [] }),
            waiverPaths.length > 0 ? supabase.storage.from('waivers').createSignedUrls(waiverPaths, 3600) : Promise.resolve({ data: [] }),
        ])

        const mkMap = (res: any) => Object.fromEntries((res.data ?? []).filter((r: any) => r.signedUrl).map((r: any) => [r.path, r.signedUrl]))
        const certUrlMap = mkMap(certSignedRes)
        const studioUrlMap = mkMap(studioSignedRes)
        const payoutUrlMap = mkMap(payoutSignedRes)
        const paymentUrlMap = mkMap(paymentSignedRes)
        const waiverUrlMap = mkMap(waiverSignedRes)

        const getDisplayUrl = (original: string): string => {
            if (!original) return original
            if (!isStoragePath(original)) return original
            
            // Check in order of priority, fallback to original if not found in maps
            const url = paymentUrlMap[original] || waiverUrlMap[original] || original
            
            // Helpful logging for admins to see which paths failed to sign
            if (url === original && isStoragePath(original)) {
                console.warn(`[AdminDashboard] Storage path not found in signed maps: ${original}. Check bucket permissions or existence.`);
            }
            
            return url
        }

        const safeFormatDate = (dateStr: string | null | undefined, options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }): string => {
            if (!dateStr) return 'No Date'
            try {
                const d = new Date(dateStr)
                if (isNaN(d.getTime())) return 'No Date'
                return d.toLocaleDateString('en-PH', options)
            } catch (e) {
                return 'No Date'
            }
        }

        const safeFormatCurrency = (val: any): string => {
            try {
                return Number(val || 0).toLocaleString()
            } catch (e) {
                return '0'
            }
        }

        const certsWithUrls = pendingCerts.map((cert: any) => ({
            ...cert,
            signedUrl: cert.proof_url ? (certUrlMap[cert.proof_url] ?? null) : null,
            govIdSignedUrl: cert.profiles?.gov_id_url ? (certUrlMap[cert.profiles.gov_id_url] ?? null) : null,
            birSignedUrl: cert.profiles?.bir_url ? (certUrlMap[cert.profiles.bir_url] ?? null) : null,
        }))

        const studiosWithUrls = pendingStudios.map((studio: any) => ({
            ...studio,
            birSignedUrl: studio.bir_certificate_url ? (studioUrlMap[studio.bir_certificate_url] ?? null) : null,
            govIdSignedUrl: studio.gov_id_url ? (studioUrlMap[studio.gov_id_url] ?? null) : null,
            insuranceSignedUrl: studio.insurance_url ? (studioUrlMap[studio.insurance_url] ?? null) : null,
        }))

        const payoutStudiosWithUrls = pendingStudioPayouts.map((studio: any) => ({
            ...studio,
            permitSignedUrl: studio.mayors_permit_url ? (payoutUrlMap[studio.mayors_permit_url] ?? null) : null,
            certSignedUrl: studio.secretary_certificate_url ? (payoutUrlMap[studio.secretary_certificate_url] ?? null) : null,
            birSignedUrl: studio.bir_certificate_url ? (payoutUrlMap[studio.bir_certificate_url] ?? null) : null,
            insuranceSignedUrl: studio.insurance_url ? (payoutUrlMap[studio.insurance_url] ?? null) : null,
        }))

        const verificationsCount = certsWithUrls.length + studiosWithUrls.length + payoutStudiosWithUrls.length
        const payoutsCount = pendingBookings.length + payoutRequests.length + studioPayouts.length + customerPayouts.length + pendingTopUps.length
        const suspensionsCount = suspendedStudios.length

        const tabs = [
            { id: 'overview', label: 'OVERVIEW', icon: BarChart3 },
            { id: 'verifications', label: 'VERIFICATIONS', icon: CheckCircle, count: verificationsCount },
            { id: 'payouts', label: 'PAYOUTS', icon: Wallet, count: payoutsCount },
            { id: 'suspensions', label: 'SUSPENSIONS', icon: AlertTriangle, count: suspensionsCount },
            { id: 'customers', label: 'CUSTOMERS', icon: Users },
            { id: 'reports', label: 'REPORTS', icon: Clock },
        ]

        return (
            <div className="min-h-screen bg-background p-6 sm:p-12 text-charcoal">
                <div className="max-w-7xl mx-auto space-y-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black tracking-[0.3em] text-sage uppercase">System Core</span>
                            <h1 className="text-5xl font-serif text-charcoal tracking-tight">Admin Console</h1>
                            <p className="text-charcoal/50 text-sm font-medium">Monitoring studio verifications, financial flows, and user activity.</p>
                        </div>
                        <div className="flex gap-4">
                            <TriggerFundsUnlockButton />
                            <Link href="/admin/support" className="btn-antigravity px-6 py-3 text-xs tracking-[0.1em] flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" />
                                SUPPORT CENTER
                                <SupportNotificationBadge />
                            </Link>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex flex-wrap gap-2 p-1.5 bg-white/40 backdrop-blur-md border border-white/50 rounded-2xl shadow-cloud w-fit">
                        {tabs.map((t) => {
                            const Icon = t.icon
                            const isActive = activeTab === t.id
                            const count = (t as any).count || 0

                            return (
                                <a
                                    key={t.id}
                                    href={`/admin?tab=${t.id}`}
                                    className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black tracking-[0.15em] transition-all duration-500 overflow-hidden group ${isActive
                                        ? 'bg-forest text-white shadow-lg shadow-charcoal/20 scale-[1.02]'
                                        : 'text-charcoal/40 hover:text-charcoal hover:bg-white/50'
                                        }`}
                                >
                                    <Icon className={clsx("w-3.5 h-3.5 transition-transform duration-500", isActive ? "scale-110" : "group-hover:scale-110")} />
                                    {t.label}
                                    {count > 0 && (
                                        <span className={clsx("ml-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[8px] font-black shadow-sm",
                                            isActive ? "bg-white text-charcoal" : "bg-forest text-white"
                                        )}>
                                            {count > 99 ? '99+' : count}
                                        </span>
                                    )}
                                </a>
                            )
                        })}
                    </div>

                    {/* --- Content Tabs --- */}
                    {activeTab === 'overview' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <h2 className="text-sm font-black tracking-[0.2em] text-charcoal/50 uppercase flex items-center gap-3">
                                        <div className="w-8 h-px bg-charcoal/20" />
                                        Analytics Engine
                                    </h2>
                                    <div className="flex items-center gap-3">
                                        {analytics && !('error' in analytics) && <ExportCsvButton data={analytics.transactions || []} />}
                                        <DateRangeFilters />
                                    </div>
                                </div>
                                <div className="glass-card p-8">
                                    <AdminExportButtons startDate={startDate} endDate={endDate} />
                                </div>
                                {!analytics || ('error' in analytics) ? (
                                    <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-100">
                                        <p className="font-bold">Operational Intelligence Unavailable</p>
                                        <p className="text-xs mt-1">{analytics ? (analytics as any).error : 'Data stream timeout'}</p>
                                    </div>
                                ) : (
                                    <AdminAnalytics stats={analytics} />
                                )}
                            </div>

                            {negativeBalanceInstructors.length > 0 && (
                                <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm">
                                    <h2 className="text-xl font-medium text-orange-600 mb-4 flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5" />
                                        Negative Balance Instructors
                                        <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">{negativeBalanceInstructors.length}</span>
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {negativeBalanceInstructors.map((instructor: any) => (
                                            <div key={instructor.id} className="border border-orange-100 rounded-lg p-4 bg-orange-50/30 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold text-charcoal-900">{instructor.full_name}</p>
                                                    <p className="text-xs text-charcoal-600 font-bold text-red-600 mt-1">₱{safeFormatCurrency(instructor.available_balance)}</p>
                                                </div>
                                                <VerifyButton id={instructor.id} action="settleInstructorDebt" label="Settle" className="px-4 py-2 bg-forest text-white text-xs rounded-lg font-bold" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'verifications' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="glass-card p-8 space-y-6">
                                <h2 className="text-sm font-black tracking-[0.2em] text-charcoal flex items-center gap-3">
                                    <CheckCircle className="w-4 h-4 text-sage" />
                                    INSTRUCTOR VERIFICATIONS
                                    {certsWithUrls.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{certsWithUrls.length}</span>}
                                </h2>
                                {certsWithUrls.length === 0 ? <p className="text-charcoal/40 text-xs italic">All instructor certifications are up to date.</p> : (
                                    <div className="space-y-4">
                                        {certsWithUrls.map((cert: any) => (
                                            <div key={cert.id} className="group p-5 bg-alabaster/50 border border-cream-100 rounded-2xl hover:bg-white hover:shadow-cloud transition-all duration-300">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-charcoal text-sm">{cert.profiles?.full_name}</p>
                                                        <p className="text-[10px] text-charcoal/50 font-black uppercase tracking-wider">{cert.certification_name}</p>
                                                        <div className="pt-2 flex gap-3">
                                                            {cert.signedUrl && (
                                                                <a href={cert.signedUrl} target="_blank" className="text-[10px] font-black text-sage hover:text-sage-light uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                                                                    <div className="w-1 h-1 rounded-full bg-sage" />
                                                                    CERT PROOF
                                                                </a>
                                                            )}
                                                            {cert.govIdSignedUrl && (
                                                                <a href={cert.govIdSignedUrl} target="_blank" className="text-[10px] font-black text-sage hover:text-sage-light uppercase tracking-widest flex items-center gap-1.5 transition-colors">
                                                                    <div className="w-1 h-1 rounded-full bg-sage" />
                                                                    GOV ID
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <VerifyButton id={cert.id} action="rejectCert" label="REJECT" className="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-black rounded-xl hover:bg-red-100 transition-colors tracking-widest" />
                                                        <VerifyButton id={cert.id} action="approveCert" label="APPROVE" className="px-4 py-2 bg-forest text-white text-[10px] font-black rounded-xl hover:brightness-110 transition-all tracking-widest shadow-md" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="glass-card p-8 space-y-6">
                                <h2 className="text-sm font-black tracking-[0.2em] text-charcoal flex items-center gap-3">
                                    <Building2 className="w-4 h-4 text-sage" />
                                    STUDIO VERIFICATIONS
                                    {studiosWithUrls.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{studiosWithUrls.length}</span>}
                                </h2>
                                {studiosWithUrls.length === 0 ? <p className="text-charcoal/40 text-xs italic">No pending studio verifications.</p> : (
                                    <div className="space-y-4">
                                        {studiosWithUrls.map((s: any) => (
                                            <div key={s.id} className="group p-5 bg-alabaster/50 border border-cream-100 rounded-2xl hover:bg-white hover:shadow-cloud transition-all duration-300">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-charcoal text-sm">{s.name}</p>
                                                        <p className="text-[10px] text-charcoal/50 font-black uppercase tracking-wider">Owner: {s.profiles?.full_name}</p>
                                                        <div className="pt-2 flex gap-3">
                                                            {s.birSignedUrl && <a href={s.birSignedUrl} target="_blank" className="text-[10px] font-black text-sage uppercase tracking-widest">BIR</a>}
                                                            {s.govIdSignedUrl && <a href={s.govIdSignedUrl} target="_blank" className="text-[10px] font-black text-sage uppercase tracking-widest">GOV ID</a>}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <VerifyButton id={s.id} action="rejectStudio" label="REJECT" className="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-black rounded-xl" />
                                                        <VerifyButton id={s.id} action="verifyStudio" label="APPROVE" className="px-4 py-2 bg-forest text-white text-[10px] font-black rounded-xl" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="glass-card p-8 space-y-6 lg:col-span-2">
                                <h2 className="text-sm font-black tracking-[0.2em] text-charcoal flex items-center gap-3">
                                    <Wallet className="w-4 h-4 text-sage" />
                                    STUDIO PAYOUT SETUPS
                                    {payoutStudiosWithUrls.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{payoutStudiosWithUrls.length}</span>}
                                </h2>
                                {payoutStudiosWithUrls.length === 0 ? <p className="text-charcoal/40 text-xs italic">No pending payout setups.</p> : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {payoutStudiosWithUrls.map((s: any) => (
                                            <div key={s.id} className="group p-5 bg-alabaster/50 border border-cream-100 rounded-2xl hover:bg-white hover:shadow-cloud transition-all duration-300">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-charcoal text-sm">{s.name}</p>
                                                        <p className="text-[10px] text-charcoal/50 font-black uppercase tracking-wider">{s.profiles?.full_name}</p>
                                                         <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1">
                                                             {s.permitSignedUrl && (
                                                                 <div className="flex items-center gap-1.5">
                                                                     <a href={s.permitSignedUrl} target="_blank" className="text-[10px] font-black text-sage uppercase tracking-widest hover:text-charcoal transition-colors">PERMIT</a>
                                                                     {s.mayors_permit_expiry && <span className="text-[8px] text-charcoal/40 font-bold uppercase tracking-[0.1em]">Exp: {s.mayors_permit_expiry}</span>}
                                                                 </div>
                                                             )}
                                                             {s.certSignedUrl && <a href={s.certSignedUrl} target="_blank" className="text-[10px] font-black text-sage uppercase tracking-widest hover:text-charcoal transition-colors">SEC CERT</a>}
                                                         </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <VerifyButton id={s.id} action="rejectStudioPayout" label="REJECT" className="px-3 py-1 bg-red-50 text-red-700 text-[10px] font-black rounded-lg" />
                                                        <VerifyButton id={s.id} action="approveStudioPayout" label="APPROVE" className="px-3 py-1 bg-forest text-white text-[10px] font-black rounded-lg" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'payouts' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="glass-card p-8 space-y-6">
                                <h2 className="text-sm font-black tracking-[0.2em] text-charcoal flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-sage" />
                                    BOOKING REQUESTS
                                    {pendingBookings.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{pendingBookings.length}</span>}
                                </h2>
                                {pendingBookings.length === 0 ? <p className="text-charcoal/40 text-xs italic">No pending booking approvals.</p> : (
                                    <div className="space-y-6">
                                        {pendingBookings.map((b: any) => {
                                            const breakdown = b.price_breakdown || {}
                                            const instructor = b.instructor
                                            const studio = b.slots?.studios
                                            const studioOwner = Array.isArray(studio?.profiles) ? studio.profiles[0] : studio?.profiles

                                            return (
                                                <div key={b.id} className="group p-6 bg-alabaster/30 border border-cream-100 rounded-2xl hover:bg-white hover:shadow-cloud transition-all duration-300 flex flex-col lg:flex-row justify-between items-start gap-8">
                                                    <div className="flex-1 min-w-0 space-y-4">
                                                        <div className="space-y-1 overflow-hidden">
                                                            <div className="flex items-center gap-3">
                                                                <p className="font-serif text-2xl text-charcoal">
                                                                    {instructor?.full_name || 'Instructor'} <span className="text-charcoal/50 font-sans text-lg mx-1">→</span> {studio?.name || 'Studio'}
                                                                </p>
                                                                <span className="px-2.5 py-1 bg-sage/10 text-sage text-[8px] font-black rounded-lg uppercase tracking-widest border border-sage/20">
                                                                    {breakdown.equipment || 'Session'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-charcoal/50 font-medium overflow-hidden">
                                                                <span className="font-bold text-charcoal/80 truncate">Client: {b.client?.full_name}</span>
                                                                <span className="opacity-40 flex-shrink-0">•</span>
                                                                <span className="truncate">{b.client?.email}</span>
                                                            </div>
                                                            <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-wider mt-1">
                                                                {safeFormatDate(b.slots?.date)} @ {b.slots?.start_time || 'No Time'}
                                                            </p>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-cream-100/50">
                                                            <div className="space-y-1.5">
                                                                <p className="text-[8px] uppercase tracking-widest font-black text-charcoal/50">Instructor Contact</p>
                                                                <p className="text-xs font-bold text-charcoal/70">{instructor?.email}</p>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <p className="text-[8px] uppercase tracking-widest font-black text-charcoal/50">Studio Contact</p>
                                                                <p className="text-xs font-bold text-charcoal/70">{studioOwner?.email || 'N/A'}</p>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white/40 border border-white/60 p-5 rounded-2xl shadow-sm space-y-4">
                                                            <div className="flex justify-between items-end">
                                                                <p className="text-[10px] font-black text-charcoal/50 tracking-widest uppercase">Financial Breakdown</p>
                                                                <p className="text-xl font-serif text-charcoal">₱{safeFormatCurrency(b.total_price)}</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[8px] text-charcoal/50 uppercase font-black tracking-widest leading-none">Studio</p>
                                                                    <p className="text-sm font-bold text-charcoal/80 leading-none">₱{safeFormatCurrency(breakdown.studio_fee)}</p>
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[8px] text-charcoal/50 uppercase font-black tracking-widest leading-none">Instructor</p>
                                                                    <p className="text-sm font-bold text-charcoal/80 leading-none">₱{safeFormatCurrency(breakdown.instructor_fee)}</p>
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <p className="text-[8px] text-charcoal/50 uppercase font-black tracking-widest leading-none">Service</p>
                                                                    <p className="text-sm font-bold text-charcoal/80 leading-none">₱{safeFormatCurrency(breakdown.service_fee)}</p>
                                                                </div>
                                                                {breakdown.wallet_deduction > 0 && (
                                                                    <div className="space-y-0.5">
                                                                        <p className="text-[8px] text-sage uppercase font-black tracking-widest leading-none">Wallet</p>
                                                                        <p className="text-sm font-bold text-sage leading-none">-₱{safeFormatCurrency(breakdown.wallet_deduction)}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {b.payment_proof_url && (
                                                            <a href={getDisplayUrl(b.payment_proof_url)} target="_blank" className="inline-flex items-center gap-2 text-[10px] font-black text-sage hover:text-charcoal transition-colors uppercase tracking-[0.2em]">
                                                                <MessageCircle className="w-4 h-4" />
                                                                VIEW PAYMENT PROOF
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="flex lg:flex-col gap-3 w-full lg:w-40 h-full justify-end lg:pt-2">
                                                        <VerifyButton id={b.id} action="confirmBooking" label="APPROVE" className="flex-1 py-3 bg-forest text-white text-[10px] font-black rounded-xl hover:brightness-110 transition-all tracking-widest shadow-md" />
                                                        <RejectBookingButton id={b.id} className="flex-1 py-3 bg-red-50 text-red-600 text-[10px] font-black rounded-xl border border-red-100 hover:bg-red-100 transition-colors tracking-widest uppercase shadow-sm" />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="glass-card p-8 space-y-6">
                                    <h2 className="text-sm font-black tracking-[0.2em] text-charcoal flex items-center gap-3">
                                        <Wallet className="w-4 h-4 text-sage" />
                                        INSTRUCTOR PAYOUTS
                                        {payoutRequests.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{payoutRequests.length}</span>}
                                    </h2>
                                    {payoutRequests.length === 0 ? <p className="text-charcoal/40 text-xs italic">No pending requests.</p> : (
                                        <div className="space-y-4">
                                            {payoutRequests.map((r: any) => (
                                                <div key={r.id} className="p-5 bg-alabaster/50 border border-cream-100 rounded-2xl flex justify-between items-center gap-4 transition-all hover:bg-white hover:shadow-cloud group">
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <p className="text-lg font-serif text-charcoal truncate">₱{safeFormatCurrency(r.amount)}</p>
                                                        <p className="text-[10px] text-charcoal/40 font-black uppercase tracking-widest truncate">{r.instructor_name}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <VerifyButton id={r.id} action="rejectPayout" label="REJECT" className="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-black rounded-xl" />
                                                        <VerifyButton id={r.id} action="approvePayout" label="APPROVE" className="px-4 py-2 bg-forest text-white text-[10px] font-black rounded-xl shadow-sm" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card p-8 space-y-6">
                                    <h2 className="text-sm font-black tracking-[0.2em] text-charcoal flex items-center gap-3">
                                        <Wallet className="w-4 h-4 text-sage" />
                                        STUDIO PAYOUTS
                                        {studioPayouts.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{studioPayouts.length}</span>}
                                    </h2>
                                    {studioPayouts.length === 0 ? <p className="text-charcoal/40 text-xs italic">No pending payouts.</p> : (
                                        <div className="space-y-4">
                                            {studioPayouts.map((r: any) => (
                                                <div key={r.id} className="p-5 bg-alabaster/50 border border-cream-100 rounded-2xl flex justify-between items-center gap-4 transition-all hover:bg-white hover:shadow-cloud group">
                                                    <div className="space-y-1 min-w-0 flex-1">
                                                        <p className="text-lg font-serif text-charcoal truncate">₱{safeFormatCurrency(r.amount)}</p>
                                                        <p className="text-[10px] text-charcoal/40 font-black uppercase tracking-widest truncate">
                                                            {(Array.isArray(r.studios) ? r.studios[0] : r.studios)?.name || 'Unknown Studio'} 
                                                            ({(Array.isArray((Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles) ? (Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles[0] : (Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles)?.full_name || 'No Owner'})
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <VerifyButton id={r.id} action="rejectPayout" label="REJECT" className="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-black rounded-xl" />
                                                        <VerifyButton id={r.id} action="approvePayout" label="APPROVE" className="px-4 py-2 bg-forest text-white text-[10px] font-black rounded-xl shadow-sm" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card p-8 space-y-6">
                                    <h2 className="text-sm font-black tracking-[0.2em] text-charcoal flex items-center gap-3">
                                        <Wallet className="w-4 h-4 text-sage" />
                                        CUSTOMER PAYOUTS
                                        {customerPayouts.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{customerPayouts.length}</span>}
                                    </h2>
                                    {customerPayouts.length === 0 ? <p className="text-charcoal/40 text-xs italic">No pending customer breakouts.</p> : (
                                        <div className="space-y-4">
                                            {customerPayouts.map((r: any) => (
                                                <div key={r.id} className="p-5 bg-alabaster/50 border border-cream-100 rounded-2xl flex justify-between items-center transition-all hover:bg-white hover:shadow-cloud group">
                                                    <div className="space-y-1">
                                                        <p className="text-lg font-serif text-charcoal">₱{safeFormatCurrency(r.amount)}</p>
                                                        <p className="text-[10px] text-charcoal/40 font-black uppercase tracking-widest">{r.profile?.full_name}</p>
                                                        <p className="text-[9px] text-charcoal/50 font-bold uppercase">{r.profile?.email}</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <VerifyButton id={r.id} action="rejectPayout" label="REJECT" className="px-4 py-2 bg-red-50 text-red-600 text-[10px] font-black rounded-xl" />
                                                        <VerifyButton id={r.id} action="approvePayout" label="APPROVE" className="px-4 py-2 bg-forest text-white text-[10px] font-black rounded-xl shadow-sm" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card p-8 space-y-6">
                                    <h2 className="text-sm font-black tracking-[0.2em] text-charcoal flex items-center gap-3">
                                        <Wallet className="w-4 h-4 text-sage" />
                                        WALLET TOP-UPS
                                        {pendingTopUps.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{pendingTopUps.length}</span>}
                                    </h2>
                                    {pendingTopUps.length === 0 ? <p className="text-charcoal/40 text-xs italic">No pending top-ups.</p> : (
                                        <div className="space-y-4">
                                            {pendingTopUps.map((t: any) => (
                                                <div key={t.id} className="p-5 bg-alabaster/50 border border-cream-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all hover:bg-white hover:shadow-cloud group">
                                                    <div className="flex items-start gap-4">
                                                        {t.payment_proof_url && (
                                                            <a href={getDisplayUrl(t.payment_proof_url)} target="_blank" className="relative w-20 h-20 rounded-xl overflow-hidden border border-cream-200 bg-white flex-shrink-0 group-hover:border-sage/30 transition-colors shadow-sm">
                                                                <img 
                                                                    src={getDisplayUrl(t.payment_proof_url)} 
                                                                    alt="Payment Proof" 
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                                    onError={(e) => {
                                                                        // Fallback UI if image fails to load (likely due to missing bucket/permissions)
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.style.display = 'none';
                                                                        const parent = target.parentElement;
                                                                        if (parent) {
                                                                            parent.classList.add('flex', 'items-center', 'justify-center', 'bg-alabaster');
                                                                            const iconDiv = document.createElement('div');
                                                                            iconDiv.className = 'text-[9px] font-black text-charcoal/30 text-center px-2 uppercase tracking-tight';
                                                                            iconDiv.innerText = 'IMAGE ERROR';
                                                                            parent.appendChild(iconDiv);
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 flex items-center justify-center transition-colors">
                                                                    <BarChart3 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                                                                </div>
                                                            </a>
                                                        )}
                                                        <div className="space-y-1 min-w-0 flex-1">
                                                            <p className="text-xl font-serif text-charcoal truncate">₱{safeFormatCurrency(t.amount)}</p>
                                                            <div className="space-y-0.5 overflow-hidden">
                                                                <p className="text-[10px] text-charcoal font-black uppercase tracking-widest truncate">{t.profiles?.full_name}</p>
                                                                <p className="text-[9px] text-charcoal/40 font-bold uppercase tracking-wider truncate">{t.profiles?.email}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 w-full sm:w-auto">
                                                        <VerifyButton id={t.id} action="rejectTopUp" label="REJECT" className="flex-1 sm:flex-none px-6 py-2.5 bg-red-50 text-red-600 text-[10px] font-black rounded-xl hover:bg-red-100 transition-colors tracking-widest uppercase" />
                                                        <VerifyButton id={t.id} action="approveTopUp" label="APPROVE" className="flex-1 sm:flex-none px-6 py-2.5 bg-forest text-white text-[10px] font-black rounded-xl hover:brightness-110 transition-all tracking-widest uppercase shadow-md shadow-forest/20" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card p-8 bg-forest text-white border-0 shadow-2xl lg:col-span-2">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-white/10 rounded-2xl">
                                            <ShieldAlert className="w-6 h-6 text-rose-gold" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black tracking-[0.2em] uppercase">Manual Financial Adjustment</h2>
                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Direct wallet balance manipulation</p>
                                        </div>
                                    </div>
                                    <BalanceAdjustmentTool />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'suspensions' && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="glass-card p-12 border-red-100/30">
                                <h2 className="text-sm font-black tracking-[0.2em] text-red-500 mb-8 flex items-center gap-3">
                                    <AlertTriangle className="w-4 h-4" />
                                    QUARANTINED ACCOUNTS
                                    {suspendedStudios.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-[10px] font-black">{suspendedStudios.length}</span>}
                                </h2>
                                {suspendedStudios.length === 0 ? (
                                    <div className="text-center py-12 space-y-4">
                                        <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-sage" />
                                        </div>
                                        <p className="text-charcoal font-serif text-xl">System accounts are healthy.</p>
                                        <p className="text-charcoal/40 text-sm">No accounts are currently under suspension.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {suspendedStudios.map((p: any) => (
                                            <div key={p.id} className="group p-6 bg-red-50/30 border border-red-100/50 rounded-2xl hover:bg-white hover:shadow-cloud transition-all duration-300">
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="font-bold text-charcoal text-sm">{p.studios?.[0]?.name || p.full_name}</p>
                                                        <p className="text-[10px] text-charcoal/40 font-black uppercase tracking-widest mt-1">{p.studios?.[0] ? 'Studio Owner' : 'Instructor'}</p>
                                                    </div>
                                                    <VerifyButton id={p.id} action="reinstateStudio" label="REINSTATE ACCESS" className="w-full py-3 bg-forest text-white text-[10px] font-black rounded-xl hover:brightness-110 transition-all tracking-widest" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'customers' && (
                        <div className="glass-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="p-8 border-b border-cream-100 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
                                <div className="space-y-1">
                                    <h2 className="text-sm font-black tracking-[0.2em] text-charcoal uppercase">USER ARCHIVE</h2>
                                    <p className="text-[10px] text-charcoal/40 font-bold uppercase tracking-widest">{allUsers.length} {searchQuery ? 'MATCHES FOUND' : 'TOTAL REGISTRATIONS'}</p>
                                </div>
                                <UserSearchBar />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-alabaster/50 border-b border-cream-100">
                                        <tr>
                                            <th className="px-8 py-5 text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em]">IDENTIFIER</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em]">ACCESS LEVEL</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em]">CREDITS</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em]">STATUS</th>
                                            <th className="px-8 py-5 text-[9px] font-black text-charcoal/40 uppercase tracking-[0.2em]">DOCUMENTS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cream-50">
                                        {allUsers.map((u: any) => (
                                            <tr key={u.id} className="hover:bg-sage/5 transition-colors group">
                                                <td className="px-8 py-6">
                                                    <p className="font-bold text-charcoal text-sm">{u.full_name}</p>
                                                    <p className="text-[10px] text-charcoal/40 font-medium">{u.email}</p>
                                                    <p className="text-[10px] text-charcoal/50 mt-0.5">{u.contact_number}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={clsx(
                                                        "inline-flex px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                                                        u.role === 'admin' ? "bg-forest text-white border-charcoal" :
                                                            u.role === 'instructor' ? "bg-sage/10 text-sage border-sage/20" :
                                                                u.role === 'studio' ? "bg-rose-gold/10 text-rose-gold border-rose-gold/20" :
                                                                    "bg-alabaster text-charcoal/40 border-cream-100"
                                                    )}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="font-serif text-charcoal text-sm">₱{safeFormatCurrency(u.available_balance)}</p>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                                                        <BalanceAdjustmentTool initialProfile={u} variant="minimal" />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={clsx("w-1.5 h-1.5 rounded-full", u.is_suspended ? "bg-red-500" : "bg-green-500")} />
                                                        <span className={clsx(
                                                            "text-[9px] font-black uppercase tracking-widest",
                                                            u.is_suspended ? "text-red-500" : "text-green-500"
                                                        )}>
                                                            {u.is_suspended ? "Suspended" : "Active"}
                                                        </span>
                                                    </div>
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                                                        <VerifyButton
                                                            id={u.id}
                                                            action={u.is_suspended ? "reinstateStudio" : "suspendUser"}
                                                            label={u.is_suspended ? "REINSTATE" : "SUSPEND"}
                                                            className={clsx(
                                                                "px-3 py-1.5 text-[8px] font-black rounded-lg transition-all",
                                                                u.is_suspended ? "bg-forest text-white" : "bg-red-50 text-red-600 hover:bg-red-100"
                                                            )}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {u.waiver_url ? (
                                                        <a href={getDisplayUrl(u.waiver_url)} target="_blank" className="text-[9px] font-black text-sage hover:text-charcoal uppercase tracking-widest flex items-center gap-1.5">
                                                            <div className="w-1 h-1 rounded-full bg-sage" />
                                                            VIEW WAIVER
                                                        </a>
                                                    ) : (
                                                        <span className="text-[9px] font-black text-charcoal/50 uppercase tracking-widest">NONE</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <ReportsTab
                            logs={activityLogs as any}
                            transactions={(analytics && !('error' in analytics)) ? (analytics.transactions || []) : []}
                        />
                    )}
                </div>
            </div>
        )
    } catch (err: any) {
        log(`AdminDashboard: GLOBAL ERROR: ${err.message}\n${err.stack}`)
        console.error('GLOBAL DASHBOARD ERROR:', err)
        return (
            <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-alabaster flex items-center justify-center">
                <div className="max-w-md w-full glass-card p-12 text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                        <ShieldAlert className="h-10 w-10 text-red-600" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-serif text-charcoal">System Interruption</h2>
                        <p className="text-xs text-charcoal/40 font-bold uppercase tracking-widest">Reference: Dashboard Failure</p>
                    </div>
                    <p className="text-charcoal/60 text-sm italic">"{err.message || 'An unexpected error occurred while loading the dashboard.'}"</p>
                    <div className="pt-4">
                        <Link href="/admin" className="inline-block w-full py-4 bg-forest text-white text-[10px] font-black rounded-xl hover:brightness-110 transition-all tracking-[0.2em] shadow-xl text-center">
                            RESTART DASHBOARD
                        </Link>
                    </div>
                </div>
            </div>
        )
    }
}
