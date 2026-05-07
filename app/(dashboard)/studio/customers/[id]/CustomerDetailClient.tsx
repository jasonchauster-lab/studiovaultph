'use client'

import React, { useState, useEffect } from 'react'
import { sanitizeHtml } from '@/lib/utils/security'
import { 
    Mail, Phone, Calendar, 
    ChevronRight, MoreVertical, 
    Download, Plus, Search, ChevronDown,
    Filter, LayoutGrid, CheckCircle2,
    XCircle, Clock, TrendingUp,
    FileText, User, Settings as SettingsIcon,
    History, Package, Ticket, AlertCircle,
    Wallet, Loader2
} from 'lucide-react'
import Avatar from '@/components/shared/Avatar'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import NotesTab from '@/components/studio/customers/NotesTab'
import GalleryTab from '@/components/studio/customers/GalleryTab'


interface CustomerDetailClientProps {
    profile: any
    bookings: any[]
    totalSpending: number
    studio: any
    membership: any
    packages?: any[]
    memberships?: any[]
    walletTransactions?: any[]
}

const TABS = [
    'Overview', 'Profile', 'Wallet', 'Attendance', 'Events', 
    'Packages', 'Memberships', 'Transactions', 'Waiver', 
    'Notes', 'Gallery', 'Forms', 'Settings'
]

export default function CustomerDetailClient({ 
    profile, 
    bookings, 
    totalSpending, 
    studio, 
    membership,
    packages = [],
    memberships = [],
    walletTransactions = []
}: CustomerDetailClientProps) {
    const [activeTab, setActiveTab] = useState('Overview')

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Header / Hero Section matched to screenshot */}
            <div className="flex flex-col xl:flex-row gap-8 items-start">
                <div className="flex flex-col sm:flex-row gap-6 items-start flex-1 min-w-0">
                    <Avatar 
                        src={profile.avatar_url} 
                        fallbackName={profile.full_name} 
                        size={120}
                        className="rounded-3xl shadow-xl ring-1 ring-zinc-100"
                    />
                    <div className="space-y-4 min-w-0">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-[32px] font-black text-zinc-900 tracking-tight leading-none">
                                    {profile.full_name}
                                </h1>
                            </div>
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                                Joined on {profile.created_at ? format(new Date(profile.created_at), 'dd MMM yyyy') : '—'}
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-6">
                            <div className="flex items-center gap-2 text-sm font-bold text-zinc-600">
                                <Phone className="w-4 h-4 text-zinc-300" />
                                {profile.phone || 'No phone'}
                            </div>
                            <div className="flex items-center gap-2 text-sm font-bold text-zinc-600">
                                <Mail className="w-4 h-4 text-zinc-300" />
                                {profile.email}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {bookings.length <= 3 && bookings.length > 0 && (
                                <span className="px-2.5 py-1 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-md leading-none">
                                    Newcomer
                                </span>
                            )}
                            {bookings.length >= 10 && (
                                <span className="px-2.5 py-1 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-md leading-none">
                                    Power User
                                </span>
                            )}
                            {(bookings.length === 0 || (bookings[0] && (new Date().getTime() - new Date(bookings[0].slots?.date).getTime()) > 30 * 24 * 60 * 60 * 1000)) && (
                                <span className="px-2.5 py-1 bg-zinc-900 text-white text-[9px] font-black uppercase tracking-widest rounded-md leading-none">
                                    Lost Member
                                </span>
                            )}
                            <span className="px-2.5 py-1 bg-emerald-400 text-white text-[9px] font-black uppercase tracking-widest rounded-md leading-none">
                                Active
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid matched to screenshot */}
                <div className="w-full xl:w-[600px] grid grid-cols-3 bg-[#2D3282] rounded-[2rem] p-1 shadow-2xl shadow-[#2D3282]/20">
                    <div className="p-8 border-r border-[#ffffff10] space-y-2">
                         <div className="flex items-baseline gap-1">
                            <span className="text-white/40 text-[18px] font-black">₱</span>
                            <span className="text-white text-[32px] font-black tracking-tight leading-none">
                                {totalSpending.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#ffffff40]" />
                            <span className="text-[10px] font-black text-[#ffffff60] uppercase tracking-widest">Total spending</span>
                        </div>
                    </div>
                    
                    <div className="p-8 border-r border-[#ffffff10] space-y-2">
                        <span className="block text-white text-[32px] font-black tracking-tight leading-none">
                            {bookings.length}
                        </span>
                         <div className="flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4 text-[#ffffff40]" />
                            <span className="text-[10px] font-black text-[#ffffff60] uppercase tracking-widest">Total booking</span>
                        </div>
                    </div>

                    <div className="p-8 space-y-2">
                        <span className="block text-white text-[32px] font-black tracking-tight leading-none">
                            0
                        </span>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#ffffff40]" />
                            <span className="text-[10px] font-black text-[#ffffff60] uppercase tracking-widest">Class attended</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub Navigation Tabs matched to screenshot */}
            <div className="flex items-center border-b border-zinc-100 scrollbar-hide overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                            "px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative whitespace-nowrap",
                            activeTab === tab ? "text-[#2D3282]" : "text-zinc-400 hover:text-zinc-600"
                        )}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-[#2D3282] rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content matched to screenshots */}
            <div className="min-h-[400px]">
                {activeTab === 'Overview' && <OverviewTab bookings={bookings} totalSpending={totalSpending} packages={packages} />}
                {activeTab === 'Profile' && <ProfileTab profile={profile} />}
                {activeTab === 'Wallet' && (
                    <WalletTab 
                        profile={profile} 
                        studio={studio} 
                        membership={membership} 
                        transactions={walletTransactions}
                    />
                )}
                {activeTab === 'Attendance' && <AttendanceTab bookings={bookings} studio={studio} />}
                {activeTab === 'Events' && <EventsTab />}
                {activeTab === 'Packages' && <PackagesTab packages={packages} />}
                {activeTab === 'Memberships' && <MembershipsTab memberships={memberships} />}
                {activeTab === 'Transactions' && (
                    <TransactionsTab 
                        bookings={bookings} 
                        packages={packages} 
                        memberships={memberships} 
                        walletTransactions={walletTransactions}
                    />
                )}
                {activeTab === 'Waiver' && <WaiverTab profile={profile} studio={studio} />}
                {activeTab === 'Notes' && <NotesTab clientId={profile.id} studioId={studio?.id} />}
                {activeTab === 'Gallery' && <GalleryTab clientId={profile.id} studioId={studio?.id} />}
                {activeTab === 'Forms' && <FormsTab profile={profile} />}
                {activeTab === 'Settings' && <SettingsTab />}
            </div>
        </div>
    )
}

