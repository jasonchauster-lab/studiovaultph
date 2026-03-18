'use client'

import React from 'react'
import { TrendingUp, Users, DollarSign, Percent } from 'lucide-react'

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

export default function AdminAnalytics({ stats }: { stats: Stats }) {
    const maxRevenue = Math.max(...stats.dailyData.map(d => d.revenue), 1)
    const chartHeight = 120
    const pointPadding = 40

    return (
        <div className="space-y-10 text-charcoal">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=all'}
                    className="group glass-card p-1 relative overflow-hidden transition-all duration-700 hover:shadow-cloud"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-sage/10 text-sage rounded-[20px] group-hover:bg-sage group-hover:text-white transition-all duration-700 shadow-sm">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.3em] mb-1">Total Revenue</p>
                                <p className="text-4xl font-serif text-charcoal group-hover:translate-x-1 transition-transform duration-700">₱{stats.totalRevenue.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-sage/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-sage/10 transition-colors duration-700" />
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Platform Fees'}
                    className="group glass-card p-1 relative overflow-hidden transition-all duration-700 hover:shadow-cloud"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-gold/10 text-gold rounded-[20px] group-hover:bg-gold group-hover:text-white transition-all duration-700 shadow-sm">
                                <Percent className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.3em] mb-1">Platform Fees</p>
                                <p className="text-4xl font-serif text-charcoal group-hover:translate-x-1 transition-transform duration-700">₱{stats.totalPlatformFees.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-gold/10 transition-colors duration-700" />
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Studio Share'}
                    className="group glass-card p-1 relative overflow-hidden transition-all duration-700 hover:shadow-cloud"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-rose/10 text-rose rounded-[20px] group-hover:bg-rose group-hover:text-charcoal transition-all duration-700 shadow-sm">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.3em] mb-1">Studio Share</p>
                                <p className="text-4xl font-serif text-charcoal group-hover:translate-x-1 transition-transform duration-700">₱{stats.totalStudioFees.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-rose/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-rose/10 transition-colors duration-700" />
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Instructor Share'}
                    className="group glass-card p-1 relative overflow-hidden transition-all duration-700 hover:shadow-cloud"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-sage/5 text-charcoal/50 rounded-[20px] group-hover:bg-charcoal group-hover:text-white transition-all duration-700 shadow-sm">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.3em] mb-1">Instructor Share</p>
                                <p className="text-4xl font-serif text-charcoal group-hover:translate-x-1 transition-transform duration-700">₱{stats.totalInstructorFees.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-charcoal/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-charcoal/10 transition-colors duration-700" />
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Payouts'}
                    className="group glass-card p-1 relative overflow-hidden transition-all duration-700 hover:shadow-cloud"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-red-50 text-red-600 rounded-[20px] group-hover:bg-red-600 group-hover:text-white transition-all duration-700 shadow-sm">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.3em] mb-1">Total Paid Out</p>
                                <p className="text-4xl font-serif text-charcoal group-hover:translate-x-1 transition-transform duration-700">₱{stats.totalPayouts.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-red-500/10 transition-colors duration-700" />
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Booking'}
                    className="group glass-card p-1 relative overflow-hidden transition-all duration-700 hover:shadow-cloud"
                >
                    <div className="p-10 relative z-10">
                        <div className="flex items-center gap-6 mb-6">
                            <div className="p-5 bg-alabaster text-charcoal/50 rounded-[20px] group-hover:bg-charcoal group-hover:text-white transition-all duration-700 shadow-sm border border-white/60">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.3em] mb-1">Total Bookings</p>
                                <p className="text-4xl font-serif text-charcoal group-hover:translate-x-1 transition-transform duration-700">{stats.bookingCount}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-alabaster/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-charcoal/5 transition-colors duration-700" />
                    </div>
                </button>
            </div>

            {/* SVG Revenue Chart */}
            <div className="glass-card p-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sage via-gold to-rose opacity-30" />

                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-3xl font-serif text-charcoal tracking-tighter">Revenue Overview</h3>
                        <p className="text-[10px] font-black text-charcoal/50 uppercase tracking-[0.4em] mt-2">Daily financial performance & platform retention</p>
                    </div>
                    <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-charcoal" />
                            <span className="text-[9px] font-black text-charcoal/40 uppercase tracking-widest">Gross Yield</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-[9px] font-black text-charcoal/40 uppercase tracking-widest">Platform Fees</span>
                        </div>
                    </div>
                </div>

                <div className="relative h-[220px] w-full mt-8 flex gap-4">
                    {/* Y-Axis Labels */}
                    <div className="flex flex-col justify-between h-[120px] text-[9px] font-black text-charcoal/30 uppercase tracking-tighter w-12 pt-0">
                        <span>₱{maxRevenue >= 1000 ? (maxRevenue / 1000).toFixed(1) + 'k' : maxRevenue.toLocaleString()}</span>
                        <span>₱{(maxRevenue * 0.75) >= 1000 ? ((maxRevenue * 0.75) / 1000).toFixed(1) + 'k' : (maxRevenue * 0.75).toLocaleString()}</span>
                        <span>₱{(maxRevenue * 0.5) >= 1000 ? ((maxRevenue * 0.5) / 1000).toFixed(1) + 'k' : (maxRevenue * 0.5).toLocaleString()}</span>
                        <span>₱{(maxRevenue * 0.25) >= 1000 ? ((maxRevenue * 0.25) / 1000).toFixed(1) + 'k' : (maxRevenue * 0.25).toLocaleString()}</span>
                        <span>₱0</span>
                    </div>

                    <div className="relative flex-1 h-[120px]">
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
                                    d={`M 0,${chartHeight} ${stats.dailyData.map((d, i) => `${i * pointPadding},${chartHeight - (d.revenue / maxRevenue) * chartHeight}`).join(' L ')} L ${(stats.dailyData.length - 1) * pointPadding},${chartHeight} Z`}
                                    fill="url(#revenueGradient)"
                                    opacity="0.08"
                                />

                                {/* Platform Fee Path */}
                                <path
                                    d={`M ${stats.dailyData.map((d, i) => `${i * pointPadding},${chartHeight - (d.platformFees / maxRevenue) * chartHeight}`).join(' L ')}`}
                                    fill="none"
                                    stroke="#3B82F6"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="opacity-40"
                                />

                                {/* Main Line Path */}
                                <path
                                    d={`M ${stats.dailyData.map((d, i) => `${i * pointPadding},${chartHeight - (d.revenue / maxRevenue) * chartHeight}`).join(' L ')}`}
                                    fill="none"
                                    stroke="#1F2937"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />

                                <defs>
                                    <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor="#1F2937" />
                                        <stop offset="100%" stopColor="#FFFFFF" />
                                    </linearGradient>
                                </defs>

                                {/* Data Points */}
                                {stats.dailyData.map((d, i) => (
                                    <g key={i} className="group cursor-pointer">
                                        <circle
                                            cx={i * pointPadding}
                                            cy={chartHeight - (d.revenue / maxRevenue) * chartHeight}
                                            r="3.5"
                                            fill="#FFFFFF"
                                            stroke="#1F2937"
                                            strokeWidth="1.5"
                                            className="transition-all duration-300 group-hover:r-[5] group-hover:fill-charcoal group-hover:stroke-white"
                                        />
                                        <title>{`${d.date}: ₱${d.revenue.toLocaleString()}`}</title>
                                    </g>
                                ))}
                            </svg>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-charcoal/50 text-[10px] font-black uppercase tracking-widest italic bg-alabaster/30 rounded-3xl border border-cream-100 border-dashed">
                                Insufficient data for trend analysis
                            </div>
                        )}
                    </div>
                </div>

                {/* X-Axis Labels */}
                <div className="relative mt-2 h-8 w-full flex">
                    <div className="w-12 shrink-0" /> {/* Spacer for Y-axis labels */}
                    <div className="relative flex-1">
                        {stats.dailyData.length > 1 && (
                            <div className="absolute top-0 left-0 w-full flex text-[9px] font-black text-charcoal/50 uppercase tracking-[0.15em]">
                                {stats.dailyData.map((d, i) => {
                                    const leftOffset = (i * pointPadding)
                                    const showLabel = i === 0 || i === stats.dailyData.length - 1 || stats.dailyData.length <= 7 || i % Math.ceil(stats.dailyData.length / 5) === 0
                                    if (!showLabel) return null

                                    return (
                                        <span
                                            key={i}
                                            className="absolute text-center -translate-x-1/2 whitespace-nowrap"
                                            style={{ left: `${(leftOffset / ((stats.dailyData.length - 1) * pointPadding)) * 100}%` }}
                                        >
                                            {new Date(d.date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' }).toUpperCase()}
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
