import React from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { Clock, Wallet, MessageCircle, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import VerifyButton from '@/components/admin/VerifyButton'
import RejectBookingButton from '@/components/admin/RejectBookingButton'
import BalanceAdjustmentTool from '@/components/admin/BalanceAdjustmentTool'
import { safeFormatDate, safeFormatCurrency } from '@/lib/utils/format'

export default async function PayoutsTab() {
    const supabase = createAdminClient()
    
    const { data: queuesData, error: queuesError } = await supabase.rpc('get_admin_dashboard_queues')
    if (queuesError) console.error('[PayoutsTab] Queue RPC failed:', queuesError)
    
    const queues = queuesData || {}
    const pendingBookings = queues.bookings || []
    const payoutRequests = queues.instructor_payouts || []
    const studioPayouts = queues.studio_payouts || []
    const customerPayouts = queues.customer_payouts || []
    const pendingTopUps = queues.top_ups || []

    // Generate Signed URLs for payment proofs
    const isStoragePath = (url: string) => url && !url.startsWith('http')
    
    const paymentProofPaths = [
        ...(pendingBookings?.map((b: any) => b.payment_proof_url).filter(isStoragePath) || []),
        ...(pendingTopUps?.map((t: any) => t.payment_proof_url).filter(isStoragePath) || [])
    ]

    const { data: paymentSignedRes } = await (paymentProofPaths.length > 0 
        ? supabase.storage.from('payment-proofs').createSignedUrls(paymentProofPaths, 3600) 
        : Promise.resolve({ data: [] }))

    const paymentUrlMap = Object.fromEntries((paymentSignedRes ?? []).filter((r: any) => r.signedUrl).map((r: any) => [r.path, r.signedUrl]))

    const getDisplayUrl = (original: string): string => {
        if (!original) return original
        if (!isStoragePath(original)) return original
        return paymentUrlMap[original] || original
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="atelier-card p-8 space-y-6">
                <h2 className="text-sm font-black tracking-[0.2em] text-burgundy flex items-center gap-3">
                    <Clock className="w-4 h-4 text-forest" />
                    BOOKING REQUESTS
                    {pendingBookings.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{pendingBookings.length}</span>}
                </h2>
                {pendingBookings.length === 0 ? <p className="text-burgundy/40 text-xs italic">No pending booking approvals.</p> : (
                    <div className="space-y-6">
                        {pendingBookings.map((b: any) => {
                            const breakdown = b.price_breakdown || {}
                            const instructor = b.instructor
                            const studio = b.slots?.studios
                            const studioOwner = Array.isArray(studio?.profiles) ? studio.profiles[0] : studio?.profiles

                            return (
                                <div key={b.id} className="group p-6 bg-stone-50 border border-stone-100 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 flex flex-col lg:flex-row justify-between items-start gap-8">
                                    <div className="flex-1 min-w-0 space-y-4">
                                        <div className="space-y-1 overflow-hidden">
                                            <div className="flex items-center gap-3">
                                                <p className="font-serif text-2xl text-burgundy">
                                                    {instructor?.full_name || 'Instructor'} <span className="text-burgundy/50 font-sans text-lg mx-1">→</span> {studio?.name || 'Studio'}
                                                </p>
                                                <span className="px-2.5 py-1 bg-forest/10 text-forest text-[8px] font-black rounded-lg uppercase tracking-widest border border-forest/20">
                                                    {breakdown.equipment || 'Session'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-burgundy/50 font-medium overflow-hidden">
                                                <Link 
                                                    href={`/admin?tab=accounts&search=${encodeURIComponent(b.client?.email || '')}`}
                                                    className="font-bold text-burgundy/80 truncate hover:text-forest transition-colors"
                                                >
                                                    Client: {b.client?.full_name}
                                                </Link>
                                                <span className="opacity-40 flex-shrink-0">•</span>
                                                <span className="truncate">{b.client?.email}</span>
                                            </div>
                                            <p className="text-[10px] text-burgundy/40 font-bold uppercase tracking-wider mt-1">
                                                {safeFormatDate(b.slots?.date)} @ {b.slots?.start_time || 'No Time'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-stone-200/50">
                                            <div className="space-y-1.5">
                                                <p className="text-[8px] uppercase tracking-widest font-black text-burgundy/50">Instructor Contact</p>
                                                <Link 
                                                    href={`/admin?tab=accounts&search=${encodeURIComponent(instructor?.email || '')}`}
                                                    className="text-xs font-bold text-burgundy/70 hover:text-forest transition-colors block"
                                                >
                                                    {instructor?.email}
                                                </Link>
                                            </div>
                                            <div className="space-y-1.5">
                                                <p className="text-[8px] uppercase tracking-widest font-black text-burgundy/50">Studio Contact</p>
                                                <Link 
                                                    href={`/admin?tab=accounts&search=${encodeURIComponent(studioOwner?.email || '')}`}
                                                    className="text-xs font-bold text-burgundy/70 hover:text-forest transition-colors block"
                                                >
                                                    {studioOwner?.email || 'N/A'}
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="bg-white/60 border border-stone-200 p-5 rounded-2xl shadow-sm space-y-4">
                                            <div className="flex justify-between items-end">
                                                <p className="text-[10px] font-black text-burgundy/50 tracking-widest uppercase">Financial Breakdown</p>
                                                <p className="text-xl font-serif text-burgundy">₱{safeFormatCurrency(b.total_price)}</p>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div className="space-y-0.5">
                                                    <p className="text-[8px] text-burgundy/50 uppercase font-black tracking-widest leading-none">Studio</p>
                                                    <p className="text-sm font-bold text-burgundy/80 leading-none">₱{safeFormatCurrency(breakdown.studio_fee)}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[8px] text-burgundy/50 uppercase font-black tracking-widest leading-none">Instructor</p>
                                                    <p className="text-sm font-bold text-burgundy/80 leading-none">₱{safeFormatCurrency(breakdown.instructor_fee)}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[8px] text-burgundy/50 uppercase font-black tracking-widest leading-none">Service</p>
                                                    <p className="text-sm font-bold text-burgundy/80 leading-none">₱{safeFormatCurrency(breakdown.service_fee)}</p>
                                                </div>
                                                {breakdown.wallet_deduction > 0 && (
                                                    <div className="space-y-0.5">
                                                        <p className="text-[8px] text-forest uppercase font-black tracking-widest leading-none">Wallet</p>
                                                        <p className="text-sm font-bold text-forest leading-none">-₱{safeFormatCurrency(breakdown.wallet_deduction)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {b.payment_proof_url && (
                                            <a href={getDisplayUrl(b.payment_proof_url)} target="_blank" className="inline-flex items-center gap-2 text-[10px] font-black text-forest hover:text-burgundy transition-colors uppercase tracking-[0.2em]">
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
                <div className="atelier-card p-8 space-y-6">
                    <h2 className="text-sm font-black tracking-[0.2em] text-burgundy flex items-center gap-3">
                        <Wallet className="w-4 h-4 text-forest" />
                        INSTRUCTOR PAYOUTS
                        {payoutRequests.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{payoutRequests.length}</span>}
                    </h2>
                    {payoutRequests.length === 0 ? <p className="text-burgundy/40 text-xs italic">No pending requests.</p> : (
                        <div className="space-y-4">
                            {payoutRequests.map((r: any) => (
                                <div key={r.id} className="p-5 bg-stone-50 border border-stone-100 rounded-2xl flex justify-between items-center gap-4 transition-all hover:bg-white hover:shadow-xl group">
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <p className="text-lg font-serif text-burgundy truncate">₱{safeFormatCurrency(r.amount)}</p>
                                        <div className="space-y-0.5">
                                            <Link 
                                                href={`/admin?tab=accounts&search=${encodeURIComponent(r.instructor_email || '')}`}
                                                className="text-[10px] text-burgundy font-black uppercase tracking-widest truncate block hover:text-forest transition-colors"
                                            >
                                                {r.instructor_name}
                                            </Link>
                                            <p className="text-[9px] text-burgundy/40 font-bold uppercase tracking-wider truncate">{r.instructor_email}</p>
                                            <p className="text-[9px] text-forest font-black uppercase tracking-widest">Balance: ₱{safeFormatCurrency(r.instructor_balance)}</p>
                                        </div>
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

                <div className="atelier-card p-8 space-y-6">
                    <h2 className="text-sm font-black tracking-[0.2em] text-burgundy flex items-center gap-3">
                        <Wallet className="w-4 h-4 text-forest" />
                        STUDIO PAYOUTS
                        {studioPayouts.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{studioPayouts.length}</span>}
                    </h2>
                    {studioPayouts.length === 0 ? <p className="text-burgundy/40 text-xs italic">No pending payouts.</p> : (
                        <div className="space-y-4">
                            {studioPayouts.map((r: any) => (
                                <div key={r.id} className="p-5 bg-stone-50 border border-stone-100 rounded-2xl flex justify-between items-center gap-4 transition-all hover:bg-white hover:shadow-xl group">
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <p className="text-lg font-serif text-burgundy truncate">₱{safeFormatCurrency(r.amount)}</p>
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] text-burgundy font-black uppercase tracking-widest truncate">
                                                {(Array.isArray(r.studios) ? r.studios[0] : r.studios)?.name || 'Unknown Studio'} 
                                            </p>
                                            <Link 
                                                href={`/admin?tab=accounts&search=${encodeURIComponent((Array.isArray((Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles) ? (Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles[0] : (Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles)?.email || '')}`}
                                                className="text-[9px] text-burgundy/40 font-bold uppercase tracking-wider truncate block hover:text-forest transition-colors"
                                            >
                                                {(Array.isArray((Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles) ? (Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles[0] : (Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles)?.full_name || 'No Owner'}
                                                {` • `}
                                                {(Array.isArray((Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles) ? (Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles[0] : (Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles)?.email || '-'}
                                            </Link>
                                            <p className="text-[9px] text-forest font-black uppercase tracking-widest">
                                                Balance: ₱{safeFormatCurrency((Array.isArray((Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles) ? (Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles[0] : (Array.isArray(r.studios) ? r.studios[0] : r.studios)?.profiles)?.available_balance)}
                                            </p>
                                        </div>
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

                <div className="atelier-card p-8 space-y-6">
                    <h2 className="text-sm font-black tracking-[0.2em] text-burgundy flex items-center gap-3">
                        <Wallet className="w-4 h-4 text-forest" />
                        CUSTOMER PAYOUTS
                        {customerPayouts.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{customerPayouts.length}</span>}
                    </h2>
                    {customerPayouts.length === 0 ? <p className="text-burgundy/40 text-xs italic">No pending customer breakouts.</p> : (
                        <div className="space-y-4">
                            {customerPayouts.map((r: any) => (
                                <div key={r.id} className="p-5 bg-stone-50 border border-stone-100 rounded-2xl flex justify-between items-center transition-all hover:bg-white hover:shadow-xl group">
                                    <div className="space-y-1">
                                        <p className="text-lg font-serif text-burgundy">₱{safeFormatCurrency(r.amount)}</p>
                                        <div className="space-y-0.5">
                                            <Link 
                                                href={`/admin?tab=accounts&search=${encodeURIComponent(r.profile?.email || '')}`}
                                                className="text-[10px] text-burgundy/40 font-black uppercase tracking-widest block hover:text-forest transition-colors"
                                            >
                                                {r.profile?.full_name}
                                            </Link>
                                            <p className="text-[9px] text-burgundy/50 font-bold uppercase">{r.profile?.email}</p>
                                            <p className="text-[9px] text-forest font-black uppercase tracking-widest">Balance: ₱{safeFormatCurrency(r.profile?.available_balance)}</p>
                                        </div>
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

                <div className="atelier-card p-8 space-y-6">
                    <h2 className="text-sm font-black tracking-[0.2em] text-burgundy flex items-center gap-3">
                        <Wallet className="w-4 h-4 text-forest" />
                        WALLET TOP-UPS
                        {pendingTopUps.length > 0 && <span className="flex items-center justify-center w-6 h-6 rounded-full bg-forest text-white text-[10px] font-black">{pendingTopUps.length}</span>}
                    </h2>
                    {pendingTopUps.length === 0 ? <p className="text-burgundy/40 text-xs italic">No pending top-ups.</p> : (
                        <div className="space-y-4">
                            {pendingTopUps.map((t: any) => (
                                <div key={t.id} className="p-5 bg-stone-50 border border-stone-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 transition-all hover:bg-white hover:shadow-xl group">
                                    <div className="flex items-start gap-4">
                                        {t.payment_proof_url && (
                                            <a href={getDisplayUrl(t.payment_proof_url)} target="_blank" className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 bg-white flex-shrink-0 group-hover:border-forest/30 transition-colors shadow-sm">
                                                <img 
                                                    src={getDisplayUrl(t.payment_proof_url)} 
                                                    alt="Payment Proof" 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/10 flex items-center justify-center transition-colors shadow-inner shadow-black/10 transition-all">
                                                    <BarChart3 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                                                </div>
                                            </a>
                                        )}
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <p className="text-xl font-serif text-burgundy truncate">₱{safeFormatCurrency(t.amount)}</p>
                                            <div className="space-y-0.5 overflow-hidden">
                                                <Link 
                                                    href={`/admin?tab=accounts&search=${encodeURIComponent(t.profiles?.email || '')}`}
                                                    className="text-[10px] text-burgundy font-black uppercase tracking-widest truncate block hover:text-forest transition-colors"
                                                >
                                                    {t.profiles?.full_name}
                                                </Link>
                                                <p className="text-[9px] text-burgundy/40 font-bold uppercase tracking-wider truncate">{t.profiles?.email}</p>
                                                <p className="text-[9px] text-forest font-black uppercase tracking-widest">Current Balance: ₱{safeFormatCurrency(t.profiles?.available_balance)}</p>
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

                <div className="atelier-card p-8 bg-forest text-white border-0 shadow-2xl lg:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-white/10 rounded-2xl">
                            <Wallet className="w-6 h-6 text-amber-500" />
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
    )
}