function OverviewTab({ bookings, totalSpending, packages }: { bookings: any[], totalSpending: number, packages: any[] }) {
    const stats = [
        { label: 'Total Spending', val: `₱${totalSpending.toLocaleString()}`, icon: TrendingUp, sub: 'Lifetime value', subColor: 'text-emerald-600' },
        { label: 'Total Bookings', val: bookings.length.toString(), icon: History, sub: 'All time', subColor: 'text-emerald-600' },
        { label: 'Total Refunds', val: '0', icon: Ticket, sub: null, subColor: '' },
        { label: 'Active Packages', val: packages.length.toString(), icon: Package, sub: null, subColor: '' },
    ]
    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Top Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {stats.map((s, i) => (
                    <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-zinc-50 shadow-sm flex flex-col items-center justify-center space-y-4 text-center group hover:shadow-xl transition-all">
                        <div className="flex items-center gap-3">
                            <s.icon className="w-4 h-4 text-zinc-300" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{s.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-[44px] font-black text-zinc-900 tracking-tight">{s.val}</h2>
                            {s.sub && (
                                <span className={clsx("text-[10px] font-black px-2 py-0.5 rounded bg-emerald-50", s.subColor)}>
                                    {s.sub}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Area Shell matched to screenshot style */}
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-zinc-900 tracking-tight">
                        From {format(new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000), 'dd MMM yyyy')} to {format(new Date(), 'dd MMM yyyy')}
                    </h3>
                    <button className="flex items-center gap-2 px-6 py-2 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm">
                        Last 7 days
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm space-y-12">
                     <h3 className="text-lg font-black text-zinc-900 tracking-tight">Total spending</h3>
                     <div className="h-[300px] w-full relative">
                        {/* Area Chart Path matched to screenshot */}
                        <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#d48c2c" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#d48c2c" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            {/* Horizontal Grid Lines */}
                            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                                <line key={i} x1="0" y1={50 * i} x2="1000" y2={50 * i} stroke="#f0f0f0" strokeDasharray="4 4" />
                            ))}
                            {/* The Area */}
                            <path d="M 0 280 L 166 280 L 332 280 L 498 280 L 664 280 L 830 280 L 996 20 Z L 996 280 L 0 280 Z" fill="url(#chartGradient)" />
                            {/* The Line */}
                            <path d="M 0 280 L 166 280 L 332 280 L 498 280 L 664 280 L 830 280 L 996 20" fill="none" stroke="#d48c2c" strokeWidth="2" strokeLinejoin="round" />
                            {/* Dots */}
                            {[0, 166, 332, 498, 664, 830, 996].map((x, i) => (
                                <circle key={i} cx={x} cy={i === 6 ? 20 : 280} r="4" fill="white" stroke="#666" strokeWidth="1" />
                            ))}
                        </svg>
                        {/* X Axis Labels */}
                        <div className="flex justify-between mt-4">
                            {['04/04/2026', '05/04/2026', '06/04/2026', '07/04/2026', '08/04/2026', '09/04/2026', '10/04/2026'].map(d => (
                                <span key={d} className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{d}</span>
                            ))}
                        </div>
                     </div>
                </div>
            </div>
        </div>
    )
}

