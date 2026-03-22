'use client'

import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import {
    Clock,
    Search,
    Download,
    ChevronLeft,
    ChevronRight,
    CheckCircle,
    XCircle,
    Activity,
    TrendingUp
} from 'lucide-react'

type Log = {
    id: string
    action_type: string
    entity_type: string
    entity_id: string | null
    details: string
    created_at: string
    admin: { full_name: string; email: string } | { full_name: string; email: string }[] | null
}

type Transaction = {
    id: string
    date: string
    type: 'Booking' | 'Payout' | 'Top-up'
    status?: string
    client: string
    client_email: string
    studio: string
    studio_email: string
    instructor: string
    instructor_email: string
    total_amount: number
    platform_fee: number
    studio_fee: number
    instructor_fee: number
}

const ACTION_CATEGORIES: Record<string, string> = {
    // Bookings
    APPROVE_BOOKING: 'Approvals',
    REJECT_BOOKING: 'Bookings',
    COMPLETE_BOOKING: 'Bookings',

    // Payouts & Finance
    APPROVE_PAYOUT: 'Payouts',
    REJECT_PAYOUT: 'Payouts',
    APPROVE_STUDIO_PAYOUT_SETUP: 'Approvals',
    REJECT_STUDIO_PAYOUT_SETUP: 'Payouts',
    SETTLE_INSTRUCTOR_DEBT: 'Finance',
    TRIGGER_FUNDS_UNLOCK: 'Finance',

    // Wallet
    APPROVE_TOP_UP: 'Wallet',
    REJECT_TOP_UP: 'Wallet',
    MANUAL_BALANCE_ADJUSTMENT: 'Wallet',

    // Verifications & Partners
    APPROVE_CERTIFICATION: 'Approvals',
    REJECT_CERTIFICATION: 'Approvals',
    VERIFY_STUDIO: 'Approvals',
    REJECT_STUDIO: 'Approvals',
    REINSTATE_STUDIO: 'Partners',
    UPDATE_PARTNER_FEES: 'Partners',
}

const CATEGORY_BADGE: Record<string, string> = {
    Approvals: 'bg-green-50 text-green-700 border-green-100',
    Bookings: 'bg-blue-50 text-blue-700 border-blue-100',
    Payouts: 'bg-amber-50 text-amber-700 border-amber-100',
    Wallet: 'bg-purple-50 text-purple-700 border-purple-100',
    Partners: 'bg-orange-50 text-orange-700 border-orange-100',
    Finance: 'bg-rose-50 text-rose-700 border-rose-100',
    Other: 'bg-stone-100 text-stone-600 border-stone-200',
}

function getAdmin(log: Log): { name: string; email: string } {
    if (!log.admin) return { name: 'System', email: '' }
    const a = Array.isArray(log.admin) ? log.admin[0] : log.admin
    return { name: a?.full_name || 'System', email: a?.email || '' }
}

function extractAmount(details: string): string | null {
    const match = details.match(/₱([\d,]+(?:\.\d+)?)/)
    return match ? `₱${match[1]}` : null
}

function extractEmail(details: string): string | null {
    // Look for a standard email pattern anywhere in the string
    const match = details.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    return match ? match[1] : null
}

const PAGE_SIZE = 20

