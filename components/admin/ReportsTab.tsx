'use client'

import { useState, useMemo } from 'react'
import { Clock, Search, Download, ChevronLeft, ChevronRight, CheckCircle, XCircle, Activity, TrendingUp } from 'lucide-react'

type Log = {
    id: string
    action_type: string
    entity_type: string
    entity_id: string | null
    details: string
    created_at: string
    admin: { full_name: string; email: string } | { full_name: string; email: string }[] | null
}

const ACTION_CATEGORIES: Record<string, string> = {
    APPROVE_BOOKING: 'Booking',
    REJECT_BOOKING: 'Booking',
    APPROVE_PAYOUT: 'Payout',
    REJECT_PAYOUT: 'Payout',
    APPROVE_STUDIO_PAYOUT_SETUP: 'Payout',
    REJECT_STUDIO_PAYOUT_SETUP: 'Payout',
    APPROVE_TOP_UP: 'Wallet',
    REJECT_TOP_UP: 'Wallet',
    MANUAL_BALANCE_ADJUSTMENT: 'Wallet',
    APPROVE_CERTIFICATION: 'Certification',
    REJECT_CERTIFICATION: 'Certification',
    VERIFY_STUDIO: 'Studio',
    REJECT_STUDIO: 'Studio',
    REINSTATE_STUDIO: 'Studio',
    SETTLE_INSTRUCTOR_DEBT: 'Finance',
}

