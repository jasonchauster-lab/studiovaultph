import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CheckCircle, Clock, Building2, MessageCircle, BarChart3, Download, Wallet, ArrowUpRight, ShieldAlert, AlertTriangle } from 'lucide-react'
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

// Since this is a server component, we fetch data directly
export default async function AdminDashboard({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { range, tab } = await searchParams
    const activeTab = (tab as string) || 'overview'
    const supabase = await createClient()

    // --- DATE FILTER LOGIC ---
    let startDate: string | undefined
    let endDate: string | undefined // BUSINESS LOGIC: Undefined endDate means no upper bound (includes future bookings)
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

    // Auth (fast — served from session cache)
    const { data: { user } } = await supabase.auth.getUser()

    // ── Run ALL independent queries in parallel ──────────────────────────
    const adminDb = createAdminClient()
    let results: any[] = []
    try {
        results = await Promise.all([
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
                .select('id, name, mayors_permit_url, secretary_certificate_url, mayors_permit_expiry, secretary_certificate_expiry, bir_certificate_url, bir_certificate_expiry, insurance_url, insurance_expiry, created_at, profiles(full_name)')
                .eq('payout_approval_status', 'pending')
                .order('created_at', { ascending: false }),

            // 4. Pending booking requests
            supabase.from('bookings')
                .select('*, client:profiles!client_id(full_name), instructor:profiles!instructor_id(full_name), slots(date, start_time, end_time, studios(name, location, address))')
                .eq('status', 'pending')
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

            // 13. All users
            adminDb.from('profiles')
                .select('id, full_name, email, role, created_at, available_balance, is_suspended, contact_number, waiver_url, waiver_signed_at')
                .order('created_at', { ascending: false }),
        ])
    } catch (err: any) {
        console.error('CRITICAL DASHBOARD FETCH ERROR:', err)
        return <div className="p-8 text-red-600 font-bold bg-white m-8 rounded-xl border border-red-200">
            <h1 className="text-xl mb-4">Dashboard Loading Failed (Fetch Stage)</h1>
            <p className="text-sm font-mono whitespace-pre-wrap">{err.message}</p>
        </div>
    }

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

    // ── Destructure results ──────────────────────────────────────────────
    const pendingCerts = pendingCertsResult.data ?? []
    const pendingStudios = pendingStudiosResult.data ?? []
    const pendingStudioPayouts = pendingStudioPayoutsResult.data ?? []
    const pendingBookings = pendingBookingsResult.data

    // Instructor payouts: flatten join result to match original shape
    const payoutRequests = (payoutRequestsResult.data ?? []).map((p: any) => ({
        ...p,
        instructor_name: (Array.isArray(p.instructor) ? p.instructor[0] : p.instructor)?.full_name ?? null,
    }))

    const studioPayouts = studioPayoutsResult.data ?? []

    // Customer payouts: join replaces the separate profiles query; filter role in JS
    const customerPayouts = (rawUserPayoutsResult.data ?? []).filter((p: any) => {
        const profile = Array.isArray(p.profile) ? p.profile[0] : p.profile
        return profile?.role === 'customer'
    })

    const pendingTopUps = pendingTopUpsResult.data
    const suspendedStudios = suspendedStudiosResult.data ?? []
    const analytics = analyticsResult
    const negativeBalanceInstructors = negativeBalanceResult.data
    const activityLogs = activityLogsResult.data
    const allUsers = allUsersResult.data
    if (allUsersResult.error) console.error('allUsers fetch error:', allUsersResult.error.message)

    // ── Batch signed URL generation ──────────────────────────────────────
    // Collect all storage paths per bucket group, then make ONE call each
    const certUrlPaths = pendingCerts.flatMap((cert: any) =>
        [cert.proof_url, cert.profiles?.gov_id_url, cert.profiles?.bir_url].filter(Boolean)
    )
    const studioUrlPaths = pendingStudios.flatMap((s: any) =>
        [s.bir_certificate_url, s.gov_id_url, s.insurance_url].filter(Boolean)
    )
    const payoutUrlPaths = pendingStudioPayouts.flatMap((s: any) =>
        [s.mayors_permit_url, s.secretary_certificate_url, s.insurance_url].filter(Boolean)
    )
    const isStoragePath = (url: string) => url && !url.startsWith('http');
    const paymentProofPaths = [
        ...(pendingBookings?.map((b: any) => b.payment_proof_url).filter(isStoragePath) || []),
        ...(pendingTopUps?.map((t: any) => t.payment_proof_url).filter(isStoragePath) || [])
    ]
    const waiverPaths = allUsers?.map((u: any) => u.waiver_url).filter(isStoragePath) || []

    const [certSignedRes, studioSignedRes, payoutSignedRes, paymentSignedRes, waiverSignedRes] = await Promise.all([
        certUrlPaths.length > 0
            ? supabase.storage.from('certifications').createSignedUrls(certUrlPaths, 3600)
            : Promise.resolve({ data: [] as any[] }),
        studioUrlPaths.length > 0
            ? supabase.storage.from('certifications').createSignedUrls(studioUrlPaths, 3600)
            : Promise.resolve({ data: [] as any[] }),
        payoutUrlPaths.length > 0
            ? supabase.storage.from('certifications').createSignedUrls(payoutUrlPaths, 3600)
            : Promise.resolve({ data: [] as any[] }),
        paymentProofPaths.length > 0
            ? supabase.storage.from('payment-proofs').createSignedUrls(paymentProofPaths, 3600)
            : Promise.resolve({ data: [] as any[] }),
        waiverPaths.length > 0
            ? supabase.storage.from('waivers').createSignedUrls(waiverPaths, 3600)
            : Promise.resolve({ data: [] as any[] }),
    ])

    const mkUrlMap = (res: any): Record<string, string> =>
        Object.fromEntries((res.data ?? []).filter((r: any) => r.signedUrl).map((r: any) => [r.path, r.signedUrl]))
    const certUrlMap = mkUrlMap(certSignedRes)
    const studioUrlMap = mkUrlMap(studioSignedRes)
    const payoutUrlMap = mkUrlMap(payoutSignedRes)
    const paymentUrlMap = mkUrlMap(paymentSignedRes)
    const waiverUrlMap = mkUrlMap(waiverSignedRes)

    // Helper to get display URL (signed or legacy public)
    const getDisplayUrl = (original: string) => {
        if (!original) return original
        if (!isStoragePath(original)) return original
        return paymentUrlMap[original] || waiverUrlMap[original] || original
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
        insuranceSignedUrl: studio.insurance_url ? (payoutUrlMap[studio.insurance_url] ?? null) : null,
    }))

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'verifications', label: 'Verifications', icon: CheckCircle },
        { id: 'payouts', label: 'Payouts & Wallet', icon: Wallet },
        { id: 'customers', label: 'Customers', icon: ShieldAlert },
        { id: 'reports', label: 'Reports', icon: Clock },
    ]


    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-1">Admin Dashboard</h1>
                        <p className="text-charcoal-600 text-sm">Manage verifications, payouts, and system activity.</p>
                    </div>
                    <div className="flex gap-2">
                        <TriggerFundsUnlockButton />
                        <a href="/admin/support" className="px-4 py-2 bg-charcoal-900 text-cream-50 rounded-lg text-sm font-medium hover:bg-charcoal-800 transition-colors flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            Support Center
                            <SupportNotificationBadge />
                        </a>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 mb-8 bg-white border border-cream-200 rounded-xl p-1 shadow-sm w-fit">
                    {tabs.map((t) => {
                        const Icon = t.icon
                        const isActive = activeTab === t.id
                        return (
                            <a
                                key={t.id}
                                href={`/admin?tab=${t.id}`}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                    ? 'bg-charcoal-900 text-cream-50 shadow-sm'
                                    : 'text-charcoal-600 hover:bg-cream-50 hover:text-charcoal-900'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {t.label}
                            </a>
                        )
                    })}
                </div>

                {/* ==================== OVERVIEW TAB ==================== */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Analytics Overview */}
                        <div className="mb-4">
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-medium text-charcoal-900 flex items-center gap-2">
                                        <BarChart3 className="w-6 h-6 text-charcoal-500" />
                                        Revenue &amp; Performance
                                    </h2>
                                    {!('error' in analytics) && (
                                        <ExportCsvButton data={analytics.transactions} />
                                    )}
                                </div>

                                <DateRangeFilters />

                                {/* CSV Export Buttons */}
                                <div className="mt-4">
                                    <AdminExportButtons startDate={startDate} endDate={endDate} />
                                </div>
                            </div>

                            {!('error' in analytics) ? (
                                <AdminAnalytics stats={analytics} />
                            ) : (
                                <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                                    Failed to load analytics data.
                                </div>
                            )}
                        </div>

                        {/* Negative Balance Instructors (shown in overview) */}
                        {negativeBalanceInstructors && negativeBalanceInstructors.length > 0 && (
                            <div className="bg-white text-charcoal-900 border border-orange-200 rounded-xl p-6 shadow-sm">
                                <h2 className="text-xl font-medium text-orange-600 mb-4 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5" />
                                    Negative Balance Instructors
                                    <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                        {negativeBalanceInstructors.length} restricted
                                    </span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {negativeBalanceInstructors.map((instructor: any) => (
                                        <div key={instructor.id} className="border border-orange-100 rounded-lg p-4 bg-orange-50/30 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-charcoal-900">{instructor.full_name}</p>
                                                <p className="text-xs text-charcoal-600">{instructor.email}</p>
                                                <p className="text-sm text-red-600 font-bold mt-1">Balance: â‚±{(instructor.available_balance || 0).toLocaleString()}</p>
                                            </div>
                                            <VerifyButton id={instructor.id} action="settleInstructorDebt" label="Settle & Reinstate" className="px-4 py-2 bg-charcoal-900 text-cream-50 text-xs rounded-lg hover:bg-charcoal-800 transition-colors shadow-sm font-bold" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )} {/* end overview tab */}

                {/* ==================== VERIFICATIONS TAB ==================== */}
                {activeTab === 'verifications' && (
                    <div className="space-y-8">

                        {/* Instructor Verification */}
                        <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-charcoal-500" />
                                Instructor Verification
                                {certsWithUrls.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">{certsWithUrls.length} pending</span>}
                            </h2>
                            {certsWithUrls?.length === 0 ? (
                                <p className="text-charcoal-500 text-sm">No pending certifications.</p>
                            ) : (
                                <div className="space-y-4">
                                    {certsWithUrls?.map((cert: any) => (
                                        <div key={cert.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-medium text-charcoal-900">{cert.profiles?.full_name || 'Unknown User'}</p>
                                                    <p className="text-sm text-charcoal-600">{cert.certification_body} - {cert.certification_name}</p>
                                                    {cert.profiles?.contact_number && (<p className="text-xs text-charcoal-500 mt-0.5">Contact: {cert.profiles.contact_number}</p>)}
                                                </div>
                                                <div className="flex gap-2">
                                                    <VerifyButton id={cert.id} action="rejectCert" label="Reject" className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors" />
                                                    <VerifyButton id={cert.id} action="approveCert" label="Approve" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors" />
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-cream-100 flex flex-col gap-3">
                                                <div>
                                                    <p className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-2">Certification</p>
                                                    {cert.signedUrl ? (
                                                        <a href={cert.signedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800 font-medium">View Certification Proof</a>
                                                    ) : cert.proof_url ? (
                                                        <p className="text-xs text-charcoal-400 truncate">Proof path: {cert.proof_url} (No URL generated)</p>
                                                    ) : (
                                                        <p className="text-xs text-red-500">Missing Proof</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-2">Legal Documents</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center justify-between bg-white border border-cream-100 rounded-lg px-2 py-1.5">
                                                                <span className="text-[10px] text-charcoal-500">TIN:</span>
                                                                <span className="text-[10px] font-mono font-medium text-charcoal-900">{cert.profiles?.tin || 'â€”'}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between bg-white border border-cream-100 rounded-lg px-2 py-1.5">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] text-charcoal-500">Gov ID:</span>
                                                                    {cert.govIdSignedUrl ? (<a href={cert.govIdSignedUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline font-medium">View</a>) : <span className="text-[10px] text-red-400">Missing</span>}
                                                                </div>
                                                                <span className="text-[10px] text-charcoal-700 font-medium">{cert.profiles?.gov_id_expiry ? `Exp: ${new Date(cert.profiles.gov_id_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}` : 'No date'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center justify-between bg-white border border-cream-100 rounded-lg px-2 py-1.5 h-fit">
                                                            <span className="text-[10px] text-charcoal-500">BIR 2303:</span>
                                                            {cert.birSignedUrl ? (<a href={cert.birSignedUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline font-medium">View Form</a>) : <span className="text-[10px] text-charcoal-400 italic">Not provided</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Studio Verification */}
                        <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-charcoal-500" />
                                Studio Verification
                                {studiosWithUrls.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">{studiosWithUrls.length} pending</span>}
                            </h2>
                            {studiosWithUrls?.length === 0 ? (
                                <p className="text-charcoal-500 text-sm">No pending studio applications.</p>
                            ) : (
                                <div className="space-y-4">
                                    {studiosWithUrls?.map((studio: any) => (
                                        <div key={studio.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-medium text-charcoal-900">{studio.name}</p>
                                                    <p className="text-sm text-charcoal-600">{studio.location} â€¢ â‚±{studio.hourly_rate}/hr</p>
                                                    {studio.contact_number && (<p className="text-xs text-charcoal-500 mt-0.5">Contact: {studio.contact_number}</p>)}
                                                    <p className="text-xs text-charcoal-500 mt-1">Owner: {studio.profiles?.full_name}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <VerifyButton id={studio.id} action="rejectStudio" label="Reject" className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors" />
                                                    <VerifyButton id={studio.id} action="verifyStudio" label="Approve" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors" />
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-cream-100">
                                                <p className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-2">Legal Documents</p>
                                                <div className="space-y-1.5 flex flex-col items-start text-xs max-w-sm">
                                                    {studio.birSignedUrl ? (<div className="flex justify-between w-full border border-cream-100 rounded p-1.5 bg-white"><a href={studio.birSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">BIR Form 2303</a><span className="text-charcoal-500 font-medium">Exp: {studio.bir_certificate_expiry ? new Date(studio.bir_certificate_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span></div>) : (<p className="text-red-500">Missing BIR Form 2303</p>)}
                                                    {studio.govIdSignedUrl ? (<div className="flex justify-between w-full border border-cream-100 rounded p-1.5 bg-white"><a href={studio.govIdSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Valid Gov ID</a><span className="text-charcoal-500 font-medium">Exp: {studio.gov_id_expiry ? new Date(studio.gov_id_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span></div>) : (<p className="text-red-500">Missing Gov ID</p>)}
                                                    {studio.insuranceSignedUrl && (<div className="flex justify-between w-full border border-cream-100 rounded p-1.5 bg-white"><a href={studio.insuranceSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Insurance Policy</a><span className="text-charcoal-500 font-medium">Exp: {studio.insurance_expiry ? new Date(studio.insurance_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span></div>)}
                                                </div>
                                            </div>
                                            <details className="mt-3 group">
                                                <summary className="text-xs font-medium text-blue-600 cursor-pointer hover:text-blue-800 outline-none list-none flex items-center gap-1">
                                                    <span className="group-open:hidden">â–¼ Show Full Application</span>
                                                    <span className="hidden group-open:inline">â–² Hide Full Application</span>
                                                </summary>
                                                <div className="mt-3 text-sm text-charcoal-700 space-y-3 bg-white border border-cream-100 rounded-lg p-4">
                                                    <div><span className="font-medium text-charcoal-900 block mb-0.5">Detailed Address</span><p className="whitespace-pre-wrap">{studio.address}</p></div>
                                                    {studio.equipment && studio.equipment.length > 0 && (<div><span className="font-medium text-charcoal-900 block mb-0.5">Equipment Provided</span><div className="flex flex-wrap gap-1 mt-1">{studio.equipment.map((eq: string, i: number) => (<span key={i} className="px-2 py-0.5 bg-cream-100 text-charcoal-700 text-xs rounded-full">{studio.inventory?.[eq] || (eq === 'Reformer' ? studio.reformers_count : 1)}x {eq}</span>))}</div></div>)}
                                                    <div><span className="font-medium text-charcoal-900 block mb-2">Space Photos</span>{studio.space_photos_urls && studio.space_photos_urls.length > 0 ? (<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">{studio.space_photos_urls.map((photoUrl: string, idx: number) => (<a key={idx} href={photoUrl} target="_blank" rel="noopener noreferrer" className="block relative aspect-square hover:opacity-90 transition-opacity">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={photoUrl} alt={`Space Photo ${idx + 1}`} className="w-full h-full object-cover rounded shadow-sm border border-cream-200" /></a>))}</div>) : (<p className="text-xs text-charcoal-400 italic">No photos uploaded</p>)}</div>
                                                </div>
                                            </details>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Studio Payout Setup Approvals */}
                        <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-charcoal-500" />
                                Studio Payout Setup Approvals
                                {payoutStudiosWithUrls.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">{payoutStudiosWithUrls.length} pending</span>}
                            </h2>
                            {payoutStudiosWithUrls?.length === 0 ? (
                                <p className="text-charcoal-500 text-sm">No pending studio payout setups.</p>
                            ) : (
                                <div className="space-y-4">
                                    {payoutStudiosWithUrls?.map((studio: any) => (
                                        <div key={studio.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-medium text-charcoal-900">{studio.name}</p>
                                                    <p className="text-xs text-charcoal-500 mt-1">Owner: {studio.profiles?.full_name}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <VerifyButton id={studio.id} action="rejectStudioPayout" label="Reject" className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors" />
                                                    <VerifyButton id={studio.id} action="approveStudioPayout" label="Approve" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors" />
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-cream-100">
                                                <p className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-2">Legal Documents</p>
                                                <div className="space-y-1.5 flex flex-col items-start text-xs">
                                                    {studio.permitSignedUrl ? (<div className="flex justify-between w-full"><a href={studio.permitSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Mayor&apos;s Permit</a><span className="text-charcoal-500">Exp: {studio.mayors_permit_expiry ? new Date(studio.mayors_permit_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span></div>) : (<p className="text-red-500">Missing Permit</p>)}
                                                    {studio.certSignedUrl ? (<div className="flex justify-between w-full"><a href={studio.certSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Secretary&apos;s Cert</a><span className="text-charcoal-500">Exp: {studio.secretary_certificate_expiry ? new Date(studio.secretary_certificate_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span></div>) : (<p className="text-red-500">Missing Cert</p>)}
                                                    {studio.insuranceSignedUrl && (<div className="flex justify-between w-full"><a href={studio.insuranceSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">Insurance Policy</a><span className="text-charcoal-500">Exp: {studio.insurance_expiry ? new Date(studio.insurance_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span></div>)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Suspended Studios */}
                        <div className="bg-white text-charcoal-900 border border-red-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-medium text-red-600 mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Suspended Studios (3+ Strikes)
                            </h2>
                            {suspendedStudios.length === 0 ? (
                                <p className="text-charcoal-500 text-sm">No studios currently suspended.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {suspendedStudios.map((profile: any) => (
                                        <div key={profile.id} className="border border-red-100 rounded-lg p-4 bg-red-50/30 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-charcoal-900">{profile.studios?.[0]?.name || profile.full_name}</p>
                                                <p className="text-xs text-charcoal-600">{profile.email}</p>
                                                <p className="text-[10px] text-red-500 font-bold uppercase mt-1">Status: Auto-Suspended</p>
                                            </div>
                                            <VerifyButton id={profile.id} action="reinstateStudio" label="Reactivate" className="px-4 py-2 bg-charcoal-900 text-cream-50 text-xs rounded-lg hover:bg-charcoal-800 transition-colors shadow-sm font-bold" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                )} {/* end verifications tab */}

                {/* ==================== PAYOUTS & WALLET TAB ==================== */}
                {activeTab === 'payouts' && (
                    <div className="space-y-8">

                        {/* Booking Requests */}
                        <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-charcoal-500" />
                                Booking Requests
                                {pendingBookings && pendingBookings.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">{pendingBookings.length} pending</span>}
                            </h2>
                            {pendingBookings?.length === 0 ? (
                                <p className="text-charcoal-500 text-sm">No pending booking requests.</p>
                            ) : (
                                <div className="space-y-4">
                                    {pendingBookings?.map((booking: any) => {
                                        const studio = booking.slots?.studios;
                                        const combinedDateTime = new Date(`${booking.slots?.date}T${booking.slots?.start_time}+08:00`);
                                        const startTime = combinedDateTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
                                        const hasPaymentProof = !!booking.payment_proof_url;
                                        return (
                                            <div key={booking.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="font-medium text-charcoal-900">{booking.client?.full_name}</p>
                                                        <p className="text-sm text-charcoal-600">Requested: <span className="font-medium">{studio?.name}</span> ({studio?.location})</p>
                                                        {booking.instructor?.full_name && (<p className="text-sm text-charcoal-600 mt-0.5">Instructor: <span className="font-medium">{booking.instructor.full_name}</span></p>)}
                                                        {studio?.address && (<p className="text-xs text-charcoal-500 mt-1">{studio.address}</p>)}
                                                        <p className="text-xs text-charcoal-500 mt-1">{startTime}</p>
                                                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${booking.payment_status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                Payment: {booking.payment_status || 'Pending'}
                                                            </span>
                                                            {(booking.total_price ?? 0) === 0 && booking.payment_status === 'submitted' && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Wallet Payment (Fully Covered)</span>
                                                            )}
                                                            {hasPaymentProof && (
                                                                <div className="mt-1">
                                                                    <a href={getDisplayUrl(booking.payment_proof_url)} target="_blank" rel="noopener noreferrer" className="block relative hover:opacity-90 transition-opacity">
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={getDisplayUrl(booking.payment_proof_url)} alt="Payment Proof" className="h-16 w-auto object-cover rounded border border-gray-300" />
                                                                        <span className="text-[10px] text-blue-600 underline mt-1 block">View Full Size</span>
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-cream-100">
                                                    {booking.payment_status === 'submitted' ? (
                                                        <>
                                                            <RejectBookingButton id={booking.id} variant="no-refund" className="px-3 py-1 border border-red-200 text-red-600 text-xs rounded-md hover:bg-red-50 transition-colors" />
                                                            <RejectBookingButton id={booking.id} variant="refund" className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors" />
                                                        </>
                                                    ) : (
                                                        <RejectBookingButton id={booking.id} className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors" />
                                                    )}
                                                    <VerifyButton id={booking.id} action="confirmBooking" label="Confirm Booking" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors" />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Instructor Payout Requests */}
                        <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-charcoal-500" />
                                Instructor Payout Requests
                                {payoutRequests.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">{payoutRequests.length} pending</span>}
                            </h2>
                            {!payoutRequests || payoutRequests.length === 0 ? (
                                <p className="text-charcoal-500 text-sm">No pending payout requests.</p>
                            ) : (
                                <div className="space-y-4">
                                    {payoutRequests.map((request: any) => (
                                        <div key={request.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-medium text-charcoal-900">â‚±{request.amount.toLocaleString()} â€” {request.instructor_name || `Instructor ID: ${request.instructor_id}`}</p>
                                                    <div className="text-sm text-charcoal-600 mt-1">
                                                        <span className="capitalize font-medium">{request.payment_method === 'bank' || request.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'GCash'}</span>
                                                        <span className="mx-2 text-charcoal-300">|</span>
                                                        <span className="text-xs">{(request.bank_name || request.payment_details?.bankName || request.payment_details?.bank_name) ? `${request.bank_name || request.payment_details?.bankName || request.payment_details?.bank_name} â€” ` : ''}{request.account_number || request.payment_details?.accountNumber || request.payment_details?.account_number}</span>
                                                    </div>
                                                    <p className="text-xs text-charcoal-500 mt-0.5">Account Name: {request.account_name || request.payment_details?.accountName || request.payment_details?.account_name || 'â€”'}</p>
                                                    <p className="text-xs text-charcoal-400 mt-1">Requested: {new Date(request.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <VerifyButton id={request.id} action="rejectPayout" label="Reject" className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors" />
                                                    <VerifyButton id={request.id} action="approvePayout" label="Approve" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Studio Payout Requests */}
                        <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-charcoal-500" />
                                Studio Payout Requests
                                {studioPayouts.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">{studioPayouts.length} pending</span>}
                            </h2>
                            {studioPayouts.length === 0 ? (
                                <p className="text-charcoal-500 text-sm">No pending studio payout requests.</p>
                            ) : (
                                <div className="space-y-4">
                                    {studioPayouts.map((request: any) => (
                                        <div key={request.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="font-medium text-charcoal-900">â‚±{request.amount.toLocaleString()} â€” {request.studios?.name || 'Unknown Studio'}</p>
                                                    <p className="text-xs text-charcoal-500 mt-0.5">Owner: {request.studios?.profiles?.full_name || 'â€”'}</p>
                                                    <div className="text-sm text-charcoal-600 mt-1">
                                                        <span className="capitalize font-medium">{request.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'GCash'}</span>
                                                        <span className="mx-2 text-charcoal-300">|</span>
                                                        <span className="text-xs text-charcoal-600">{(request.bank_name || request.payment_details?.bankName || request.payment_details?.bank_name) ? `${request.bank_name || request.payment_details?.bankName || request.payment_details?.bank_name} â€” ` : ''}{request.account_number || request.payment_details?.accountNumber || request.payment_details?.account_number}</span>
                                                    </div>
                                                    <p className="text-xs text-charcoal-400 mt-1">Requested: {new Date(request.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <VerifyButton id={request.id} action="rejectPayout" label="Reject" className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors" />
                                                    <VerifyButton id={request.id} action="approvePayout" label="Approve" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Customer Payout Requests */}
                        <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-charcoal-500" />
                                Customer Payout Requests
                                {customerPayouts.length > 0 && <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">{customerPayouts.length} pending</span>}
                            </h2>
                            {customerPayouts.length === 0 ? (
                                <p className="text-charcoal-500 text-sm">No pending customer payout requests.</p>
                            ) : (
                                <div className="space-y-4">
                                    {customerPayouts.map((request: any) => (
                                        <div key={request.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-medium text-charcoal-900">â‚±{request.amount.toLocaleString()} â€” {request.profile?.full_name || `User ID: ${request.user_id}`}</p>
                                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-medium">Customer</span>
                                                    </div>
                                                    <div className="text-sm text-charcoal-600 mt-1">
                                                        <span className="capitalize font-medium">{request.payment_method === 'bank' || request.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'GCash'}</span>
                                                        <span className="mx-2 text-charcoal-300">|</span>
                                                        <span className="text-xs">{request.bank_name ? `${request.bank_name} â€” ` : ''}{request.account_number || 'â€”'}</span>
                                                    </div>
                                                    <p className="text-xs text-charcoal-500 mt-0.5">Account Name: {request.account_name || 'â€”'}</p>
                                                    <p className="text-xs text-charcoal-400 mt-1">Requested: {new Date(request.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <VerifyButton id={request.id} action="rejectPayout" label="Reject" className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors" />
                                                    <VerifyButton id={request.id} action="approvePayout" label="Approve" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Wallet Top-Up Queue */}
                        <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-charcoal-500" />
                                Pending Wallet Top-Ups
                                {pendingTopUps && pendingTopUps.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">{pendingTopUps.length} pending</span>}
                            </h2>
                            {!pendingTopUps || pendingTopUps.length === 0 ? (
                                <p className="text-charcoal-500 text-sm">No pending top-up requests.</p>
                            ) : (
                                <div className="space-y-4">
                                    {pendingTopUps.map((topUp: any) => (
                                        <div key={topUp.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="font-bold text-lg text-charcoal-900">â‚±{topUp.amount.toLocaleString()} â€” {topUp.profiles?.full_name}</p>
                                                    <p className="text-sm text-charcoal-600">{topUp.profiles?.email} ({topUp.profiles?.role})</p>
                                                    <p className="text-xs text-charcoal-400 mt-1">Requested: {new Date(topUp.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <VerifyButton id={topUp.id} action="rejectTopUp" label="Reject" className="px-4 py-2 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors" />
                                                    <VerifyButton id={topUp.id} action="approveTopUp" label="Approve & Credit" className="px-4 py-2 bg-charcoal-900 text-cream-50 text-xs font-bold rounded-lg hover:bg-charcoal-800 transition-colors" />
                                                </div>
                                            </div>
                                            {topUp.payment_proof_url && (
                                                <div className="mt-4">
                                                    <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest mb-2">Payment Receipt</p>
                                                    <div className="flex items-start gap-4">
                                                        <a href={getDisplayUrl(topUp.payment_proof_url)} target="_blank" rel="noopener noreferrer" className="inline-block group relative">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={getDisplayUrl(topUp.payment_proof_url)} alt="Payment Receipt" className="h-48 w-auto object-cover rounded-xl border border-cream-200 shadow-sm group-hover:shadow-md transition-all" />
                                                            <div className="absolute inset-0 bg-charcoal-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl text-white text-[10px] font-bold">View Full Size</div>
                                                        </a>
                                                        <div className="bg-cream-50 p-3 rounded-lg border border-cream-100 max-w-xs">
                                                            <p className="text-xs text-charcoal-600 leading-relaxed font-medium">Verify the amount <span className="text-charcoal-900 font-bold">â‚±{topUp.amount.toLocaleString()}</span> and Name/Reference on this receipt before approving.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Manual Balance Adjustment */}
                        <div className="bg-charcoal-900 text-white border border-charcoal-800 rounded-xl p-6 shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-rose-gold/20 rounded-lg">
                                    <ShieldAlert className="w-6 h-6 text-rose-gold" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-medium">Manual Balance Adjustment</h2>
                                    <p className="text-white/50 text-xs">Directly credit or debit a user&apos;s wallet balance.</p>
                                </div>
                            </div>
                            <BalanceAdjustmentTool />
                        </div>

                    </div>
                )} {/* end payouts tab */}

                {/* ==================== CUSTOMERS TAB ==================== */}
                {activeTab === 'customers' && (
                    <div className="space-y-8">
                        <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-medium text-charcoal-900 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-charcoal-500" />
                                    All Users
                                    <span className="ml-2 text-xs text-charcoal-400 font-normal">({allUsers?.length ?? 0} total)</span>
                                </h2>
                            </div>

                            {!allUsers || allUsers.length === 0 ? (
                                <p className="text-charcoal-500 text-sm">No users found.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-cream-200 text-xs text-charcoal-500 uppercase tracking-wider">
                                                <th className="py-3 px-4 font-medium">Name</th>
                                                <th className="py-3 px-4 font-medium">Email</th>
                                                <th className="py-3 px-4 font-medium">Phone</th>
                                                <th className="py-3 px-4 font-medium">Role</th>
                                                <th className="py-3 px-4 font-medium">Wallet</th>
                                                <th className="py-3 px-4 font-medium">Waiver</th>
                                                <th className="py-3 px-4 font-medium">Status</th>
                                                <th className="py-3 px-4 font-medium whitespace-nowrap">Joined</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {allUsers.map((u: any) => {
                                                const roleColors: Record<string, string> = {
                                                    client: 'bg-blue-100 text-blue-700',
                                                    instructor: 'bg-purple-100 text-purple-700',
                                                    studio_owner: 'bg-amber-100 text-amber-700',
                                                    admin: 'bg-charcoal-900 text-white',
                                                }
                                                const badgeClass = roleColors[u.role] || 'bg-gray-100 text-gray-700'
                                                const balance = Number(u.available_balance || 0)
                                                return (
                                                    <tr key={u.id} className="border-b border-cream-100 hover:bg-cream-50/50 transition-colors">
                                                        <td className="py-3 px-4 font-medium text-charcoal-900 whitespace-nowrap">
                                                            {u.full_name || '—'}
                                                        </td>
                                                        <td className="py-3 px-4 text-charcoal-600 text-xs">{u.email}</td>
                                                        <td className="py-3 px-4 text-charcoal-600 text-xs">{u.contact_number || '—'}</td>
                                                        <td className="py-3 px-4">
                                                            <span className={`inline-block text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap capitalize ${badgeClass}`}>
                                                                {u.role?.replace(/_/g, ' ') || 'Unknown'}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-charcoal-700 text-xs font-mono">
                                                            <span className={balance < 0 ? 'text-red-600 font-bold' : ''}>
                                                                ₱{balance.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-xs font-medium">
                                                            {u.waiver_url ? (
                                                                <div className="space-y-1">
                                                                    <a href={getDisplayUrl(u.waiver_url)} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 block">
                                                                        View Waiver
                                                                    </a>
                                                                    {u.waiver_signed_at && (
                                                                        <span className="text-[10px] text-charcoal-400 block">
                                                                            Signed: {new Date(u.waiver_signed_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-charcoal-400 italic">None</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            {u.is_suspended ? (
                                                                <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">Suspended</span>
                                                            ) : (
                                                                <span className="inline-block text-[10px] font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-4 text-charcoal-500 text-xs whitespace-nowrap">
                                                            {new Date(u.created_at).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )} {/* end customers tab */}

                {/* ==================== REPORTS TAB ==================== */}
                {activeTab === 'reports' && (
                    <ReportsTab logs={(activityLogs ?? []) as any} />
                )} {/* end reports tab */}

            </div>
        </div>
    )
}
