import { createClient } from '@/lib/supabase/server'
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

// Since this is a server component, we fetch data directly
export default async function AdminDashboard({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { range } = await searchParams
    const supabase = await createClient()

    // --- DATE FILTER LOGIC ---
    let startDate: string | undefined
    let endDate: string | undefined = new Date().toISOString()
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

    // 1. Fetch Verification Queue (Pending Certifications)
    const { data: pendingCerts } = await supabase
        .from('certifications')
        .select('*, profiles(full_name, contact_number, tin, gov_id_url, gov_id_expiry, bir_url)')
        .eq('verified', false)
        .order('created_at', { ascending: false })

    // DEBUG: Fetch current user info
    const { data: { user } } = await supabase.auth.getUser()
    let userRole = 'unknown'
    let userId = user?.id
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        userRole = profile?.role || 'no-profile'
    }

    // DEBUG: Check for query errors and raw counts
    // DEBUG: Check for query errors and raw counts
    const { count: totalBookingsCount, error: totalBookingsError } = await supabase.from('bookings').select('*', { count: 'exact', head: true })
    const { data: debugBookings, error: debugBookingsError } = await supabase.from('bookings').select('id, status, payment_proof_url').limit(5)

    // DEBUG: Support Messages
    const { data: debugSupportData, error: debugSupportError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('is_read', false)

    console.log('--- DEBUG SUPPORT MESSAGES ---');
    if (debugSupportError) {
        console.error('Error fetching support messages:', debugSupportError);
    } else {
        console.log('Total Unread Messages (Raw):', debugSupportData?.length || 0);
        console.log('Sample Unread Message:', debugSupportData?.[0] ? JSON.stringify(debugSupportData[0]) : 'None');
        console.log('Current User ID:', user?.id);

        const myUnread = debugSupportData?.filter((m: any) => m.sender_id !== user?.id);
        console.log('Unread Messages NOT from me (Count):', myUnread?.length || 0);
    }
    console.log('------------------------------');


    // 1b. Generate signed URLs for proofs
    const certsWithUrls = await Promise.all(pendingCerts?.map(async (cert: any) => {
        let signedUrl = null
        if (cert.proof_url) {
            const { data } = await supabase.storage
                .from('certifications')
                .createSignedUrl(cert.proof_url, 3600) // 1 hour access
            signedUrl = data?.signedUrl
        }

        let govIdSignedUrl = null
        if (cert.profiles?.gov_id_url) {
            const { data } = await supabase.storage
                .from('certifications')
                .createSignedUrl(cert.profiles.gov_id_url, 3600)
            govIdSignedUrl = data?.signedUrl
        }

        let birSignedUrl = null
        if (cert.profiles?.bir_url) {
            const { data } = await supabase.storage
                .from('certifications')
                .createSignedUrl(cert.profiles.bir_url, 3600)
            birSignedUrl = data?.signedUrl
        }

        return { ...cert, signedUrl, govIdSignedUrl, birSignedUrl }
    }) || [])

    // 2. Fetch Pending Studios
    const { data: pendingStudios } = await supabase
        .from('studios')
        .select(`
            *,
            profiles(full_name)
        `)
        .eq('verified', false)
        .order('created_at', { ascending: false })

    // 2b. Generate signed URLs for private studio docs
    const studiosWithUrls = await Promise.all(pendingStudios?.map(async (studio: any) => {
        let birSignedUrl = null
        if (studio.bir_certificate_url) {
            const { data } = await supabase.storage
                .from('certifications')
                .createSignedUrl(studio.bir_certificate_url, 3600)
            birSignedUrl = data?.signedUrl
        }
        let govIdSignedUrl = null
        if (studio.gov_id_url) {
            const { data } = await supabase.storage
                .from('certifications')
                .createSignedUrl(studio.gov_id_url, 3600)
            govIdSignedUrl = data?.signedUrl
        }
        let insuranceSignedUrl = null
        if (studio.insurance_url) {
            const { data } = await supabase.storage
                .from('certifications')
                .createSignedUrl(studio.insurance_url, 3600)
            insuranceSignedUrl = data?.signedUrl
        }
        return { ...studio, birSignedUrl, govIdSignedUrl, insuranceSignedUrl }
    }) || [])

    // 2.5 Fetch Pending Studio Payout Approvals
    const { data: pendingStudioPayouts } = await supabase
        .from('studios')
        .select(`
            id, name, mayors_permit_url, secretary_certificate_url, mayors_permit_expiry, secretary_certificate_expiry,
            bir_certificate_url, bir_certificate_expiry,
            insurance_url, insurance_expiry,
            created_at,
            profiles(full_name)
        `)
        .eq('payout_approval_status', 'pending')
        .order('created_at', { ascending: false })

    const payoutStudiosWithUrls = await Promise.all(pendingStudioPayouts?.map(async (studio: any) => {
        let permitSignedUrl = null
        if (studio.mayors_permit_url) {
            const { data } = await supabase.storage
                .from('certifications')
                .createSignedUrl(studio.mayors_permit_url, 3600)
            permitSignedUrl = data?.signedUrl
        }
        let certSignedUrl = null
        if (studio.secretary_certificate_url) {
            const { data } = await supabase.storage
                .from('certifications')
                .createSignedUrl(studio.secretary_certificate_url, 3600)
            certSignedUrl = data?.signedUrl
        }
        let insuranceSignedUrl = null
        if (studio.insurance_url) {
            const { data } = await supabase.storage
                .from('certifications')
                .createSignedUrl(studio.insurance_url, 3600)
            insuranceSignedUrl = data?.signedUrl
        }
        return { ...studio, permitSignedUrl, certSignedUrl, insuranceSignedUrl }
    }) || [])

    // 3. Fetch Booking Requests (Pending Bookings)
    const { data: pendingBookings, error: pendingBookingsError } = await supabase
        .from('bookings')
        .select(`
      *,
      client:profiles!client_id(full_name),
      slots(
        start_time,
        end_time,
        studios(name, location, address)
      )
    `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    // 4. Fetch Pending Instructor Payouts
    const { data: rawPayoutRequests, error: payoutError } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('status', 'pending')
        .not('instructor_id', 'is', null)
        .order('created_at', { ascending: false })

    // 4b. Enrich with instructor names from profiles
    let payoutRequests: any[] = []
    if (rawPayoutRequests && rawPayoutRequests.length > 0) {
        const instructorIds = rawPayoutRequests.map((p: any) => p.instructor_id)
        const { data: instructorProfiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', instructorIds)

        const profileMap: Record<string, string> = {}
        instructorProfiles?.forEach((p: any) => { profileMap[p.id] = p.full_name })

        payoutRequests = rawPayoutRequests.map((p: any) => ({
            ...p,
            instructor_name: profileMap[p.instructor_id] || null
        }))
    }

    // 5. Fetch Pending Studio Payouts
    const { data: rawStudioPayouts } = await supabase
        .from('payout_requests')
        .select('*, studios(name, profiles(full_name))')
        .eq('status', 'pending')
        .not('studio_id', 'is', null)
        .order('created_at', { ascending: false })

    const studioPayouts = rawStudioPayouts ?? []

    // 7. Fetch Customer Payout Requests
    // Step 1: Get all pending payout_requests that have a user_id (customer payouts use user_id instead of instructor_id/studio_id)
    const { data: rawUserPayouts } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('status', 'pending')
        .not('user_id', 'is', null)
        .is('instructor_id', null)
        .is('studio_id', null)
        .order('created_at', { ascending: false })

    // Step 2: For those user_ids, fetch profiles to get name + role
    let customerPayouts: any[] = []
    if (rawUserPayouts && rawUserPayouts.length > 0) {
        const userIds = rawUserPayouts.map((p: any) => p.user_id)
        const { data: userProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, role')
            .in('id', userIds)

        const profileMap: Record<string, any> = {}
        userProfiles?.forEach((p: any) => { profileMap[p.id] = p })

        // Merge and filter to only include customers
        customerPayouts = rawUserPayouts
            .map((p: any) => ({ ...p, profile: profileMap[p.user_id] || null }))
            .filter((p: any) => p.profile?.role === 'customer')
    }

    // 8. Fetch Pending Wallet Top-Ups (Specifically top_up type)
    const { data: pendingTopUps } = await supabase
        .from('wallet_top_ups')
        .select(`
            *,
            profiles:user_id(full_name, email, role)
        `)
        .eq('status', 'pending')
        .eq('type', 'top_up')
        .not('payment_proof_url', 'is', null)
        .order('created_at', { ascending: false })

    // 9. Fetch Suspended Studios
    const { data: suspendedStudiosData } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_suspended, studios(id, name)')
        .eq('is_suspended', true)

    const suspendedStudios = suspendedStudiosData ?? []

    // 6. Fetch Analytics
    const analytics = await getAdminAnalytics(startDate, endDate)

    // 10. Fetch Negative Balance Instructors
    const { data: negativeBalanceInstructors } = await supabase
        .from('profiles')
        .select('id, full_name, email, available_balance')
        .eq('role', 'instructor')
        .lt('available_balance', 0)
        .order('available_balance', { ascending: true })

    return (
        <div className="min-h-screen bg-cream-50 p-4 sm:p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-serif text-charcoal-900 mb-2">Admin Dashboard</h1>
                        <p className="text-charcoal-600">Overview of verification requests and system status.</p>
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

                {/* DEBUG SECTION - REMOVE AFTER FIXING */}
                <div className="bg-gray-900 text-white border border-gray-700 p-4 rounded-lg mb-8 text-xs font-mono break-all">
                    <p className="text-yellow-400 font-bold mb-2">Debug Info:</p>
                    <p>User ID: {userId}</p>
                    <p>User Role (Profile): {userRole}</p>
                    <p>Pending Bookings Count (Filtered): {pendingBookings?.length ?? 'null'}</p>
                    <p>Total Bookings in DB (Raw): {totalBookingsCount ?? 'null'}</p>
                    <p>Pending Payouts Count: {payoutRequests?.length ?? 'null'}</p>
                    <p>Payout Query Error: {payoutError?.message || 'None'}</p>
                    <p>Query Error (if any): {totalBookingsError?.message || debugBookingsError?.message || pendingBookingsError?.message || 'None'}</p>
                    <p>Sample Bookings Statuses: {JSON.stringify(debugBookings)}</p>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-blue-400 font-bold mb-1">Support Debug:</p>
                        <p>Support Query Error: {debugSupportError ? debugSupportError.message : 'None'}</p>
                        <p>Total Unread Messages (Raw): {debugSupportData?.length ?? 0}</p>
                        <p>Unread Messages NOT from me: {debugSupportData?.filter((m: any) => m.sender_id !== user?.id)?.length ?? 0}</p>
                        <p>Sample Support Message: {debugSupportData?.[0] ? JSON.stringify(debugSupportData[0]) : 'None'}</p>
                    </div>
                </div>
                {/* END DEBUG SECTION */}

                {/* Analytics Overview */}
                <div className="mb-12">
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-medium text-charcoal-900 flex items-center gap-2">
                                <BarChart3 className="w-6 h-6 text-charcoal-500" />
                                Revenue & Performance
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

                {/* Negative Balance Instructors */}
                <div className="bg-white text-charcoal-900 border border-orange-200 rounded-xl p-6 shadow-sm col-span-1 lg:col-span-2">
                    <h2 className="text-xl font-medium text-orange-600 mb-4 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" />
                        Negative Balance Instructors
                        {negativeBalanceInstructors && negativeBalanceInstructors.length > 0 && (
                            <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                {negativeBalanceInstructors.length} restricted
                            </span>
                        )}
                    </h2>

                    {!negativeBalanceInstructors || negativeBalanceInstructors.length === 0 ? (
                        <p className="text-charcoal-500 text-sm">No instructors currently have a negative balance.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {negativeBalanceInstructors.map((instructor: any) => (
                                <div key={instructor.id} className="border border-orange-100 rounded-lg p-4 bg-orange-50/30 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-charcoal-900">{instructor.full_name}</p>
                                        <p className="text-xs text-charcoal-600">{instructor.email}</p>
                                        <p className="text-sm text-red-600 font-bold mt-1">
                                            Balance: ₱{(instructor.available_balance || 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <VerifyButton
                                        id={instructor.id}
                                        action="settleInstructorDebt"
                                        label="Settle & Reinstate"
                                        className="px-4 py-2 bg-charcoal-900 text-cream-50 text-xs rounded-lg hover:bg-charcoal-800 transition-colors shadow-sm font-bold"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Instructor Payout Requests */}
                <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm col-span-1 lg:col-span-2">
                    <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-charcoal-500" />
                        Instructor Payout Requests
                    </h2>

                    {!payoutRequests || payoutRequests.length === 0 ? (
                        <p className="text-charcoal-500 text-sm">No pending payout requests.</p>
                    ) : (
                        <div className="space-y-4">
                            {payoutRequests.map((request: any) => (
                                <div key={request.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-medium text-charcoal-900">
                                                ₱{request.amount.toLocaleString()} — {request.instructor_name || `Instructor ID: ${request.instructor_id}`}
                                            </p>
                                            <div className="text-sm text-charcoal-600 mt-1">
                                                <span className="capitalize font-medium">{request.payment_method === 'bank' || request.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'GCash'}</span>
                                                <span className="mx-2 text-charcoal-300">|</span>
                                                <span className="text-xs">
                                                    {(request.bank_name || request.payment_details?.bankName || request.payment_details?.bank_name) ? (
                                                        `${request.bank_name || request.payment_details?.bankName || request.payment_details?.bank_name} — `
                                                    ) : ''}
                                                    {request.account_number || request.payment_details?.accountNumber || request.payment_details?.account_number}
                                                </span>
                                            </div>
                                            <p className="text-xs text-charcoal-500 mt-0.5">
                                                Account Name: {request.account_name || request.payment_details?.accountName || request.payment_details?.account_name || '—'}
                                            </p>
                                            <p className="text-xs text-charcoal-400 mt-1">
                                                Requested: {new Date(request.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <VerifyButton
                                                id={request.id}
                                                action="rejectPayout"
                                                label="Reject"
                                                className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors"
                                            />
                                            <VerifyButton
                                                id={request.id}
                                                action="approvePayout"
                                                label="Approve"
                                                className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                {/* Verification Queue (Instructors) */}
                <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-charcoal-500" />
                        Instructor Verification
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
                                            {cert.profiles?.contact_number && (
                                                <p className="text-xs text-charcoal-500 mt-0.5">Contact: {cert.profiles.contact_number}</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <VerifyButton
                                                id={cert.id}
                                                action="rejectCert"
                                                label="Reject"
                                                className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors"
                                            />
                                            <VerifyButton
                                                id={cert.id}
                                                action="approveCert"
                                                label="Approve"
                                                className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-cream-100 flex flex-col gap-3">
                                        <div>
                                            <p className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-2">Certification</p>
                                            {cert.signedUrl ? (
                                                <a
                                                    href={cert.signedUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 underline hover:text-blue-800 font-medium"
                                                >
                                                    View Certification Proof
                                                </a>
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
                                                        <span className="text-[10px] font-mono font-medium text-charcoal-900">{cert.profiles?.tin || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-white border border-cream-100 rounded-lg px-2 py-1.5">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-charcoal-500">Gov ID:</span>
                                                            {cert.govIdSignedUrl ? (
                                                                <a href={cert.govIdSignedUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline font-medium">View</a>
                                                            ) : <span className="text-[10px] text-red-400">Missing</span>}
                                                        </div>
                                                        <span className="text-[10px] text-charcoal-700 font-medium">
                                                            {cert.profiles?.gov_id_expiry ? `Exp: ${new Date(cert.profiles.gov_id_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })}` : 'No date'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between bg-white border border-cream-100 rounded-lg px-2 py-1.5 h-fit">
                                                    <span className="text-[10px] text-charcoal-500">BIR 2303:</span>
                                                    {cert.birSignedUrl ? (
                                                        <a href={cert.birSignedUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 underline font-medium">View Form</a>
                                                    ) : <span className="text-[10px] text-charcoal-400 italic">Not provided</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Studio Verification Queue */}
                <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-charcoal-500" />
                        Studio Verification
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
                                            <p className="text-sm text-charcoal-600">{studio.location} • ₱{studio.hourly_rate}/hr</p>
                                            {studio.contact_number && (
                                                <p className="text-xs text-charcoal-500 mt-0.5">Contact: {studio.contact_number}</p>
                                            )}
                                            <p className="text-xs text-charcoal-500 mt-1">Owner: {studio.profiles?.full_name}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <VerifyButton
                                                id={studio.id}
                                                action="rejectStudio"
                                                label="Reject"
                                                className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors"
                                            />
                                            <VerifyButton
                                                id={studio.id}
                                                action="verifyStudio"
                                                label="Approve"
                                                className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Document Links Always Visible */}
                                    <div className="mt-4 pt-3 border-t border-cream-100">
                                        <p className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-2">Legal Documents</p>
                                        <div className="space-y-1.5 flex flex-col items-start text-xs max-w-sm">
                                            {studio.birSignedUrl ? (
                                                <div className="flex justify-between w-full border border-cream-100 rounded p-1.5 bg-white">
                                                    <a href={studio.birSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                                                        BIR Form 2303
                                                    </a>
                                                    <span className="text-charcoal-500 font-medium">Exp: {studio.bir_certificate_expiry ? new Date(studio.bir_certificate_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span>
                                                </div>
                                            ) : (
                                                <p className="text-red-500">Missing BIR Form 2303</p>
                                            )}

                                            {studio.govIdSignedUrl ? (
                                                <div className="flex justify-between w-full border border-cream-100 rounded p-1.5 bg-white">
                                                    <a href={studio.govIdSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                                                        Valid Gov ID
                                                    </a>
                                                    <span className="text-charcoal-500 font-medium">Exp: {studio.gov_id_expiry ? new Date(studio.gov_id_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span>
                                                </div>
                                            ) : (
                                                <p className="text-red-500">Missing Gov ID</p>
                                            )}

                                            {studio.insuranceSignedUrl && (
                                                <div className="flex justify-between w-full border border-cream-100 rounded p-1.5 bg-white">
                                                    <a href={studio.insuranceSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                                                        Insurance Policy
                                                    </a>
                                                    <span className="text-charcoal-500 font-medium">Exp: {studio.insurance_expiry ? new Date(studio.insurance_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanding section for other app details */}
                                    <details className="mt-3 group">
                                        <summary className="text-xs font-medium text-blue-600 cursor-pointer hover:text-blue-800 outline-none list-none flex items-center gap-1">
                                            <span className="group-open:hidden">▼ Show Full Application</span>
                                            <span className="hidden group-open:inline">▲ Hide Full Application</span>
                                        </summary>
                                        <div className="mt-3 text-sm text-charcoal-700 space-y-3 bg-white border border-cream-100 rounded-lg p-4">
                                            <div>
                                                <span className="font-medium text-charcoal-900 block mb-0.5">Detailed Address</span>
                                                <p className="whitespace-pre-wrap">{studio.address}</p>
                                            </div>

                                            {studio.equipment && studio.equipment.length > 0 && (
                                                <div>
                                                    <span className="font-medium text-charcoal-900 block mb-0.5">Equipment Provided</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {studio.equipment.map((eq: string, i: number) => (
                                                            <span key={i} className="px-2 py-0.5 bg-cream-100 text-charcoal-700 text-xs rounded-full">
                                                                {studio.inventory?.[eq] || (eq === 'Reformer' ? studio.reformers_count : 1)}x {eq}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <span className="font-medium text-charcoal-900 block mb-2">Space Photos</span>
                                                {studio.space_photos_urls && studio.space_photos_urls.length > 0 ? (
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                                        {studio.space_photos_urls.map((photoUrl: string, idx: number) => (
                                                            <a key={idx} href={photoUrl} target="_blank" rel="noopener noreferrer" className="block relative aspect-square hover:opacity-90 transition-opacity">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={photoUrl} alt={`Space Photo ${idx + 1}`} className="w-full h-full object-cover rounded shadow-sm border border-cream-200" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-charcoal-400 italic">No photos uploaded</p>
                                                )}
                                            </div>
                                        </div>
                                    </details>
                                </div>

                            ))}
                        </div>
                    )}
                </div>

                {/* Studio Payout Setup Initial Verification Queue */}
                <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-charcoal-500" />
                        Studio Payout Setup Approvals
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
                                            <VerifyButton
                                                id={studio.id}
                                                action="rejectStudioPayout"
                                                label="Reject"
                                                className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors"
                                            />
                                            <VerifyButton
                                                id={studio.id}
                                                action="approveStudioPayout"
                                                label="Approve"
                                                className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Document Links */}
                                    <div className="mt-4 pt-3 border-t border-cream-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-2">Legal Documents</p>
                                            <div className="space-y-1.5 flex flex-col items-start text-xs">
                                                {studio.permitSignedUrl ? (
                                                    <div className="flex justify-between w-full">
                                                        <a href={studio.permitSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                                                            Mayor's Permit
                                                        </a>
                                                        <span className="text-charcoal-500">Exp: {studio.mayors_permit_expiry ? new Date(studio.mayors_permit_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-red-500">Missing Permit</p>
                                                )}
                                                {studio.certSignedUrl ? (
                                                    <div className="flex justify-between w-full">
                                                        <a href={studio.certSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                                                            Secretary's Cert
                                                        </a>
                                                        <span className="text-charcoal-500">Exp: {studio.secretary_certificate_expiry ? new Date(studio.secretary_certificate_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span>
                                                    </div>
                                                ) : (
                                                    <p className="text-red-500">Missing Cert</p>
                                                )}
                                                {studio.bir_certificate_url ? (
                                                    <div className="flex justify-between w-full">
                                                        <span className="text-charcoal-900 font-medium">BIR Form 2303 (See queue)</span>
                                                        <span className="text-charcoal-500">Exp: {studio.bir_certificate_expiry ? new Date(studio.bir_certificate_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span>
                                                    </div>
                                                ) : null}
                                                {studio.insuranceSignedUrl ? (
                                                    <div className="flex justify-between w-full">
                                                        <a href={studio.insuranceSignedUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                                                            Insurance Policy
                                                        </a>
                                                        <span className="text-charcoal-500">Exp: {studio.insurance_expiry ? new Date(studio.insurance_expiry).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A'}</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Booking Requests */}
                <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm col-span-1 lg:col-span-2">
                    <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-charcoal-500" />
                        Booking Requests
                    </h2>

                    {pendingBookings?.length === 0 ? (
                        <p className="text-charcoal-500 text-sm">No pending booking requests.</p>
                    ) : (
                        <div className="space-y-4">
                            {pendingBookings?.map((booking: any) => {
                                const studio = booking.slots?.studios;
                                const startTime = new Date(booking.slots?.start_time).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
                                const hasPaymentProof = !!booking.payment_proof_url;

                                return (
                                    <div key={booking.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="font-medium text-charcoal-900">{booking.client?.full_name}</p>
                                                <p className="text-sm text-charcoal-600">
                                                    Requested: <span className="font-medium">{studio?.name}</span> ({studio?.location})
                                                </p>
                                                {studio?.address && (
                                                    <p className="text-xs text-charcoal-500">{studio.address}</p>
                                                )}
                                                <p className="text-xs text-charcoal-500 mt-1">{startTime}</p>

                                                {/* Payment Status Badge */}
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${booking.payment_status === 'submitted'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        Payment: {booking.payment_status || 'Pending'}
                                                    </span>

                                                    {hasPaymentProof && (
                                                        <div className="mt-1">
                                                            <a
                                                                href={booking.payment_proof_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="block relative hover:opacity-90 transition-opacity"
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={booking.payment_proof_url}
                                                                    alt="Payment Proof"
                                                                    className="h-16 w-auto object-cover rounded border border-gray-300"
                                                                />
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
                                                    <RejectBookingButton
                                                        id={booking.id}
                                                        variant="no-refund"
                                                        className="px-3 py-1 border border-red-200 text-red-600 text-xs rounded-md hover:bg-red-50 transition-colors"
                                                    />
                                                    <RejectBookingButton
                                                        id={booking.id}
                                                        variant="refund"
                                                        className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors"
                                                    />
                                                </>
                                            ) : (
                                                <RejectBookingButton
                                                    id={booking.id}
                                                    className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors"
                                                />
                                            )}
                                            <VerifyButton
                                                id={booking.id}
                                                action="confirmBooking"
                                                label="Confirm Booking"
                                                className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors"
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Studio Payout Requests */}
                <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm col-span-1 lg:col-span-2">
                    <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-charcoal-500" />
                        Studio Payout Requests
                    </h2>

                    {studioPayouts.length === 0 ? (
                        <p className="text-charcoal-500 text-sm">No pending studio payout requests.</p>
                    ) : (
                        <div className="space-y-4">
                            {studioPayouts.map((request: any) => (
                                <div key={request.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-medium text-charcoal-900">
                                                ₱{request.amount.toLocaleString()} — {request.studios?.name || 'Unknown Studio'}
                                            </p>
                                            <p className="text-xs text-charcoal-500 mt-0.5">
                                                Owner: {request.studios?.profiles?.full_name || '—'}
                                            </p>
                                            <div className="text-sm text-charcoal-600 mt-1">
                                                <span className="capitalize font-medium">{request.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'GCash'}</span>
                                                <span className="mx-2 text-charcoal-300">|</span>
                                                <span className="text-xs text-charcoal-600">
                                                    {(request.bank_name || request.payment_details?.bankName || request.payment_details?.bank_name) ? (
                                                        `${request.bank_name || request.payment_details?.bankName || request.payment_details?.bank_name} — `
                                                    ) : ''}
                                                    {request.account_number || request.payment_details?.accountNumber || request.payment_details?.account_number}
                                                </span>
                                            </div>
                                            <p className="text-xs text-charcoal-500 mt-0.5">
                                                Account Name: {request.account_name || request.payment_details?.accountName || request.payment_details?.account_name || '—'}
                                            </p>
                                            <p className="text-xs text-charcoal-400 mt-1">
                                                Requested: {new Date(request.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <VerifyButton
                                                id={request.id}
                                                action="rejectPayout"
                                                label="Reject"
                                                className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors"
                                            />
                                            <VerifyButton
                                                id={request.id}
                                                action="approvePayout"
                                                label="Approve"
                                                className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Customer Payout Requests */}
                <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm col-span-1 lg:col-span-2">
                    <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-charcoal-500" />
                        Customer Payout Requests
                        {customerPayouts.length > 0 && (
                            <span className="ml-2 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                {customerPayouts.length} pending
                            </span>
                        )}
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
                                                <p className="font-medium text-charcoal-900">
                                                    ₱{request.amount.toLocaleString()} — {request.profile?.full_name || `User ID: ${request.user_id}`}
                                                </p>
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wider font-medium">Customer</span>
                                            </div>
                                            <div className="text-sm text-charcoal-600 mt-1">
                                                <span className="capitalize font-medium">{request.payment_method === 'bank' || request.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'GCash'}</span>
                                                <span className="mx-2 text-charcoal-300">|</span>
                                                <span className="text-xs">
                                                    {(request.bank_name) ? `${request.bank_name} — ` : ''}
                                                    {request.account_number || '—'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-charcoal-500 mt-0.5">
                                                Account Name: {request.account_name || '—'}
                                            </p>
                                            <p className="text-xs text-charcoal-400 mt-1">
                                                Requested: {new Date(request.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <VerifyButton
                                                id={request.id}
                                                action="rejectPayout"
                                                label="Reject"
                                                className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded-md hover:bg-red-200 transition-colors"
                                            />
                                            <VerifyButton
                                                id={request.id}
                                                action="approvePayout"
                                                label="Approve"
                                                className="px-3 py-1 bg-charcoal-900 text-cream-50 text-xs rounded-md hover:bg-charcoal-800 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Wallet Top-Up Queue */}
                <div className="bg-white text-charcoal-900 border border-cream-200 rounded-xl p-6 shadow-sm col-span-1 lg:col-span-2">
                    <h2 className="text-xl font-medium text-charcoal-900 mb-4 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-charcoal-500" />
                        Pending Wallet Top-Ups
                    </h2>

                    {!pendingTopUps || pendingTopUps.length === 0 ? (
                        <p className="text-charcoal-500 text-sm">No pending top-up requests.</p>
                    ) : (
                        <div className="space-y-4">
                            {pendingTopUps.map((topUp: any) => (
                                <div key={topUp.id} className="border border-cream-100 rounded-lg p-4 bg-cream-50/50">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="font-bold text-lg text-charcoal-900">
                                                ₱{topUp.amount.toLocaleString()} — {topUp.profiles?.full_name}
                                            </p>
                                            <p className="text-sm text-charcoal-600">
                                                {topUp.profiles?.email} ({topUp.profiles?.role})
                                            </p>
                                            <p className="text-xs text-charcoal-400 mt-1">
                                                Requested: {new Date(topUp.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <VerifyButton
                                                id={topUp.id}
                                                action="rejectTopUp"
                                                label="Reject"
                                                className="px-4 py-2 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition-colors"
                                            />
                                            <VerifyButton
                                                id={topUp.id}
                                                action="approveTopUp"
                                                label="Approve & Credit"
                                                className="px-4 py-2 bg-charcoal-900 text-cream-50 text-xs font-bold rounded-lg hover:bg-charcoal-800 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {topUp.payment_proof_url && (
                                        <div className="mt-4">
                                            <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest mb-2">Payment Receipt</p>
                                            <div className="flex items-start gap-4">
                                                <a
                                                    href={topUp.payment_proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block group relative"
                                                >
                                                    <img
                                                        src={topUp.payment_proof_url}
                                                        alt="Payment Receipt"
                                                        className="h-48 w-auto object-cover rounded-xl border border-cream-200 shadow-sm group-hover:shadow-md transition-all"
                                                    />
                                                    <div className="absolute inset-0 bg-charcoal-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl text-white text-[10px] font-bold">
                                                        View Full Size
                                                    </div>
                                                </a>
                                                <div className="bg-cream-50 p-3 rounded-lg border border-cream-100 max-w-xs">
                                                    <p className="text-xs text-charcoal-600 leading-relaxed font-medium">
                                                        Verify the amount <span className="text-charcoal-900 font-bold">₱{topUp.amount.toLocaleString()}</span> and Name/Reference on this receipt before approving.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Admin Balance Override Tool */}
                <div className="bg-charcoal-900 text-white border border-charcoal-800 rounded-xl p-6 shadow-xl col-span-1 lg:col-span-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-rose-gold/20 rounded-lg">
                            <ShieldAlert className="w-6 h-6 text-rose-gold" />
                        </div>
                        <div>
                            <h2 className="text-xl font-medium">Manual Balance Adjustment</h2>
                            <p className="text-white/50 text-xs">Directly credit or debit a user's wallet balance.</p>
                        </div>
                    </div>

                    <BalanceAdjustmentTool />
                </div>

                {/* Suspended Studios (Late Cancellations) */}
                <div className="bg-white text-charcoal-900 border border-red-200 rounded-xl p-6 shadow-sm col-span-1 lg:col-span-2">
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
                                    <VerifyButton
                                        id={profile.id}
                                        action="reinstateStudio"
                                        label="Reactivate"
                                        className="px-4 py-2 bg-charcoal-900 text-cream-50 text-xs rounded-lg hover:bg-charcoal-800 transition-colors shadow-sm font-bold"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

        </div>
    )
}
