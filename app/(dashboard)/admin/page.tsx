import { createClient, createAdminClient } from '@/lib/supabase/server'
import { CheckCircle, Clock, Building2, MessageCircle, BarChart3, Wallet, ShieldAlert, AlertTriangle } from 'lucide-react'
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
    try {
        const { range, tab } = await searchParams
        const activeTab = (tab as string) || 'overview'
        const supabase = await createClient()

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

        const adminDb = createAdminClient()
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
        const pendingCerts = pendingCertsResult.data ?? []
        const pendingStudios = pendingStudiosResult.data ?? []
        const pendingStudioPayouts = pendingStudioPayoutsResult.data ?? []
        const pendingBookings = pendingBookingsResult.data ?? []

        const payoutRequests = (payoutRequestsResult.data ?? []).map((p: any) => ({
            ...p,
            instructor_name: (Array.isArray(p.instructor) ? p.instructor[0] : p.instructor)?.full_name ?? null,
        }))

        const studioPayouts = studioPayoutsResult.data ?? []

        const customerPayouts = (rawUserPayoutsResult.data ?? []).filter((p: any) => {
            const profile = Array.isArray(p.profile) ? p.profile[0] : p.profile
            return profile?.role === 'customer'
        })

        const pendingTopUps = pendingTopUpsResult.data ?? []
        const suspendedStudios = suspendedStudiosResult.data ?? []
        const analytics = analyticsResult
        const negativeBalanceInstructors = negativeBalanceResult.data ?? []
        const activityLogs = activityLogsResult.data ?? []
        const allUsers = allUsersResult.data ?? []

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

                    {/* --- Content Tabs --- */}
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-medium text-charcoal-900 flex items-center gap-2">
                                        <BarChart3 className="w-6 h-6 text-charcoal-500" />
                                        Revenue & Performance
                                    </h2>
                                    {!('error' in analytics) && <ExportCsvButton data={analytics.transactions} />}
                                </div>
                                <DateRangeFilters />
                                <div className="mt-4">
                                    <AdminExportButtons startDate={startDate} endDate={endDate} />
                                </div>
                                {!('error' in analytics) ? (
                                    <AdminAnalytics stats={analytics} />
                                ) : (
                                    <div className="bg-red-50 text-red-700 p-4 rounded-lg">Failed to load analytics.</div>
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
                                                    <p className="text-xs text-charcoal-600 font-bold text-red-600 mt-1">₱{(instructor.available_balance || 0).toLocaleString()}</p>
                                                </div>
                                                <VerifyButton id={instructor.id} action="settleInstructorDebt" label="Settle" className="px-4 py-2 bg-charcoal-900 text-cream-50 text-xs rounded-lg font-bold" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'verifications' && (
                        <div className="space-y-8">
                            <div className="bg-white border border-cream-200 rounded-xl p-6 shadow-sm">
                                <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-charcoal-500" />
                                    Instructor Verifications
                                    {certsWithUrls.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{certsWithUrls.length}</span>}
                                </h2>
                                {certsWithUrls.length === 0 ? <p className="text-charcoal-500 text-sm">None pending.</p> : (
                                    <div className="space-y-4">
                                        {certsWithUrls.map((cert: any) => (
                                            <div key={cert.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50 flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{cert.profiles?.full_name}</p>
                                                    <p className="text-sm text-charcoal-600">{cert.certification_name}</p>
                                                    <div className="mt-2 flex gap-4">
                                                        {cert.signedUrl && <a href={cert.signedUrl} target="_blank" className="text-xs text-blue-600 underline">Cert Proof</a>}
                                                        {cert.govIdSignedUrl && <a href={cert.govIdSignedUrl} target="_blank" className="text-xs text-blue-600 underline">Gov ID</a>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <VerifyButton id={cert.id} action="rejectCert" label="Reject" className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md" />
                                                    <VerifyButton id={cert.id} action="approveCert" label="Approve" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-white border border-cream-200 rounded-xl p-6 shadow-sm">
                                <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-charcoal-500" />
                                    Studio Verifications
                                    {studiosWithUrls.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{studiosWithUrls.length}</span>}
                                </h2>
                                {studiosWithUrls.length === 0 ? <p className="text-charcoal-500 text-sm">None pending.</p> : (
                                    <div className="space-y-4">
                                        {studiosWithUrls.map((s: any) => (
                                            <div key={s.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50 flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{s.name}</p>
                                                    <p className="text-sm text-charcoal-600">{s.profiles?.full_name}</p>
                                                    <div className="mt-2 flex gap-4">
                                                        {s.birSignedUrl && <a href={s.birSignedUrl} target="_blank" className="text-xs text-blue-600 underline">BIR</a>}
                                                        {s.govIdSignedUrl && <a href={s.govIdSignedUrl} target="_blank" className="text-xs text-blue-600 underline">Gov ID</a>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <VerifyButton id={s.id} action="rejectStudio" label="Reject" className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md" />
                                                    <VerifyButton id={s.id} action="verifyStudio" label="Approve" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {suspendedStudios.length > 0 && (
                                <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
                                    <h2 className="text-xl font-medium text-red-600 mb-4 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" />
                                        Suspended Studios
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {suspendedStudios.map((p: any) => (
                                            <div key={p.id} className="border border-red-100 rounded-lg p-4 bg-red-50/30 flex justify-between items-center">
                                                <p className="font-bold">{p.studios?.[0]?.name || p.full_name}</p>
                                                <VerifyButton id={p.id} action="reinstateStudio" label="Reactivate" className="px-4 py-2 bg-charcoal-900 text-cream-50 text-xs rounded-lg font-bold" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'payouts' && (
                        <div className="space-y-8">
                            <div className="bg-white border border-cream-200 rounded-xl p-6 shadow-sm">
                                <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-charcoal-500" />
                                    Booking Requests
                                    {pendingBookings.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{pendingBookings.length}</span>}
                                </h2>
                                {pendingBookings.length === 0 ? <p className="text-charcoal-500 text-sm">None pending.</p> : (
                                    <div className="space-y-4">
                                        {pendingBookings.map((b: any) => (
                                            <div key={b.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50 flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{b.client?.full_name} → {b.slots?.studios?.name}</p>
                                                    <p className="text-xs text-charcoal-500">{new Date(b.slots?.date).toLocaleDateString()} at {b.slots?.start_time}</p>
                                                    {b.payment_proof_url && <a href={getDisplayUrl(b.payment_proof_url)} target="_blank" className="text-[10px] text-blue-600 underline mt-1 block">View Payment</a>}
                                                </div>
                                                <div className="flex gap-2">
                                                    <RejectBookingButton id={b.id} className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md" />
                                                    <VerifyButton id={b.id} action="confirmBooking" label="Confirm" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-white border border-cream-200 rounded-xl p-6 shadow-sm">
                                <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-charcoal-500" />
                                    Instructor Payouts
                                    {payoutRequests.length > 0 && <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">{payoutRequests.length}</span>}
                                </h2>
                                {payoutRequests.length === 0 ? <p className="text-charcoal-500 text-sm">None pending.</p> : (
                                    <div className="space-y-4">
                                        {payoutRequests.map((r: any) => (
                                            <div key={r.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50 flex justify-between items-center">
                                                <div>
                                                    <p className="font-bold">₱{r.amount.toLocaleString()}</p>
                                                    <p className="text-xs text-charcoal-600">{r.instructor_name}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <VerifyButton id={r.id} action="rejectPayout" label="Reject" className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md" />
                                                    <VerifyButton id={r.id} action="approvePayout" label="Approve" className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-charcoal-900 text-white rounded-xl p-6 shadow-xl">
                                <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-rose-gold" />
                                    Manual Adjustment
                                </h2>
                                <BalanceAdjustmentTool />
                            </div>
                        </div>
                    )}

                    {activeTab === 'customers' && (
                        <div className="bg-white border border-cream-200 rounded-xl p-6 shadow-sm overflow-x-auto">
                            <h2 className="text-xl font-medium mb-6">All Users ({allUsers.length})</h2>
                            <table className="w-full text-left">
                                <thead className="text-xs uppercase text-charcoal-400 border-b border-cream-100">
                                    <tr>
                                        <th className="py-3 px-4">User</th>
                                        <th className="py-3 px-4">Role</th>
                                        <th className="py-3 px-4">Balance</th>
                                        <th className="py-3 px-4">Waiver</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {allUsers.map((u: any) => (
                                        <tr key={u.id} className="border-b border-cream-50 hover:bg-cream-50/30">
                                            <td className="py-3 px-4">
                                                <p className="font-medium">{u.full_name}</p>
                                                <p className="text-[10px] text-charcoal-400">{u.email}</p>
                                            </td>
                                            <td className="py-3 px-4 capitalize text-[10px] font-bold">{u.role}</td>
                                            <td className="py-3 px-4 font-mono text-xs">₱{(u.available_balance || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4">
                                                {u.waiver_url ? <a href={getDisplayUrl(u.waiver_url)} target="_blank" className="text-blue-600 underline text-[10px]">View</a> : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'reports' && <ReportsTab logs={activityLogs as any} />}
                </div>
            </div>
        )
    } catch (err: any) {
        console.error('GLOBAL DASHBOARD CRASH:', err)
        return (
            <div className="min-h-screen p-8 bg-cream-50">
                <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-2xl border border-red-100">
                    <div className="flex items-center gap-3 text-red-600 mb-6">
                        <ShieldAlert className="w-10 h-10" />
                        <h1 className="text-3xl font-serif font-bold tracking-tight">Admin System Failure</h1>
                    </div>
                    <div className="bg-gray-950 p-6 rounded-xl font-mono text-sm border border-gray-800 shadow-inner">
                        <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Diagnostic Report</p>
                        <p className="text-red-400 font-bold text-lg mb-4">{err.name || 'Critical Exception'}</p>
                        <div className="space-y-4">
                            <div>
                                <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Message</p>
                                <p className="text-green-400 whitespace-pre-wrap">{err.message}</p>
                            </div>
                            {err.stack && (
                                <div>
                                    <p className="text-gray-500 uppercase tracking-widest text-[10px] font-bold mb-1">Stack Trace</p>
                                    <pre className="text-gray-400 text-[11px] leading-relaxed overflow-x-auto scrollbar-hide">{err.stack}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="mt-8 p-4 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-red-800 text-sm font-medium">Please screenshot this page and notify the engineering team immediately.</p>
                    </div>
                </div>
            </div>
        )
    }
}
