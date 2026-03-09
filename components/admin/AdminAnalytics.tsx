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
        <div className="space-y-6 text-charcoal-900">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=all'}
                    className="text-left bg-white p-6 rounded-xl border border-cream-200 shadow-sm hover:border-charcoal-400 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors border border-transparent">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-charcoal-500">Total Revenue</p>
                            <p className="text-2xl font-bold text-charcoal-900">₱{stats.totalRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Platform Fees'}
                    className="text-left bg-white p-6 rounded-xl border border-cream-200 shadow-sm hover:border-charcoal-400 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors border border-transparent">
                            <Percent className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-charcoal-500">Platform Fees</p>
                            <p className="text-2xl font-bold text-charcoal-900">₱{stats.totalPlatformFees.toLocaleString()}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Studio Share'}
                    className="text-left bg-white p-6 rounded-xl border border-cream-200 shadow-sm hover:border-charcoal-400 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors border border-transparent">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-charcoal-500">Studio Share</p>
                            <p className="text-2xl font-bold text-charcoal-900">₱{stats.totalStudioFees.toLocaleString()}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Instructor Share'}
                    className="text-left bg-white p-6 rounded-xl border border-cream-200 shadow-sm hover:border-charcoal-400 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors border border-transparent">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-charcoal-500">Instructor Share</p>
                            <p className="text-2xl font-bold text-charcoal-900">₱{stats.totalInstructorFees.toLocaleString()}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Payouts'}
                    className="text-left bg-white p-6 rounded-xl border border-cream-200 shadow-sm hover:border-charcoal-400 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100 transition-colors border border-transparent">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-charcoal-500">Total Paid Out</p>
                            <p className="text-2xl font-bold text-charcoal-900">₱{stats.totalPayouts.toLocaleString()}</p>
                        </div>
                    </div>
                </button>

                <button
                    onClick={() => window.location.href = '/admin?tab=reports&subtab=transactions&filter=Booking'}
                    className="text-left bg-white p-6 rounded-xl border border-cream-200 shadow-sm hover:border-charcoal-400 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors border border-transparent">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-charcoal-500">Total Bookings</p>
                            <p className="text-2xl font-bold text-charcoal-900">{stats.bookingCount}</p>
                        </div>
                    </div>
                </button>
            </div>

            {/* SVG Revenue Chart */}
            <div className="bg-white p-6 rounded-xl border border-cream-200 shadow-sm">
                <h3 className="text-lg font-medium text-charcoal-900 mb-6">Revenue Trend</h3>
                <div className="relative h-[160px] w-full">
                    {stats.dailyData.length > 1 ? (
                        <svg className="w-full h-full overflow-visible" viewBox={`0 0 ${stats.dailyData.length * pointPadding} ${chartHeight}`}>
                            {/* Grid Lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                                <line
                                    key={i}
                                    x1="0"
                                    y1={chartHeight * p}
                                    x2={stats.dailyData.length * pointPadding}
                                    y2={chartHeight * p}
                                    stroke="#F1F0E8"
                                    strokeWidth="1"
                                />
                            ))}

                            {/* Line Path */}
                            <path
                                d={`M ${stats.dailyData.map((d, i) => `${i * pointPadding},${chartHeight - (d.revenue / maxRevenue) * chartHeight}`).join(' L ')}`}
                                fill="none"
                                stroke="#1F2937"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {/* Area Fill */}
                            <path
                                d={`M 0,${chartHeight} ${stats.dailyData.map((d, i) => `${i * pointPadding},${chartHeight - (d.revenue / maxRevenue) * chartHeight}`).join(' L ')} L ${(stats.dailyData.length - 1) * pointPadding},${chartHeight} Z`}
                                fill="url(#gradient)"
                                opacity="0.1"
                            />

                            {/* Platform Fee Path */}
                            <path
                                d={`M ${stats.dailyData.map((d, i) => `${i * pointPadding},${chartHeight - (d.platformFees / maxRevenue) * chartHeight}`).join(' L ')}`}
                                fill="none"
                                stroke="#3B82F6"
                                strokeWidth="1.5"
                                strokeDasharray="4 2"
                                strokeLinecap="round"
                            />

                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
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
                                        r="4"
                                        fill="#1F2937"
                                        className="transition-all group-hover:r-6"
                                    />
                                    {/* Tooltip Simulation */}
                                    <title>{`${d.date}: ₱${d.revenue.toLocaleString()}`}</title>
                                </g>
                            ))}
                        </svg>
                    ) : (
                        <div className="flex items-center justify-center h-full text-charcoal-400 text-sm">
                            Not enough data to display trend chart.
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center mt-4">
                    <div className="flex gap-4 text-[10px] text-charcoal-600">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-charcoal-900"></div>
                            <span>Total Revenue</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-blue-500 border-t border-dashed"></div>
                            <span>Platform Fees</span>
                        </div>
                    </div>
                </div>

                {/* X-Axis Labels aligned with the chart points */}
                <div className="relative mt-2 h-6 w-full">
                    {stats.dailyData.length > 1 && (
                        <div className="absolute top-0 left-0 w-full flex text-[10px] text-charcoal-500">
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
                                        {new Date(d.date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' })}
                                    </span>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