const CATEGORY_BADGE: Record<string, string> = {
    Booking: 'bg-blue-100 text-blue-700',
    Payout: 'bg-amber-100 text-amber-700',
    Wallet: 'bg-purple-100 text-purple-700',
    Certification: 'bg-teal-100 text-teal-700',
    Studio: 'bg-orange-100 text-orange-700',
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

export default function ReportsTab({ logs }: { logs: Log[] }) {
    const [search, setSearch] = useState('')
    const [actionFilter, setActionFilter] = useState('all')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [page, setPage] = useState(1)

    // ── Stats (computed from all logs, before filters) ──────────────────────
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek = logs.filter(l => new Date(l.created_at) >= weekAgo)
    const totalApprovals = logs.filter(l =>
        l.action_type.startsWith('APPROVE') || l.action_type.startsWith('VERIFY') || l.action_type === 'REINSTATE_STUDIO'
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
    const categories = useMemo(() => Array.from(new Set(logs.map(l => ACTION_CATEGORIES[l.action_type] || 'Other'))).sort(), [logs])

    // ── Filtered logs ────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
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

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const resetPage = () => setPage(1)

    // ── CSV Export ───────────────────────────────────────────────────────────
    function exportCSV() {
        const header = 'Date & Time,Admin,Admin Email,Category,Action,Details'
        const rows = filtered.map(l => {
            const { name, email } = getAdmin(l)
            const category = ACTION_CATEGORIES[l.action_type] || 'Other'
            const date = new Date(l.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
            const details = (l.details || '').replace(/,/g, ';').replace(/\n/g, ' ')
            return `"${date}","${name}","${email}","${category}","${l.action_type}","${details}"`
        })
        const csv = [header, ...rows].join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `admin-activity-log-${new Date().toISOString().split('T')[0]}.csv`
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

            {/* ── Filters + Log Table ───────────────────────────────────── */}
            <div className="bg-white border border-cream-200 rounded-xl shadow-sm overflow-hidden">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-cream-100">
                    <h2 className="text-lg font-medium text-charcoal-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-charcoal-400" />
                        Admin Activity Log
                        <span className="text-xs text-charcoal-400 font-normal ml-1">({filtered.length} of {logs.length})</span>
                    </h2>
                    <button
                        onClick={exportCSV}
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
                            placeholder="Search by name, email, or details…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); resetPage() }}
                            className="w-full pl-8 pr-3 py-1.5 text-xs border border-cream-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-charcoal-200"
                        />
                    </div>

                    {/* Category filter */}
                    <select
                        value={categoryFilter}
                        onChange={e => { setCategoryFilter(e.target.value); resetPage() }}
                        className="text-xs border border-cream-200 rounded-lg px-2.5 py-1.5 bg-white text-charcoal-700 focus:outline-none"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Action filter */}
                    <select
                        value={actionFilter}
                        onChange={e => { setActionFilter(e.target.value); resetPage() }}
                        className="text-xs border border-cream-200 rounded-lg px-2.5 py-1.5 bg-white text-charcoal-700 focus:outline-none"
                    >
                        <option value="all">All Actions</option>
                        {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                    </select>

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

                    {/* Clear */}
                    {(search || actionFilter !== 'all' || categoryFilter !== 'all' || dateFrom || dateTo) && (
                        <button
                            onClick={() => { setSearch(''); setActionFilter('all'); setCategoryFilter('all'); setDateFrom(''); setDateTo(''); resetPage() }}
                            className="text-xs text-charcoal-400 hover:text-charcoal-700 underline"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <p className="text-charcoal-500 text-sm p-6">No activity logs match your filters.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-cream-200 text-xs text-charcoal-500 uppercase tracking-wider">
                                    <th className="py-3 px-4 font-medium whitespace-nowrap">Date & Time</th>
                                    <th className="py-3 px-4 font-medium">Admin</th>
                                    <th className="py-3 px-4 font-medium">Category</th>
                                    <th className="py-3 px-4 font-medium">Action</th>
                                    <th className="py-3 px-4 font-medium">Amount</th>
                                    <th className="py-3 px-4 font-medium">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map(log => {
                                    const { name, email } = getAdmin(log)
                                    const category = ACTION_CATEGORIES[log.action_type] || 'Other'
                                    const categoryBadge = CATEGORY_BADGE[category]
                                    const isApproval = log.action_type.startsWith('APPROVE') || log.action_type.startsWith('VERIFY') || log.action_type === 'REINSTATE_STUDIO'
                                    const isRejection = log.action_type.startsWith('REJECT')
                                    const actionBadge = isApproval
                                        ? 'bg-green-100 text-green-700'
                                        : isRejection
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-charcoal-100 text-charcoal-700'
                                    const amount = extractAmount(log.details || '')

                                    return (
                                        <tr key={log.id} className="border-b border-cream-100 hover:bg-cream-50/40 transition-colors">
                                            <td className="py-3 px-4 text-charcoal-600 whitespace-nowrap text-xs">
                                                {new Date(log.created_at).toLocaleString('en-PH', {
                                                    timeZone: 'Asia/Manila',
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-medium text-charcoal-900 whitespace-nowrap text-xs">{name}</p>
                                                {email && <p className="text-charcoal-400 text-[10px]">{email}</p>}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${categoryBadge}`}>
                                                    {category}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${actionBadge}`}>
                                                    {log.action_type.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs font-mono text-charcoal-700 whitespace-nowrap">
                                                {amount ?? <span className="text-charcoal-300">—</span>}
                                            </td>
                                            <td className="py-3 px-4 text-xs text-charcoal-700 max-w-sm" title={log.details}>
                                                <span className="line-clamp-2">{log.details ?? '—'}</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-cream-100 bg-cream-50/30">
                        <p className="text-xs text-charcoal-500">
                            Page {page} of {totalPages} &nbsp;·&nbsp; {filtered.length} results
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-cream-200 disabled:opacity-40 hover:bg-cream-100 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                const pg = i + 1
                                return (
                                    <button
                                        key={pg}
                                        onClick={() => setPage(pg)}
                                        className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${page === pg ? 'bg-charcoal-900 text-white' : 'hover:bg-cream-100 text-charcoal-600'}`}
                                    >
                                        {pg}
                                    </button>
                                )
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-cream-200 disabled:opacity-40 hover:bg-cream-100 transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
