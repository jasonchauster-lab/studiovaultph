'use client'

import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
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
    Approvals: 'bg-green-100 text-green-700',
    Bookings: 'bg-blue-100 text-blue-700',
    Payouts: 'bg-amber-100 text-amber-700',
    Wallet: 'bg-purple-100 text-purple-700',
    Partners: 'bg-orange-100 text-orange-700',
    Finance: 'bg-rose-100 text-rose-700',
    Other: 'bg-gray-100 text-gray-600',
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
    function exportActivityCSV() {
        const header = 'Date & Time,Admin,Admin Email,Category,Action,Details'
        const rows = filteredLogs.map(l => {
            const { name, email } = getAdmin(l)
            const category = ACTION_CATEGORIES[l.action_type] || 'Other'
            const date = new Date(l.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
            const details = (l.details || '').replace(/,/g, ';').replace(/\n/g, ' ')
            return `"${date}","${name}","${email}","${category}","${l.action_type}","${details}"`
        })
        const csv = [header, ...rows].join('\n')
        downloadCSV(csv, 'admin-activity-log')
    }

    function exportFinancialCSV() {
        const header = 'Date & Time,Type,List,Studio Email,Instructor Email,Amount,Platform Fee,Studio Share,Instructor Share,Status'
        const rows = filteredTransactions.map(t => {
            const date = new Date(t.date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
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
        <div className="space-y-6">

            {/* ── Stats Cards ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-cream-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-charcoal-400" />
                        <span className="text-xs text-charcoal-500 uppercase tracking-wide font-medium">This Week</span>
                    </div>
                    <p className="text-2xl font-bold text-charcoal-900">{thisWeek.length}</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">actions in last 7 days</p>
                </div>
                <div className="bg-white border border-cream-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-charcoal-500 uppercase tracking-wide font-medium">Approvals</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">{totalApprovals}</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">total approvals / verifications</p>
                </div>
                <div className="bg-white border border-cream-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-charcoal-500 uppercase tracking-wide font-medium">Rejections</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{totalRejections}</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">total rejections</p>
                </div>
                <div className="bg-white border border-cream-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-charcoal-400" />
                        <span className="text-xs text-charcoal-500 uppercase tracking-wide font-medium">Top Admin</span>
                    </div>
                    <p className="text-sm font-bold text-charcoal-900 truncate">{topAdmin?.[0] ?? '—'}</p>
                    <p className="text-xs text-charcoal-400 mt-0.5">{topAdmin?.[1] ?? 0} actions</p>
                </div>
            </div>

            {/* ── Sub-tab Toggle ────────────────────────────────────────── */}
            <div className="flex border-b border-cream-200 gap-6">
                <button
                    onClick={() => { setActiveSubtab('activity'); resetPage() }}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeSubtab === 'activity' ? 'text-charcoal-900' : 'text-charcoal-400 hover:text-charcoal-600'}`}
                >
                    Admin Activity Log
                    {activeSubtab === 'activity' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal-900"></div>}
                </button>
                <button
                    onClick={() => { setActiveSubtab('transactions'); resetPage() }}
                    className={`pb-3 text-sm font-medium transition-colors relative ${activeSubtab === 'transactions' ? 'text-charcoal-900' : 'text-charcoal-400 hover:text-charcoal-600'}`}
                >
                    Financial Transactions
                    {activeSubtab === 'transactions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal-900"></div>}
                </button>
            </div>

            {/* ── Filters + Content ───────────────────────────────────── */}
            <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-cream-100">
                    <h2 className="text-lg font-medium text-charcoal-900 flex items-center gap-2">
                        {activeSubtab === 'activity' ? <Clock className="w-5 h-5 text-charcoal-400" /> : <TrendingUp className="w-5 h-5 text-charcoal-400" />}
                        {activeSubtab === 'activity' ? 'Activity Log' : 'Financial Transactions'}
                        <span className="text-xs text-charcoal-400 font-normal ml-1">({currentDisplayData.length} total)</span>
                    </h2>
                    <button
                        onClick={activeSubtab === 'activity' ? exportActivityCSV : exportFinancialCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-charcoal-900 text-cream-50 text-xs rounded-lg hover:bg-charcoal-700 transition-colors font-medium"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </button>
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap gap-3 p-4 border-b border-cream-100 bg-cream-50/50">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
                        <input
                            type="text"
                            placeholder="Search…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); resetPage() }}
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-cream-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-charcoal-200"
                        />
                    </div>

                    {activeSubtab === 'activity' ? (
                        <>
                            <select
                                value={categoryFilter}
                                onChange={e => { setCategoryFilter(e.target.value); resetPage() }}
                                className="text-xs border border-cream-200 rounded-lg px-2.5 py-1.5 bg-white text-charcoal-700 focus:outline-none"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select
                                value={actionFilter}
                                onChange={e => { setActionFilter(e.target.value); resetPage() }}
                                className="text-xs border border-cream-200 rounded-lg px-2.5 py-1.5 bg-white text-charcoal-700 focus:outline-none"
                            >
                                <option value="all">All Actions</option>
                                {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                            </select>
                        </>
                    ) : (
                        <select
                            value={txTypeFilter}
                            onChange={e => { setTxTypeFilter(e.target.value); resetPage() }}
                            className="text-xs border border-cream-200 rounded-lg px-2.5 py-1.5 bg-white text-charcoal-700 focus:outline-none"
                        >
                            <option value="all">All Transactions</option>
                            <option value="Booking">Bookings</option>
                            <option value="Top-up">Top-ups</option>
                            <option value="Payout">Payouts</option>
                            <option value="Platform Fees">Platform Fees Only</option>
                            <option value="Studio Share">Studio Share Only</option>
                            <option value="Instructor Share">Instructor Share Only</option>
                        </select>
                    )}

                    {/* Date range */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-charcoal-500">From</span>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); resetPage() }}
                            className="text-xs border border-cream-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                        />
                        <span className="text-xs text-charcoal-500">To</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); resetPage() }}
                            className="text-xs border border-cream-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                        />
                    </div>

                    {(search || actionFilter !== 'all' || categoryFilter !== 'all' || txTypeFilter !== 'all' || dateFrom || dateTo) && (
                        <button
                            onClick={() => { setSearch(''); setActionFilter('all'); setCategoryFilter('all'); setTxTypeFilter('all'); setDateFrom(''); setDateTo(''); resetPage() }}
                            className="text-xs text-charcoal-400 hover:text-charcoal-700 underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Table Content */}
                {paginated.length === 0 ? (
                    <p className="text-charcoal-500 text-sm p-6">No records match your filters.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                {activeSubtab === 'activity' ? (
                                    <tr className="border-b border-cream-200 text-xs text-charcoal-500 uppercase tracking-wider">
                                        <th className="py-3 px-4 font-medium whitespace-nowrap">Date & Time</th>
                                        <th className="py-3 px-4 font-medium">Admin</th>
                                        <th className="py-3 px-4 font-medium">Category</th>
                                        <th className="py-3 px-4 font-medium">Action</th>
                                        <th className="py-3 px-4 font-medium">Amount</th>
                                        <th className="py-3 px-4 font-medium">Details</th>
                                    </tr>
                                ) : (
                                    <tr className="border-b border-cream-200 text-xs text-charcoal-500 uppercase tracking-wider">
                                        <th className="py-3 px-4 font-medium whitespace-nowrap">Date & Time</th>
                                        <th className="py-3 px-4 font-medium">Type</th>
                                        <th className="py-3 px-4 font-medium">List</th>
                                        <th className="py-3 px-4 font-medium">Studio Email</th>
                                        <th className="py-3 px-4 font-medium">Instructor Email</th>
                                        <th className="py-3 px-4 font-medium">Total</th>
                                        <th className="py-3 px-4 font-medium text-blue-600">Fee</th>
                                        <th className="py-3 px-4 font-medium text-purple-600">Studio Fee</th>
                                        <th className="py-3 px-4 font-medium text-indigo-600">Instructor Fee</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {activeSubtab === 'activity' ? (
                                    (paginated as Log[]).map(log => {
                                        const { name, email } = getAdmin(log)
                                        const category = ACTION_CATEGORIES[log.action_type] || 'Other'
                                        const isApproval = log.action_type.startsWith('APPROVE') || log.action_type.startsWith('VERIFY') || log.action_type === 'REINSTATE_STUDIO'
                                        const isRejection = log.action_type.startsWith('REJECT')
                                        return (
                                            <tr key={log.id} className="border-b border-cream-100 hover:bg-cream-50/40 transition-colors">
                                                <td className="py-3 px-4 text-charcoal-600 whitespace-nowrap text-xs">
                                                    {new Date(log.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <p className="font-medium text-charcoal-900 whitespace-nowrap text-xs">{name}</p>
                                                    {email && <p className="text-charcoal-400 text-[10px]">{email}</p>}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${CATEGORY_BADGE[category]}`}>
                                                        {category}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${isApproval ? 'bg-green-100 text-green-700' : isRejection ? 'bg-red-100 text-red-700' : 'bg-charcoal-100 text-charcoal-700'}`}>
                                                        {log.action_type.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-xs font-mono text-charcoal-700">
                                                    {extractAmount(log.details || '') ?? '—'}
                                                </td>
                                                <td className="py-3 px-4 text-xs text-charcoal-700 max-w-sm">
                                                    <div className="relative group">
                                                        <span className={expandedId === log.id ? "break-words" : "line-clamp-2"}>{log.details ?? '—'}</span>
                                                        {log.details && log.details.length > 80 && (
                                                            <button onClick={() => setExpandedId(expandedId === log.id ? null : log.id)} className="text-blue-600 hover:text-blue-800 font-medium ml-1 inline-flex items-center gap-0.5">
                                                                {expandedId === log.id ? 'Less' : 'More'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    (paginated as Transaction[]).map(tx => (
                                        <tr key={tx.id} className="border-b border-cream-100 hover:bg-sage/5 transition-colors">
                                            <td className="py-3 px-4 text-charcoal-600 whitespace-nowrap text-xs">
                                                {new Date(tx.date).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap tracking-wider uppercase ${tx.type === 'Booking' ? 'bg-sage-light/20 text-charcoal' :
                                                    tx.type === 'Payout' ? 'bg-gold/20 text-charcoal' :
                                                        'bg-purple-100/50 text-purple-900'
                                                    }`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-medium text-charcoal-900 text-xs">
                                                    {tx.type === 'Booking' ? `${tx.client} @ ${tx.studio}` : tx.type === 'Payout' ? (tx.studio !== '-' ? tx.studio : tx.instructor) : tx.client}
                                                </p>
                                            </td>
                                            <td className="py-3 px-4 text-xs text-charcoal-600">
                                                {tx.type === 'Booking' ? tx.studio_email : (tx.type === 'Payout' && tx.studio !== '-' ? tx.instructor_email : '-')}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-charcoal-600">
                                                {tx.type === 'Booking' ? tx.instructor_email : (tx.type === 'Payout' && tx.studio === '-' ? tx.instructor_email : '-')}
                                            </td>
                                            <td className={`py-3 px-4 font-mono text-xs font-bold ${tx.total_amount < 0 ? 'text-red-500' : 'text-charcoal-900'}`}>
                                                ₱{tx.total_amount.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs text-blue-600">
                                                {tx.platform_fee > 0 ? `₱${tx.platform_fee.toLocaleString()}` : <span className="text-charcoal-300">—</span>}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs text-purple-600">
                                                {tx.studio_fee > 0 ? `₱${tx.studio_fee.toLocaleString()}` : <span className="text-charcoal-300">—</span>}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-xs text-indigo-600">
                                                {tx.instructor_fee > 0 ? `₱${tx.instructor_fee.toLocaleString()}` : <span className="text-charcoal-300">—</span>}
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
                    <div className="flex items-center justify-between px-5 py-3 border-t border-cream-100 bg-cream-50/30">
                        <p className="text-xs text-charcoal-500">
                            Page {page} of {totalPages} &nbsp;·&nbsp; {currentDisplayData.length} results
                        </p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-cream-200 disabled:opacity-40 hover:bg-cream-100 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-cream-200 disabled:opacity-40 hover:bg-cream-100 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