export default function ReportsTab({ logs, transactions = [] }: { logs: Log[], transactions?: Transaction[] }) {
    const searchParams = useSearchParams()
    const initialSubtab = searchParams.get('subtab') || 'activity'
    const initialFilter = searchParams.get('filter') || 'all'

    const [activeSubtab, setActiveSubtab] = useState(initialSubtab)
    const [search, setSearch] = useState('')
    const [actionFilter, setActionFilter] = useState('all')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [txTypeFilter, setTxTypeFilter] = useState(initialFilter)
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [page, setPage] = useState(1)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // ── Stats (computed from all logs, before filters) ──────────────────────
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek = logs.filter(l => new Date(l.created_at) >= weekAgo)
    const totalApprovals = logs.filter(l =>
        (ACTION_CATEGORIES[l.action_type] || 'Other') === 'Approvals' || l.action_type.startsWith('APPROVE') || l.action_type.startsWith('VERIFY')
    ).length
    const totalRejections = logs.filter(l => l.action_type.startsWith('REJECT')).length

    // Most active admin
    const adminCounts: Record<string, number> = {}
    logs.forEach(l => {
        const name = getAdmin(l).name
        adminCounts[name] = (adminCounts[name] || 0) + 1
    })
    const topAdmin = Object.entries(adminCounts).sort((a, b) => b[1] - a[1])[0]

    // ── Unique values for filter dropdowns ───────────────────────────────────
    const actionTypes = useMemo(() => Array.from(new Set(logs.map(l => l.action_type))).sort(), [logs])
    const categories = ['Approvals', 'Bookings', 'Payouts', 'Wallet', 'Partners', 'Finance', 'Other']

    // ── Filtered data ────────────────────────────────────────────────────────
    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            if (actionFilter !== 'all' && l.action_type !== actionFilter) return false
            if (categoryFilter !== 'all' && (ACTION_CATEGORIES[l.action_type] || 'Other') !== categoryFilter) return false
            if (dateFrom && new Date(l.created_at) < new Date(dateFrom)) return false
            if (dateTo) {
                const to = new Date(dateTo)
                to.setDate(to.getDate() + 1)
                if (new Date(l.created_at) > to) return false
            }
            if (search) {
                const q = search.toLowerCase()
                const adminName = getAdmin(l).name.toLowerCase()
                return (
                    l.details?.toLowerCase().includes(q) ||
                    l.action_type.toLowerCase().includes(q) ||
                    adminName.includes(q)
                )
            }
            return true
        })
    }, [logs, search, actionFilter, categoryFilter, dateFrom, dateTo])

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (txTypeFilter === 'Platform Fees') {
                if (t.type !== 'Booking' || t.platform_fee <= 0) return false
            } else if (txTypeFilter === 'Studio Share') {
                if (t.type !== 'Booking' || t.studio_fee <= 0) return false
            } else if (txTypeFilter === 'Instructor Share') {
                if (t.type !== 'Booking' || t.instructor_fee <= 0) return false
            } else if (txTypeFilter === 'Payouts') {
                if (t.type !== 'Payout') return false
            } else if (txTypeFilter !== 'all' && t.type !== txTypeFilter) {
                if (t.type !== txTypeFilter) return false
            }

            if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false
            if (dateTo) {
                const to = new Date(dateTo)
                to.setDate(to.getDate() + 1)
                if (new Date(t.date) > to) return false
            }

            if (search) {
                const q = search.toLowerCase()
                return (
                    t.client.toLowerCase().includes(q) ||
                    t.client_email.toLowerCase().includes(q) ||
                    t.studio.toLowerCase().includes(q) ||
                    t.instructor.toLowerCase().includes(q) ||
                    t.type.toLowerCase().includes(q)
                )
            }

            return true
        })
    }, [transactions, search, txTypeFilter, dateFrom, dateTo])

    const currentDisplayData = activeSubtab === 'activity' ? filteredLogs : filteredTransactions
    const totalPages = Math.max(1, Math.ceil(currentDisplayData.length / PAGE_SIZE))
    const paginated = currentDisplayData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const resetPage = () => setPage(1)

    // ── CSV Exports ───────────────────────────────────────────────────────────
    const safeFormatDate = (dateStr: string | null | undefined, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) => {
        if (!dateStr) return '—'
        try {
            const d = new Date(dateStr)
            if (isNaN(d.getTime())) return '—'
            return d.toLocaleString('en-PH', { timeZone: 'Asia/Manila', ...options }).toUpperCase()
        } catch (e) {
            return '—'
        }
    }

    function exportActivityCSV() {
        const header = 'Date & Time,Admin,Admin Email,Category,Action,Details'
        const rows = filteredLogs.map(l => {
            const { name, email } = getAdmin(l)
            const category = ACTION_CATEGORIES[l.action_type] || 'Other'
            const date = safeFormatDate(l.created_at, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            const details = (l.details || '').replace(/,/g, ';').replace(/\n/g, ' ')
            return `"${date}","${name}","${email}","${category}","${l.action_type}","${details}"`
        })
        const csv = [header, ...rows].join('\n')
        downloadCSV(csv, 'admin-activity-log')
    }

    function exportFinancialCSV() {
        const header = 'Date & Time,Type,List,Studio Email,Instructor Email,Amount,Platform Fee,Studio Share,Instructor Share,Status'
        const rows = filteredTransactions.map(t => {
            const date = safeFormatDate(t.date, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            const list = t.type === 'Booking' ? `${t.client} @ ${t.studio}` : (t.type === 'Payout' ? (t.studio !== '-' ? t.studio : t.instructor) : t.client)
            const studioEmail = t.type === 'Booking' ? t.studio_email : (t.type === 'Payout' && t.studio !== '-' ? t.instructor_email : '-')
            const instructorEmail = t.type === 'Booking' ? t.instructor_email : (t.type === 'Payout' && t.studio === '-' ? t.instructor_email : '-')
            return `"${date}","${t.type}","${list}","${studioEmail}","${instructorEmail}","${t.total_amount}","${t.platform_fee}","${t.studio_fee}","${t.instructor_fee}","${t.status || '-'}"`
        })
        const csv = [header, ...rows].join('\n')
        downloadCSV(csv, 'financial-transactions')
    }

    function downloadCSV(csv: string, filename: string) {
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Stats Cards ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="glass-card p-8 group hover:scale-[1.02] transition-all duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-forest/10 rounded-xl group-hover:bg-forest transition-colors">
                            <Activity className="w-5 h-5 text-forest group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em]">Velocity</span>
                    </div>
                    <p className="font-serif text-4xl text-burgundy">{thisWeek.length}</p>
                    <p className="text-[10px] text-burgundy/50 font-black uppercase tracking-widest mt-2">{thisWeek.length === 1 ? 'ACTION' : 'ACTIONS'} THIS WEEK</p>
                </div>

                <div className="glass-card p-8 group hover:scale-[1.02] transition-all duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-green-50 rounded-xl group-hover:bg-green-600 transition-colors">
                            <CheckCircle className="w-5 h-5 text-green-600 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em]">Success Rate</span>
                    </div>
                    <p className="font-serif text-4xl text-green-600">{totalApprovals}</p>
                    <p className="text-[10px] text-burgundy/50 font-black uppercase tracking-widest mt-2">TOTAL APPROVALS</p>
                </div>

                <div className="glass-card p-8 group hover:scale-[1.02] transition-all duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-burgundy/10 rounded-xl group-hover:bg-burgundy transition-colors">
                            <XCircle className="w-5 h-5 text-burgundy group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em]">Intercepts</span>
                    </div>
                    <p className="font-serif text-4xl text-burgundy">{totalRejections}</p>
                    <p className="text-[10px] text-burgundy/50 font-black uppercase tracking-widest mt-2">TOTAL REJECTIONS</p>
                </div>

                <div className="glass-card p-8 group hover:scale-[1.02] transition-all duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-amber-400/10 rounded-xl group-hover:bg-amber-400 transition-colors">
                            <TrendingUp className="w-5 h-5 text-amber-600 group-hover:text-white transition-colors" />
                        </div>
                        <span className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em]">Lead Admin</span>
                    </div>
                    <p className="text-xl font-serif text-burgundy truncate">{topAdmin?.[0] ?? '—'}</p>
                    <p className="text-[10px] text-burgundy/50 font-black uppercase tracking-widest mt-2">{topAdmin?.[1] ?? 0} OPERATIONS COMPLETED</p>
                </div>
            </div>

            {/* ── Sub-tab Toggle ────────────────────────────────────────── */}
            <div className="flex gap-4 bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 w-fit">
                <button
                    onClick={() => { setActiveSubtab('activity'); resetPage() }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-500 uppercase ${activeSubtab === 'activity' ? 'bg-forest text-white shadow-lg' : 'text-burgundy/40 hover:text-burgundy hover:bg-white/50'}`}
                >
                    Administrative Logs
                </button>
                <button
                    onClick={() => { setActiveSubtab('transactions'); resetPage() }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-500 uppercase ${activeSubtab === 'transactions' ? 'bg-forest text-white shadow-lg' : 'text-burgundy/40 hover:text-burgundy hover:bg-white/50'}`}
                >
                    Financial Archives
                </button>
            </div>

            {/* ── Filters + Content ───────────────────────────────────── */}
            <div className="glass-card overflow-hidden">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-6 p-8 border-b border-stone-100 bg-stone-50/30">
                    <div>
                        <h2 className="text-[11px] font-black tracking-[0.3em] text-burgundy uppercase flex items-center gap-3">
                            {activeSubtab === 'activity' ? <Clock className="w-4 h-4 text-forest" /> : <TrendingUp className="w-4 h-4 text-forest" />}
                            {activeSubtab === 'activity' ? 'SYSTEM ACTIVITY LOG' : 'FINANCIAL TRANSACTION LEDGER'}
                        </h2>
                        <p className="text-[9px] text-burgundy/40 font-black uppercase tracking-[0.2em] mt-1.5">{currentDisplayData.length} CRYPTOGRAPHICALLY LOGGED ENTRIES</p>
                    </div>
                    <button
                        onClick={activeSubtab === 'activity' ? exportActivityCSV : exportFinancialCSV}
                        className="flex items-center gap-3 px-6 py-3.5 bg-forest text-white text-[10px] font-black rounded-xl hover:brightness-110 transition-all tracking-[0.2em] shadow-md active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        EXPORT DATASET
                    </button>
                </div>

                {/* Filters row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-8 bg-stone-50/10 border-b border-stone-100">
                    {/* Search */}
                    <div className="relative group lg:col-span-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-burgundy/40 group-focus-within:text-forest transition-colors" />
                        <input
                            type="text"
                            placeholder="Universal search…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); resetPage() }}
                            className="w-full pl-11 pr-4 py-3.5 text-[10px] font-black border border-stone-100 rounded-xl bg-white/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all tracking-widest uppercase placeholder:text-burgundy/20"
                        />
                    </div>

                    {activeSubtab === 'activity' ? (
                        <>
                            <select
                                value={categoryFilter}
                                onChange={e => { setCategoryFilter(e.target.value); resetPage() }}
                                className="text-[10px] font-black border border-cream-100 rounded-xl px-4 py-3 bg-white/60 text-charcoal focus:bg-white focus:outline-none tracking-widest uppercase cursor-pointer"
                            >
                                <option value="all">ALL CATEGORIES</option>
                                {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                            </select>
                            <select
                                value={actionFilter}
                                onChange={e => { setActionFilter(e.target.value); resetPage() }}
                                className="text-[10px] font-black border border-cream-100 rounded-xl px-4 py-3 bg-white/60 text-charcoal focus:bg-white focus:outline-none tracking-widest uppercase cursor-pointer"
                            >
                                <option value="all">ALL ACTIONS</option>
                                {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                            </select>
                        </>
                    ) : (
                        <select
                            value={txTypeFilter}
                            onChange={e => { setTxTypeFilter(e.target.value); resetPage() }}
                            className="text-[10px] font-black border border-cream-100 rounded-xl px-4 py-3 bg-white/60 text-charcoal focus:bg-white focus:outline-none tracking-widest uppercase cursor-pointer lg:col-span-2"
                        >
                            <option value="all">ALL TRANSACTION TYPES</option>
                            <option value="Booking">SESSIONS & RENTALS</option>
                            <option value="Top-up">WALLET TOP-UPS</option>
                            <option value="Payout">PARTNER PAYOUTS</option>
                            <option value="Platform Fees">PLATFORM REVENUE ONLY</option>
                            <option value="Studio Share">STUDIO DISBURSEMENTS</option>
                            <option value="Instructor Share">INSTRUCTOR DISBURSEMENTS</option>
                        </select>
                    )}

                    {/* Date range */}
                    <div className="flex items-center gap-2 lg:col-span-1">
                        <div className="flex-1 relative group">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={e => { setDateFrom(e.target.value); resetPage() }}
                                className="w-full px-4 py-3.5 text-[10px] font-black border border-stone-100 rounded-xl bg-white/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all tracking-widest uppercase cursor-pointer pr-12 placeholder:text-burgundy/20"
                            />
                        </div>
                        <span className="text-burgundy/20 font-black">/</span>
                        <div className="flex-1 relative group">
                            <input
                                type="date"
                                value={dateTo}
                                onChange={e => { setDateTo(e.target.value); resetPage() }}
                                className="w-full px-4 py-3.5 text-[10px] font-black border border-stone-100 rounded-xl bg-white/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all tracking-widest uppercase cursor-pointer pr-12 placeholder:text-burgundy/20"
                            />
                        </div>
                    </div>

                    {(search || actionFilter !== 'all' || categoryFilter !== 'all' || txTypeFilter !== 'all' || dateFrom || dateTo) && (
                        <button
                            onClick={() => { setSearch(''); setActionFilter('all'); setCategoryFilter('all'); setTxTypeFilter('all'); setDateFrom(''); setDateTo(''); resetPage() }}
                            className="text-[9px] font-black text-red-500 hover:text-red-600 underline uppercase tracking-widest text-right lg:col-span-4"
                        >
                            Reset filters
                        </button>
                    )}
                </div>

                {/* Table Content */}
                {paginated.length === 0 ? (
                    <div className="text-center py-24 space-y-4">
                        <div className="w-16 h-16 bg-alabaster rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-charcoal/50" />
                        </div>
                        <p className="text-charcoal font-serif text-xl">No matching records found.</p>
                        <p className="text-charcoal/40 text-sm italic">Try adjusting your filters or search keywords.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                {activeSubtab === 'activity' ? (
                                    <tr className="bg-stone-50/50 border-b border-stone-100 italic">
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">TIMESTAMP</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">OPERATOR</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">CLASSIFICATION</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">AMOUNT</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">OPERATIONAL DETAILS</th>
                                    </tr>
                                ) : (
                                    <tr className="bg-stone-50/50 border-b border-stone-100 italic">
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">TIMESTAMP</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">TYPE</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">PARTICIPANTS</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">TOTAL</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">REVENUE FEE</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">STUDIO</th>
                                        <th className="px-8 py-5 text-[9px] font-black text-burgundy/40 uppercase tracking-[0.2em]">INSTRUCTOR</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-cream-50">
                                {activeSubtab === 'activity' ? (
                                    (paginated as Log[]).map(log => {
                                        const { name, email } = getAdmin(log)
                                        const category = ACTION_CATEGORIES[log.action_type] || 'Other'
                                        const isApproval = log.action_type.startsWith('APPROVE') || log.action_type.startsWith('VERIFY') || log.action_type === 'REINSTATE_STUDIO'
                                        const isRejection = log.action_type.startsWith('REJECT')
                                        return (
                                            <tr key={log.id} className="hover:bg-sage/5 transition-colors group">
                                                <td className="px-8 py-6 text-[10px] font-bold text-charcoal/60 whitespace-nowrap">
                                                    {safeFormatDate(log.created_at)}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-xs font-black text-charcoal uppercase tracking-widest">{name}</p>
                                                    {email && <p className="text-[9px] text-charcoal/50 font-bold uppercase mt-0.5">{email}</p>}
                                                </td>
                                                <td className="px-8 py-6 space-y-2">
                                                    <span className={clsx(
                                                        "inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.15em] border whitespace-nowrap",
                                                        CATEGORY_BADGE[category]?.replace('bg-', 'bg-').replace('text-', 'text-').includes('green') ? "bg-green-50 text-green-700 border-green-100" :
                                                            CATEGORY_BADGE[category]?.includes('blue') ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                                CATEGORY_BADGE[category]?.includes('amber') ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                                    CATEGORY_BADGE[category]?.includes('purple') ? "bg-purple-50 text-purple-700 border-purple-100" :
                                                                        CATEGORY_BADGE[category]?.includes('orange') ? "bg-orange-50 text-orange-700 border-orange-100" :
                                                                            CATEGORY_BADGE[category]?.includes('rose') ? "bg-rose-50 text-rose-700 border-rose-100" :
                                                                                "bg-alabaster text-charcoal/40 border-cream-100"
                                                    )}>
                                                        {category}
                                                    </span>
                                                    <div className={clsx(
                                                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border w-fit",
                                                        isApproval ? "bg-green-50 text-green-700 border-green-100" : isRejection ? "bg-red-50 text-red-700 border-red-100" : "bg-alabaster text-charcoal-700 border-cream-200"
                                                    )}>
                                                        {log.action_type.replace(/_/g, ' ')}
                                                    </div>
                                                    {extractEmail(log.details || '') && (
                                                        <p className="text-[9px] text-sage font-bold uppercase tracking-wider mt-1 truncate max-w-[150px]">
                                                            Target: {extractEmail(log.details || '')}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="font-serif text-sm text-charcoal">{extractAmount(log.details || '') ?? '—'}</p>
                                                </td>
                                                <td className="px-8 py-6 max-w-sm">
                                                    <div className="relative">
                                                        <p className={clsx(
                                                            "text-xs text-charcoal/60 leading-relaxed font-medium italic",
                                                            expandedId === log.id ? "" : "line-clamp-2"
                                                        )}>
                                                            {log.details ?? '—'}
                                                        </p>
                                                        {log.details && log.details.length > 80 && (
                                                            <button
                                                                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                                                className="text-[9px] font-black text-sage hover:text-charcoal uppercase tracking-widest mt-2 block"
                                                            >
                                                                {expandedId === log.id ? 'CLOSE DETAILS' : 'VIEW FULL TRACE'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    (paginated as Transaction[]).map(tx => (
                                        <tr key={tx.id} className="hover:bg-sage/5 transition-colors group">
                                            <td className="px-8 py-6 text-[10px] font-bold text-charcoal/60 whitespace-nowrap">
                                                {safeFormatDate(tx.date)}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={clsx(
                                                    "inline-flex px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                                                    tx.type === 'Booking' ? "bg-sage/10 text-sage border-sage/20" :
                                                        tx.type === 'Payout' ? "bg-gold/10 text-gold border-gold/20" :
                                                            "bg-purple-50 text-purple-700 border-purple-100"
                                                )}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="text-xs font-black text-charcoal uppercase tracking-widest">
                                                    {tx.type === 'Booking' ? `${tx.client} @ ${tx.studio}` : tx.type === 'Payout' ? (tx.studio !== '-' ? tx.studio : tx.instructor) : tx.client}
                                                </p>
                                                <p className="text-[9px] text-charcoal/50 font-bold uppercase mt-0.5">
                                                    {tx.type === 'Booking' ? tx.studio_email : (tx.type === 'Payout' ? (tx.studio !== '-' ? tx.studio_email : tx.instructor_email) : (tx.client_email || '-'))}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className={clsx("font-serif text-sm", tx.total_amount < 0 ? "text-red-500" : "text-charcoal")}>
                                                        ₱{(Number(tx.total_amount) || 0).toLocaleString()}
                                                </p>
                                            </td>
                                            <td className="px-8 py-6 font-serif text-sm text-blue-600">
                                                    {tx.platform_fee > 0 ? `₱${(Number(tx.platform_fee) || 0).toLocaleString()}` : <span className="text-charcoal/50">—</span>}
                                            </td>
                                            <td className="px-8 py-6 font-serif text-sm text-purple-600">
                                                    {tx.studio_fee > 0 ? `₱${(Number(tx.studio_fee) || 0).toLocaleString()}` : <span className="text-charcoal/50">—</span>}
                                            </td>
                                            <td className="px-8 py-6 font-serif text-sm text-indigo-600">
                                                    {tx.instructor_fee > 0 ? `₱${(Number(tx.instructor_fee) || 0).toLocaleString()}` : <span className="text-charcoal/50">—</span>}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-8 py-6 bg-stone-50/30 border-t border-stone-100">
                        <p className="text-[10px] font-black text-burgundy/40 uppercase tracking-[0.2em]">
                            INDEX {page} OF {totalPages} &nbsp;•&nbsp; {currentDisplayData.length} GLOBAL RECORDS
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                                disabled={page === 1}
                                className="p-3.5 rounded-xl border border-stone-200 bg-white/60 disabled:opacity-30 hover:bg-white hover:shadow-cloud transition-all active:scale-95"
                            >
                                <ChevronLeft className="w-4 h-4 text-burgundy" />
                            </button>
                            <button
                                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                                disabled={page === totalPages}
                                className="p-3.5 rounded-xl border border-stone-200 bg-white/60 disabled:opacity-30 hover:bg-white hover:shadow-cloud transition-all active:scale-95"
                            >
                                <ChevronRight className="w-4 h-4 text-burgundy" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