function ProfileTab({ profile }: { profile: any }) {
    return (
        <div className="max-w-4xl animate-in fade-in duration-700">
            {/* Profile Info Card */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-10">
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Gender</span>
                        <p className="text-sm font-bold text-zinc-600">Female</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Date of birth</span>
                        <p className="text-sm font-bold text-zinc-600">30 Aug 1998</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em]">Age</span>
                        <p className="text-sm font-bold text-zinc-600">27</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function WalletTab({ profile, studio, membership, transactions = [] }: { profile: any, studio: any, membership: any, transactions?: any[] }) {
    const [amount, setAmount] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [adjMessage, setAdjMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleAdjust = async (type: 'add' | 'remove') => {
        if (!amount || isNaN(Number(amount))) {
            setAdjMessage({ type: 'error', text: 'Please enter a valid amount' })
            return
        }
        setLoading(true)
        setAdjMessage(null)

        try {
            const { adjustStudioCustomerBalance } = await import('@/app/(dashboard)/studio/settings/wallet/actions')
            const result = await adjustStudioCustomerBalance(profile.id, studio.id, Number(amount), type, reason)
            
            if (result.success) {
                setAdjMessage({ type: 'success', text: `Successfully ${type === 'add' ? 'added' : 'removed'} ₱${amount} from customer's studio balance.` })
                setAmount('')
                setReason('')
            } else {
                setAdjMessage({ type: 'error', text: result.error || 'Failed to adjust balance' })
            }
        } catch (err) {
            setAdjMessage({ type: 'error', text: 'An unexpected error occurred' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-700 max-w-4xl">
            {/* Context Header */}
            <div className="bg-amber-50 md:p-10 p-6 rounded-[2.5rem] border border-amber-100/50 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 text-amber-500/10 group-hover:scale-110 transition-transform duration-700">
                    <Wallet className="w-40 h-40 -mr-10 -mt-10" />
                </div>
                
                <div className="flex-1 space-y-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-200/50 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <h3 className="text-xl font-black text-amber-900 tracking-tight">Isolated Studio Wallet</h3>
                    </div>
                    <p className="text-amber-800/70 text-sm font-bold leading-relaxed max-w-xl">
                        This wallet is strictly tied to <span className="text-amber-900 font-black">{studio?.name || 'this studio'}</span>. 
                        Balances here cannot be used for marketplace bookings or at other studios. 
                        Adjustments made here will not affect the customer's global StudioVault credits.
                    </p>
                </div>
            </div>

            {/* Balances Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="w-4 h-4 text-zinc-300" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Available Balance</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-zinc-400 text-xl font-black">₱</span>
                        <h2 className="text-[44px] font-black text-zinc-900 tracking-tight leading-none">
                            {(membership?.available_balance || 0).toLocaleString()}
                        </h2>
                    </div>
                </div>

                <div className="bg-zinc-50/50 p-10 rounded-[2.5rem] border border-zinc-100 space-y-4 opacity-60">
                    <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-zinc-300" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pending Clearings</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-zinc-400 text-xl font-black">₱</span>
                        <h2 className="text-[44px] font-black text-zinc-900 tracking-tight leading-none">
                            {(membership?.pending_balance || 0).toLocaleString()}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Adjuster Tool */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-10">
                <div>
                    <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Balance Adjustment Tool</h3>
                    <p className="text-sm font-bold text-zinc-400 mt-2">Manually manage this customer's studio credits.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-zinc-50">
                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Amount (PHP)</label>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00" 
                                className="w-full px-6 py-4 bg-zinc-50 border-none rounded-2xl text-lg font-black text-zinc-900 placeholder:text-zinc-300 focus:ring-2 focus:ring-[#2D3282]/10 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Internal Note / Reason</label>
                            <input 
                                type="text" 
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="E.g. Referral reward, Manual refund" 
                                className="w-full px-6 py-4 bg-white border border-zinc-100 rounded-2xl text-sm font-bold text-zinc-600 outline-none focus:ring-2 focus:ring-[#2D3282]/10 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 justify-end">
                        {adjMessage && (
                            <div className={clsx(
                                "p-5 rounded-2xl text-[11px] font-black uppercase tracking-widest border animate-in fade-in slide-in-from-bottom-2",
                                adjMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                            )}>
                                {adjMessage.text}
                            </div>
                        )}
                        <div className="flex gap-4">
                            <button 
                                onClick={() => handleAdjust('remove')}
                                disabled={loading}
                                className="flex-1 py-4 bg-white border border-rose-100 text-rose-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Deduct Credits'}
                            </button>
                            <button 
                                onClick={() => handleAdjust('add')}
                                disabled={loading}
                                className="flex-2 py-4 bg-[#2D3282] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#2D3282]/20 hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Add Credits'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Wallet History */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-10">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-zinc-900 tracking-tight uppercase tracking-widest">Recent Wallet History</h3>
                </div>
                <div className="divide-y divide-zinc-50">
                    {transactions.length > 0 ? (
                        transactions.map((tx, i) => (
                            <div key={i} className="py-6 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                        tx.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                    )}>
                                        {tx.amount > 0 ? <Plus className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 rotate-90" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-zinc-900">{tx.description}</span>
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                            {format(new Date(tx.created_at), 'dd MMM yyyy · hh:mm aa')}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={clsx(
                                        "text-lg font-black",
                                        tx.amount > 0 ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} ₱
                                    </span>
                                    <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{tx.type}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="py-10 text-center text-sm font-bold text-zinc-400 italic">No wallet activity recorded yet.</p>
                    )}
                </div>
            </div>
        </div>
    )
}

function AttendanceTab({ bookings, studio }: { bookings: any[], studio: any }) {
    const categories = ['Class', 'Appointment', 'Course', 'Access']
    const [activeCategory, setActiveCategory] = useState('Class')

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
             {/* Category Switcher matched to screenshot */}
            <div className="flex bg-white p-1 rounded-2xl border border-zinc-100 shadow-sm w-full md:w-auto self-start">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={clsx(
                            "px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            activeCategory === cat ? "bg-[#2D3282] text-white shadow-lg shadow-[#2D3282]/20" : "text-zinc-500 hover:bg-zinc-50"
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Filter Bar matched to screenshot */}
            <div className="flex flex-wrap items-center gap-3">
                 <div className="relative flex-1 md:max-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <input 
                        type="text"
                        placeholder="Search by class name"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5"
                    />
                </div>
                {['Till date', 'All locations', 'Select staff', 'All status', 'All pricing plan'].map(f => (
                    <button key={f} className="flex items-center gap-2 px-6 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm">
                        {f} <ChevronDown className="w-4 h-4 text-zinc-300" />
                    </button>
                ))}
            </div>

            {/* Attendance Table Shell matched to screenshot */}
            <div className="bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-200">
                    <div className="min-w-[1200px]">
                        <div className="px-10 py-5 bg-zinc-50/50 border-b border-zinc-100 grid grid-cols-10 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            <div className="col-span-1">Booked on</div>
                            <div className="col-span-1">Ref no.</div>
                            <div className="col-span-1">Class Date</div>
                            <div className="col-span-2">Class name</div>
                            <div className="col-span-1">Location</div>
                            <div className="col-span-1">Staff</div>
                            <div className="col-span-1">Payment</div>
                            <div className="col-span-1">Status</div>
                            <div className="col-span-1"></div>
                        </div>
                        <div className="divide-y divide-zinc-50">
                            {bookings.map((b, i) => (
                                <div key={i} className="px-10 py-6 grid grid-cols-10 items-center gap-4 hover:bg-zinc-50/50 transition-all">
                                     <div className="col-span-1 flex flex-col">
                                        <span className="text-xs font-black text-zinc-900">{format(new Date(b.created_at), 'dd MMM yyyy')}</span>
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{format(new Date(b.created_at), 'hh:mm aa')}</span>
                                    </div>
                                    <span className="col-span-1 text-xs font-bold text-[#2D3282] tracking-tighter uppercase">{b.id.substring(0, 8)}</span>
                                    <div className="col-span-1 flex flex-col">
                                        <span className="text-xs font-black text-zinc-900">{format(new Date(b.slots?.date), 'dd MMM yyyy')}</span>
                                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{b.slots?.start_time || '8:00 AM'}</span>
                                    </div>
                                    <span className="col-span-2 text-xs font-bold text-zinc-600 truncate pr-4">
                                        {b.slots?.name || (b.origin === 'marketplace' ? 'StudioVault Marketplace' : 'Untitled Class')}
                                    </span>
                                    <span className="col-span-1 text-xs font-bold text-zinc-400 italic">{studio?.name || 'StudioVault PH'}</span>
                                    <span className="col-span-1 text-xs font-bold text-zinc-600">
                                        {b.slots?.instructor?.full_name || 'No staff'}
                                    </span>
                                    <div className="col-span-1 flex flex-col">
                                        <span className="text-xs font-bold text-zinc-900 italic">1 Group Class</span>
                                        <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest leading-none">0/1 left</span>
                                    </div>
                                     <div className="col-span-1">
                                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded leading-none ${
                                            b.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                            b.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                            b.status === 'completed' ? 'bg-indigo-100 text-indigo-600' :
                                            'bg-rose-100 text-rose-600'
                                        }`}>
                                            {b.status === 'approved' ? 'Paid' : b.status || 'Booked'}
                                        </span>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <button className="text-zinc-300 hover:text-zinc-900"><MoreVertical className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function EventsTab() {
    return (
        <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-700 bg-white border border-zinc-100 rounded-[3rem] shadow-sm">
            <span className="text-4xl mb-4">🤔</span>
            <h3 className="text-lg font-black text-zinc-900 tracking-tight">No courses yet.</h3>
            <button className="mt-2 text-[#2D3282] text-sm font-black uppercase tracking-widest hover:underline underline-offset-4">
                Create course
            </button>
        </div>
    )
}

function PackagesTab({ packages }: { packages: any[] }) {
     return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-wrap items-center gap-3">
                 <div className="relative flex-1 md:max-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <input 
                        type="text"
                        placeholder="Search by package name"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5"
                    />
                </div>
                {['All locations', 'All groups', 'All status'].map(f => (
                    <button key={f} className="flex items-center gap-2 px-6 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm">
                        {f} <ChevronDown className="w-4 h-4 text-zinc-300" />
                    </button>
                ))}
                <button className="ml-auto flex items-center gap-2 px-8 py-3 bg-[#2D3282] text-white rounded-full text-xs font-black shadow-lg shadow-[#2D3282]/10 uppercase tracking-widest">
                    <Plus className="w-4 h-4 stroke-[3]" /> Add Package
                </button>
            </div>

            <div className="bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-200">
                    <div className="min-w-[1200px]">
                        <div className="px-10 py-5 bg-zinc-50/50 border-b border-zinc-100 grid grid-cols-10 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            <div className="col-span-1">Date added</div>
                            <div className="col-span-2">Package name</div>
                            <div className="col-span-1">Credit balance</div>
                            <div className="col-span-1">Start date</div>
                            <div className="col-span-1">End date</div>
                            <div className="col-span-1">Bookings</div>
                            <div className="col-span-2">PO no.</div>
                            <div className="col-span-1">Status</div>
                        </div>
                        <div className="divide-y divide-zinc-50">
                            {packages.length > 0 ? (
                                packages.map((pkg, i) => (
                                    <div key={i} className="px-10 py-6 grid grid-cols-10 items-center gap-4 hover:bg-zinc-50/50 transition-all">
                                        <span className="col-span-1 text-xs font-bold text-zinc-600">{format(new Date(pkg.created_at), 'dd MMM yyyy')}</span>
                                        <span className="col-span-2 text-xs font-bold text-zinc-900">{pkg.package_name || 'Class Package'}</span>
                                        <span className="col-span-1 text-xs font-bold text-zinc-400 uppercase">{pkg.remaining_credits}/{pkg.total_credits} left</span>
                                        <div className="col-span-1 flex flex-col">
                                            <span className="text-xs font-black text-zinc-900">{pkg.start_date ? format(new Date(pkg.start_date), 'dd MMM yyyy') : '---'}</span>
                                        </div>
                                        <span className="col-span-1 text-xs font-bold text-zinc-600">{pkg.expiry_date ? format(new Date(pkg.expiry_date), 'dd MMM yyyy') : '---'}</span>
                                        <span className="col-span-1 text-xs font-bold text-[#2D3282] underline cursor-pointer">View</span>
                                        <span className="col-span-2 text-xs font-bold text-[#2D3282] tracking-tighter uppercase">{pkg.id.substring(0, 8)}</span>
                                        <div className="col-span-1 flex items-center justify-between">
                                            <span className={clsx(
                                                "inline-flex px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded leading-none",
                                                pkg.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                                            )}>
                                                {pkg.status}
                                            </span>
                                            <button className="text-zinc-300"><MoreVertical className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-20 text-center">
                                    <p className="text-sm font-bold text-zinc-400 italic">No packages found for this customer</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function MembershipsTab({ memberships }: { memberships: any[] }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between px-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Memberships</h3>
                <button className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">
                    Assign Membership
                </button>
            </div>

            <div className="bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[1000px]">
                        <div className="px-10 py-5 bg-zinc-50/50 border-b border-zinc-100 grid grid-cols-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            <div className="col-span-1">Joined</div>
                            <div className="col-span-2">Membership</div>
                            <div className="col-span-1">Cycle</div>
                            <div className="col-span-1">Next Bill</div>
                            <div className="col-span-1">Wallet</div>
                            <div className="col-span-1">Status</div>
                            <div className="col-span-1"></div>
                        </div>
                        <div className="divide-y divide-zinc-50">
                            {memberships.length > 0 ? (
                                memberships.map((m, i) => (
                                    <div key={i} className="px-10 py-6 grid grid-cols-8 items-center gap-4 hover:bg-zinc-50/50 transition-all">
                                        <span className="col-span-1 text-xs font-bold text-zinc-600">{format(new Date(m.created_at), 'dd MMM yyyy')}</span>
                                        <span className="col-span-2 text-xs font-bold text-zinc-900">{m.membership_name || 'Studio Membership'}</span>
                                        <span className="col-span-1 text-xs font-bold text-zinc-400 italic">Monthly</span>
                                        <span className="col-span-1 text-xs font-bold text-zinc-600">---</span>
                                        <span className="col-span-1 text-xs font-black text-emerald-600">₱{m.balance?.toLocaleString() || '0'}</span>
                                        <div className="col-span-1 flex items-center justify-between">
                                            <span className="inline-flex px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded leading-none">
                                                Active
                                            </span>
                                            <button className="text-zinc-300"><MoreVertical className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-20 text-center">
                                    <p className="text-sm font-bold text-zinc-400 italic">No active memberships found</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


function TransactionsTab({ 
    bookings, 
    packages = [], 
    memberships = [],
    walletTransactions = []
}: { 
    bookings: any[], 
    packages?: any[], 
    memberships?: any[],
    walletTransactions?: any[]
}) {
    // 1. Paid Bookings
    const paidBookings = bookings
        .filter(b => b.price_breakdown?.studio_fee > 0)
        .map(b => ({
            id: b.id,
            date: b.created_at,
            item: b.slots?.name || (b.origin === 'marketplace' ? 'StudioVault Marketplace' : 'Untitled Class'),
            type: 'Class',
            method: b.payment_method || 'Xendit',
            price: b.price_breakdown?.studio_fee,
            amount: b.price_breakdown?.studio_fee,
            status: 'Paid'
        }))

    // 2. Paid Plans (Packages)
    const paidPackages = packages
        .filter(p => p.total_amount > 0 && (p.status === 'active' || p.status === 'completed'))
        .map(p => ({
            id: p.id,
            date: p.created_at,
            item: p.package_name,
            type: 'Package',
            method: p.payment_method === 'manual' ? 'Manual Approval' : 'Xendit',
            price: p.total_amount,
            amount: p.total_amount,
            status: 'Paid'
        }))

    // 3. Paid Memberships
    const paidMemberships = memberships
        .filter(m => m.total_amount > 0 && (m.status === 'active' || m.status === 'completed'))
        .map(m => ({
            id: m.id,
            date: m.created_at,
            item: m.membership_name,
            type: 'Membership',
            method: m.payment_method === 'manual' ? 'Manual Approval' : 'Xendit',
            price: m.total_amount,
            amount: m.total_amount,
            status: 'Paid'
        }))

    // 4. Wallet Transactions (Adjustments)
    const walletAdjustments = walletTransactions.map(tx => ({
        id: tx.id,
        date: tx.created_at,
        item: tx.description || (tx.amount > 0 ? 'Balance Credit' : 'Balance Deduction'),
        type: 'Wallet',
        method: 'Adjustment',
        price: Math.abs(tx.amount),
        amount: Math.abs(tx.amount),
        status: tx.amount > 0 ? 'Credit' : 'Debit'
    }))

    // Unified & Sorted List
    const allTransactions = [...paidBookings, ...paidPackages, ...paidMemberships, ...walletAdjustments]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between px-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Payment History</h3>
                <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                >
                    <Download className="w-3.5 h-3.5" />
                    Download CSV
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 px-6">
                 <div className="relative flex-1 md:max-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                    <input 
                        type="text"
                        placeholder="Search by transaction number"
                        className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5"
                    />
                </div>
                <div className="flex items-center gap-2 px-6 py-3 bg-white border border-zinc-100 rounded-xl shadow-sm">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Start date</span>
                    <span className="text-xs font-bold text-zinc-300"> — </span>
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">End date</span>
                    <Calendar className="w-4 h-4 text-zinc-400 ml-4" />
                </div>
                {['All payment method', 'All status'].map(f => (
                    <button key={f} className="flex items-center gap-2 px-6 py-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold text-zinc-600 shadow-sm">
                        {f} <ChevronDown className="w-4 h-4 text-zinc-300" />
                    </button>
                ))}
            </div>

            <div className="bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-200">
                    <div className="min-w-[1200px]">
                        <div className="px-10 py-5 bg-zinc-50/50 border-b border-zinc-100 grid grid-cols-10 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                            <div className="col-span-1">Date</div>
                            <div className="col-span-2">Transaction no.</div>
                            <div className="col-span-2">Item</div>
                            <div className="col-span-1">Method</div>
                            <div className="col-span-1">Price</div>
                            <div className="col-span-1">Discount</div>
                            <div className="col-span-1">Amount</div>
                            <div className="col-span-1">Status</div>
                        </div>
                        <div className="divide-y divide-zinc-50">
                            {allTransactions.length > 0 ? (
                                allTransactions.map((tx, i) => (
                                    <div key={i} className="px-10 py-8 grid grid-cols-10 items-center gap-4 hover:bg-zinc-50/50 transition-all">
                                        <div className="col-span-1 flex flex-col">
                                            <span className="text-xs font-black text-zinc-900">{format(new Date(tx.date), 'dd MMM yyyy')}</span>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{format(new Date(tx.date), 'hh:mm aa')}</span>
                                        </div>
                                        <span className="col-span-2 text-xs font-bold text-[#2D3282] tracking-tighter uppercase">{tx.id.substring(0, 8)}</span>
                                        <div className="col-span-2 flex flex-col">
                                            <span className="text-xs font-bold text-zinc-900 italic">{tx.item}</span>
                                            <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest leading-none">{tx.type}</span>
                                        </div>
                                        <span className="col-span-1 text-xs font-black text-zinc-600">{tx.method}</span>
                                        <span className="col-span-1 text-xs font-bold text-zinc-600">₱{tx.price?.toLocaleString()}</span>
                                        <span className="col-span-1 text-xs font-bold text-zinc-600">₱0.00</span>
                                        <span className="col-span-1 text-xs font-black text-zinc-900">₱{tx.amount?.toLocaleString()}</span>
                                        <div className="col-span-1 flex items-center justify-between">
                                            <span className="inline-flex px-2 py-0.5 bg-emerald-400 text-white text-[9px] font-black uppercase tracking-widest rounded leading-none">
                                                {tx.status}
                                            </span>
                                            <button className="text-zinc-300 hover:text-zinc-900"><MoreVertical className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-20 text-center">
                                    <p className="text-sm font-bold text-zinc-400 italic">No transactions found for this customer</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


function FormsTab({ profile }: { profile: any }) {
    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm flex items-center justify-between hover:border-zinc-200 transition-all cursor-pointer group">
                <div className="flex items-center gap-6">
                    <h3 className="text-md font-black text-zinc-900 tracking-tight">Waiver and Indemnification Form</h3>
                    {profile.waiver_signed_at ? (
                        <span className="px-2 py-0.5 bg-emerald-400 text-white text-[9px] font-black uppercase tracking-widest rounded leading-none">
                            Signed
                        </span>
                    ) : (
                        <span className="px-2 py-0.5 bg-rose-400 text-white text-[9px] font-black uppercase tracking-widest rounded leading-none animate-pulse">
                            Pending
                        </span>
                    )}
                </div>
                <Download className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
            </div>
        </div>
    )
}

function SettingsTab() {
    return (
        <div className="space-y-8 animate-in fade-in duration-700 max-w-2xl">
            <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6">
                <div>
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Suspend account</h3>
                    <p className="text-sm font-bold text-zinc-400 mt-1">Customer is unable to purchase or book your services.</p>
                </div>
                
                <div className="pt-6 border-t border-zinc-50 flex items-center justify-between gap-10">
                    <div>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Suspend reason</span>
                        <p className="text-sm font-bold text-zinc-300 mt-1">--</p>
                    </div>
                    <button className="px-8 py-3 border border-rose-200 text-rose-500 rounded-full text-xs font-black shadow-lg shadow-rose-500/5 uppercase tracking-widest hover:bg-rose-50 transition-all">
                        Suspend
                    </button>
                </div>
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between gap-10">
                    <div>
                        <h3 className="text-lg font-black text-zinc-900 tracking-tight">Delete customer</h3>
                        <p className="text-sm font-bold text-zinc-400 mt-1">Customer will be able to rejoin.</p>
                    </div>
                    <button className="px-8 py-3 border border-rose-200 text-rose-500 rounded-full text-xs font-black shadow-lg shadow-rose-500/5 uppercase tracking-widest hover:bg-rose-50 transition-all">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    )
}

function WaiverTab({ profile, studio }: { profile: any, studio: any }) {
    const [waiver, setWaiver] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchWaiver() {
            try {
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                
                const { data, error: fetchError } = await supabase
                    .from('waiver_consents')
                    .select('*')
                    .eq('user_id', profile.id)
                    .eq('studio_id', studio.id)
                    .order('agreed_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (fetchError) throw fetchError
                setWaiver(data)
            } catch (err: any) {
                console.error('Error fetching waiver:', err)
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }

        fetchWaiver()
    }, [profile.id, studio.id])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
            </div>
        )
    }

    if (!waiver) {
        return (
            <div className="bg-white border border-zinc-100 rounded-3xl p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-zinc-300" />
                </div>
                <div className="space-y-1">
                    <p className="font-bold text-zinc-900 uppercase tracking-widest text-xs">No Waiver Signed</p>
                    <p className="text-zinc-400 text-sm max-w-sm mx-auto">This customer has not yet signed the mandatory studio waiver form.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm overflow-hidden">
                <div className="p-10 md:p-16 space-y-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-zinc-100">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Legal Audit Record</p>
                            <h2 className="text-2xl font-serif font-bold text-zinc-900">{waiver.waiver_title_snapshot || 'Waiver & Indemnification'}</h2>
                        </div>
                        <div className="text-left md:text-right space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Signed On</p>
                            <p className="text-sm font-bold text-zinc-900">{format(new Date(waiver.agreed_at), 'MMMM d, yyyy h:mm a')}</p>
                        </div>
                    </div>

                    <div 
                        className="prose prose-sm prose-zinc max-w-none text-zinc-600 font-medium leading-relaxed signature-document-view"
                        dangerouslySetInnerHTML={{ 
                            __html: sanitizeHtml(waiver.waiver_content_snapshot)
                        }}
                    />

                    <div className="pt-12 border-t border-zinc-100 space-y-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Customer Signature</p>
                        <div className="bg-zinc-50/50 border border-zinc-100 rounded-3xl p-8 flex items-center justify-center min-h-[200px]">
                            {waiver.signature_svg ? (
                                <img 
                                    src={waiver.signature_svg} 
                                    className="max-h-40 w-auto mix-blend-multiply grayscale contrast-125" 
                                    alt="Customer Signature" 
                                />
                            ) : (
                                <p className="text-xs font-serif italic text-zinc-300">Clickwrap agreement - No physical signature collected</p>
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Verification Verified by Pilates Hub</p>
                            </div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Waiver Version: {waiver.waiver_version}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 px-6 pb-12">
                <button 
                    onClick={() => {
                        window.print();
                    }}
                    className="flex items-center gap-2 px-5 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                    <Download className="w-3.5 h-3.5" />
                    Print PDF Record
                </button>
            </div>
        </div>
    )
}
