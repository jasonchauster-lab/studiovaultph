'use client'

import React from 'react'
import { TrendingUp, Users, DollarSign, Percent, AlertTriangle } from 'lucide-react'

interface DailyData {
    date: string
    revenue: number
    bookings: number
}

interface Stats {
    totalRevenue: number
    totalPlatformFees: number
    totalStudioFees: number
    totalInstructorFees: number
    totalPayouts: number
    bookingCount: number
    dailyData: (DailyData & { platformFees: number })[]
}

export default function AdminAnalytics({ stats }: { stats: any }) {
    if (!stats || stats.error || !stats.dailyData) {
        return (
            <div className="atelier-card p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-burgundy font-serif text-xl">Operational Intelligence Offline</p>
                <p className="text-burgundy/40 text-sm italic">
                    {stats?.error || "We're currently unable to retrieve analytics data. Other dashboard functions remain active."}
                </p>
            </div>
        )
    }

    const maxRevenue = Math.max(...stats.dailyData.map((d: any) => d.revenue), 1)
    const chartHeight = 120
    const pointPadding = 40

    return (
        <div className="space-y-10 text-burgundy">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=all'}
                    className="group atelier-card p-0 relative overflow-hidden transition-all duration-700 hover:shadow-xl"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-forest/10 text-forest rounded-[20px] group-hover:bg-forest group-hover:text-white transition-all duration-700 shadow-sm">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-burgundy/50 uppercase tracking-[0.3em] mb-1">Total Revenue</p>
                                <p className="text-4xl font-serif text-burgundy group-hover:translate-x-1 transition-transform duration-700">₱{stats.totalRevenue.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-forest/10 transition-colors duration-700" />
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Platform Fees'}
                    className="group atelier-card p-0 relative overflow-hidden transition-all duration-700 hover:shadow-xl"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-amber-400/10 text-amber-600 rounded-[20px] group-hover:bg-amber-400 group-hover:text-white transition-all duration-700 shadow-sm">
                                <Percent className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-burgundy/50 uppercase tracking-[0.3em] mb-1">Platform Fees</p>
                                <p className="text-4xl font-serif text-burgundy group-hover:translate-x-1 transition-transform duration-700">₱{stats.totalPlatformFees.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-amber-400/10 transition-colors duration-700" />
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Studio Share'}
                    className="group atelier-card p-0 relative overflow-hidden transition-all duration-700 hover:shadow-xl"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-burgundy/10 text-burgundy rounded-[20px] group-hover:bg-burgundy group-hover:text-white transition-all duration-700 shadow-sm">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-burgundy/50 uppercase tracking-[0.3em] mb-1">Studio Share</p>
                                <p className="text-4xl font-serif text-burgundy group-hover:translate-x-1 transition-transform duration-700">₱{stats.totalStudioFees.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-burgundy/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-burgundy/10 transition-colors duration-700" />
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Instructor Share'}
                    className="group atelier-card p-0 relative overflow-hidden transition-all duration-700 hover:shadow-xl"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-forest/5 text-forest/50 rounded-[20px] group-hover:bg-forest group-hover:text-white transition-all duration-700 shadow-sm">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-burgundy/50 uppercase tracking-[0.3em] mb-1">Instructor Share</p>
                                <p className="text-4xl font-serif text-burgundy group-hover:translate-x-1 transition-transform duration-700">₱{stats.totalInstructorFees.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-forest/10 transition-colors duration-700" />
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Payouts'}
                    className="group atelier-card p-0 relative overflow-hidden transition-all duration-700 hover:shadow-xl"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-red-400/10 text-red-600 rounded-[20px] group-hover:bg-red-500 group-hover:text-white transition-all duration-700 shadow-sm">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-burgundy/50 uppercase tracking-[0.3em] mb-1">Total Paid Out</p>
                                <p className="text-4xl font-serif text-burgundy group-hover:translate-x-1 transition-transform duration-700">₱{stats.totalPayouts.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-red-500/10 transition-colors duration-700" />
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Booking'}
                    className="group atelier-card p-0 relative overflow-hidden transition-all duration-700 hover:shadow-xl"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-stone-100 text-burgundy/50 rounded-[20px] group-hover:bg-burgundy group-hover:text-white transition-all duration-700 shadow-sm border border-burgundy/5">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-burgundy/50 uppercase tracking-[0.3em] mb-1">Total Bookings</p>
                                <p className="text-4xl font-serif text-burgundy group-hover:translate-x-1 transition-transform duration-700">{stats.bookingCount}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-stone-100/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-burgundy/5 transition-colors duration-700" />
                    </div>
                </button>
            </div>

            {/* SVG Revenue Chart */}
            <div className="atelier-card p-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-forest via-amber-400 to-burgundy opacity-30" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                    <div>
                        <h3 className="text-3xl font-serif text-burgundy tracking-tighter">Revenue Overview</h3>
                        <p className="text-[10px] font-black text-burgundy/50 uppercase tracking-[0.4em] mt-2">Daily financial performance & platform retention</p>
                    </div>
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-burgundy" />
                            <span className="text-[9px] font-black text-burgundy/40 uppercase tracking-widest">Gross Yield</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <span className="text-[9px] font-black text-burgundy/40 uppercase tracking-widest">Platform Fees</span>
                        </div>
                    </div>
                </div>

                <div className="relative h-[250px] w-full mt-8 flex gap-6">
                    {/* Y-Axis Labels */}
                    <div className="flex flex-col justify-between h-[150px] text-[9px] font-black text-burgundy/30 uppercase tracking-tighter w-14 pt-0">
                        <span>₱{maxRevenue >= 1000 ? (maxRevenue / 1000).toFixed(1) + 'k' : maxRevenue.toLocaleString()}</span>
                        <span>₱{(maxRevenue * 0.75) >= 1000 ? ((maxRevenue * 0.75) / 1000).toFixed(1) + 'k' : (maxRevenue * 0.75).toLocaleString()}</span>
                        <span>₱{(maxRevenue * 0.5) >= 1000 ? ((maxRevenue * 0.5) / 1000).toFixed(1) + 'k' : (maxRevenue * 0.5).toLocaleString()}</span>
                        <span>₱{(maxRevenue * 0.25) >= 1000 ? ((maxRevenue * 0.25) / 1000).toFixed(1) + 'k' : (maxRevenue * 0.25).toLocaleString()}</span>
                        <span>₱0</span>
                    </div>

                    <div className="relative flex-1 h-[150px]">
                        {stats.dailyData.length > 1 ? (
                            <svg 
                                className="w-full h-full overflow-visible" 
                                viewBox={`0 0 ${(stats.dailyData.length - 1) * pointPadding} ${chartHeight}`} 
                                preserveAspectRatio="none"
                            >
                                {/* Grid Lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                                    <line
                                        key={i}
                                        x1="0"
                                        y1={chartHeight * p}
                                        x2={(stats.dailyData.length - 1) * pointPadding}
                                        y2={chartHeight * p}
                                        stroke="#F5F5F0"
                                        strokeWidth="1"
                                        strokeDasharray="4 4"
                                    />
                                ))}

                                {/* Area Fill */}
                                <path
                                    d={`M 0,${chartHeight} ${stats.dailyData.map((d: any, i: number) => `${i * pointPadding},${chartHeight - (d.revenue / maxRevenue) * chartHeight}`).join(' L ')} L ${(stats.dailyData.length - 1) * pointPadding},${chartHeight} Z`}
                                    fill="url(#revenueGradient)"
                                    opacity="0.08"
                                />

                                {/* Platform Fee Path */}
                                <path
                                    d={`M ${stats.dailyData.map((d: any, i: number) => `${i * pointPadding},${chartHeight - (d.platformFees / maxRevenue) * chartHeight}`).join(' L ')}`}
                                    fill="none"
                                    stroke="#FBBF24"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="opacity-40"
                                />

                                {/* Main Line Path */}
                                <path
                                    d={`M ${stats.dailyData.map((d: any, i: number) => `${i * pointPadding},${chartHeight - (d.revenue / maxRevenue) * chartHeight}`).join(' L ')}`}
                                    fill="none"
                                    stroke="#7C2D12"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

                                <defs>
                                    <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#7C2D12" />
                                        <stop offset="100%" stopColor="#FFFFFF" />
                                    </linearGradient>
                                </defs>

                            </svg>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-burgundy/50 text-[10px] font-black uppercase tracking-widest italic bg-stone-50 rounded-[32px] border border-stone-200 border-dashed">
                                Insufficient data for trend analysis
                            </div>
                        )}

                        {/* Data Point Overlay - Prevents SVG stretching distortion */}
                        {stats.dailyData.length > 1 && (
                            <div className="absolute inset-0 pointer-events-none">
                                {stats.dailyData.map((d: any, i: number) => (
                                    <div 
                                        key={i}
                                        className="group absolute pointer-events-auto cursor-pointer"
                                        style={{
                                            left: `${(i / (stats.dailyData.length - 1)) * 100}%`,
                                            top: `${(1 - (d.revenue / maxRevenue)) * 100}%`,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                        title={`${d.date}: ₱${d.revenue.toLocaleString()}`}
                                    >
                                        <div className="w-2.5 h-2.5 rounded-full bg-white border-2 border-burgundy transition-all duration-300 group-hover:scale-[1.6] group-hover:bg-burgundy group-hover:border-white shadow-sm" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* X-Axis Labels */}
                <div className="relative mt-4 h-8 w-full flex">
                    <div className="w-14 shrink-0" /> {/* Spacer for Y-axis labels */}
                    <div className="relative flex-1">
                        {stats.dailyData.length > 1 && (
                            <div className="absolute top-0 left-0 w-full flex text-[9px] font-black text-burgundy/50 uppercase tracking-[0.15em]">
                                {stats.dailyData.map((d: any, i: number) => {
                                    const leftOffset = (i * pointPadding)
                                    const showLabel = i === 0 || i === stats.dailyData.length - 1 || stats.dailyData.length <= 7 || i % Math.ceil(stats.dailyData.length / 5) === 0
                                    if (!showLabel) return null

                                    return (
                                        <span
                                            key={i}
                                            className="absolute text-center -translate-x-1/2 whitespace-nowrap"
                                            style={{ left: `${(leftOffset / ((stats.dailyData.length - 1) * pointPadding)) * 100}%` }}
                                        >
                                            {(() => {
                                                try {
                                                    const dateObj = new Date(d.date)
                                                    if (isNaN(dateObj.getTime())) return '—'
                                                    return dateObj.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).toUpperCase()
                                                } catch (e) {
                                                    return '—'
                                                }
                                            })()}
                                        </span>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
