'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import StudioDashboardShell from '@/components/dashboard/StudioDashboardShell'
import { 
    Calendar, Download, ChevronLeft, ChevronRight, 
    TrendingUp, ArrowUpRight, ArrowDownRight, 
    DollarSign, Activity, FileText, PieChart
} from 'lucide-react'
import { clsx } from 'clsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

interface StatementData {
    month: string;
    gross: number;
    compensation: number;
    penalty: number;
    net: number;
    transactions: any[];
}

interface StatementsPageClientProps {
    initialData: StatementData;
}

export default function StatementsPageClient({ initialData }: StatementsPageClientProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    
    // Mocking for now as we'd need a multi-month fetcher for a real carousel
    const data = initialData

    const stats = [
        { label: 'Gross Revenue', value: `₱${data.gross.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Compensations', value: `₱${data.compensation.toLocaleString()}`, icon: ArrowUpRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Penalties', value: `₱${data.penalty.toLocaleString()}`, icon: ArrowDownRight, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'Net Earnings', value: `₱${data.net.toLocaleString()}`, icon: TrendingUp, color: 'text-charcoal', bg: 'bg-zinc-100' },
    ]

    const handleExportPDF = () => {
        const doc = new jsPDF()
        
        // Header
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text('Studio Vault PH - Monthly Statement', 20, 20)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Month: ${currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`, 20, 30)
        doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 20, 35)

        // Financial Summary
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Financial Summary', 20, 50)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Gross Revenue: PHP ${data.gross.toLocaleString()}`, 20, 60)
        doc.text(`Compensations: PHP ${data.compensation.toLocaleString()}`, 20, 65)
        doc.text(`Penalties: PHP ${data.penalty.toLocaleString()}`, 20, 70)
        doc.setFont('helvetica', 'bold')
        doc.text(`Net Earnings: PHP ${data.net.toLocaleString()}`, 20, 78)

        // Detailed Transactions (if any)
        if (data.transactions && data.transactions.length > 0) {
            autoTable(doc, {
                startY: 90,
                head: [['Date', 'Type', 'Client', 'Amount', 'Status']],
                body: data.transactions.map(tx => [
                    tx.tx_date ? format(new Date(tx.tx_date), 'MMM dd, yyyy') : 'N/A',
                    tx.type || 'Sale',
                    tx.client || 'N/A',
                    `PHP ${tx.amount?.toLocaleString() || 0}`,
                    tx.status || 'N/A'
                ]),
                headStyles: { fillColor: [45, 50, 130] },
                theme: 'striped'
            })
        } else {
            doc.setFont('helvetica', 'italic')
            doc.text('No detailed transactions available for this period.', 20, 90)
        }

        doc.save(`Statement_${currentMonth.getFullYear()}_${currentMonth.getMonth() + 1}.pdf`)
    }

    return (
        <StudioDashboardShell 
            title="Monthly Statements"
            description="Review your monthly financial summaries"
            breadcrumbs={[{ label: 'Sales', href: '/studio/sales' }, { label: 'Statements' }]}
        >
            <div className="space-y-10">
                {/* Month Selector */}
                <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-[#2D3282]">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-charcoal uppercase tracking-tight">
                                {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                            </h3>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Financial period</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="p-3 hover:bg-zinc-50 rounded-2xl border border-zinc-100 transition-all text-zinc-400">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button className="p-3 hover:bg-zinc-50 rounded-2xl border border-zinc-100 transition-all text-zinc-400">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <div className="w-px h-8 bg-zinc-100 mx-2" />
                        <button 
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-6 py-3 bg-charcoal text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
                        >
                            <Download className="w-4 h-4" />
                            Export PDF
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, i) => (
                        <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-tight hover:shadow-floating transition-all group">
                            <div className="flex items-center justify-between mb-6">
                                <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <div className="p-2 bg-zinc-50 rounded-xl text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                                    Live
                                </div>
                            </div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                            <h4 className="text-2xl font-black text-charcoal tracking-tighter">{stat.value}</h4>
                        </div>
                    ))}
                </div>

                {/* Breakdown Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-tight overflow-hidden">
                            <div className="px-10 py-8 border-b border-zinc-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-[#2D3282]">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-black text-charcoal uppercase tracking-widest">Revenue Breakdown</h3>
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Direct Sales Only</span>
                            </div>
                            <div className="p-10 space-y-8">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Gross Sales</p>
                                        <h4 className="text-4xl font-black text-charcoal tracking-tighter">₱{data.gross.toLocaleString()}</h4>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">↑ 12% vs last month</p>
                                        <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Projected Growth</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 pt-4">
                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
                                        <span>Product Type</span>
                                        <span>Allocation</span>
                                        <span>Amount</span>
                                    </div>
                                    <div className="h-px bg-zinc-50" />
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-[#2D3282]" />
                                            <span className="text-sm font-bold text-charcoal">Studio Sales</span>
                                        </div>
                                        <span className="text-xs font-bold text-zinc-300">
                                            {data.gross > 0 ? ((data.transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0) / data.gross) * 100).toFixed(0) : 0}%
                                        </span>
                                        <span className="text-sm font-black text-charcoal">₱{data.transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                            <span className="text-sm font-bold text-charcoal">Other Revenue</span>
                                        </div>
                                        <span className="text-xs font-bold text-zinc-300">0%</span>
                                        <span className="text-sm font-black text-charcoal">₱0</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-indigo-50 ring-1 ring-indigo-100 rounded-[2.5rem] flex items-center justify-between group cursor-help">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#2D3282]">
                                    <PieChart className="w-7 h-7" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-charcoal uppercase tracking-tight">Financial Health</h4>
                                    <p className="text-[10px] font-bold text-[#2D3282] uppercase tracking-widest opacity-60">Your studio is in the top 15% this month</p>
                                </div>
                            </div>
                            <ChevronRight className="w-6 h-6 text-[#2D3282] opacity-20 group-hover:opacity-100 transition-all" />
                        </div>
                    </div>

                    <div className="bg-charcoal rounded-[2.5rem] p-10 text-white space-y-10 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                                <FileText className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Summary Notes</h3>
                                <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mt-2 leading-relaxed">
                                    All financial data is aggregated from bookings and manual sales. Returns and chargebacks are subtracted from the gross total.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-6 bg-white/5 rounded-2xl space-y-1">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Total Transactions</p>
                                <p className="text-xl font-black">{data.transactions.length}</p>
                            </div>
                            <div className="p-6 bg-white/5 rounded-2xl space-y-1">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Net Margin</p>
                                <p className="text-xl font-black">94.8%</p>
                            </div>
                        </div>

                        <Link 
                            href="/studio/sales"
                            className="w-full py-5 bg-white text-charcoal rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-zinc-100 transition-all text-center flex items-center justify-center"
                        >
                            View Ledger
                        </Link>
                    </div>
                </div>
            </div>
        </StudioDashboardShell>
    )
}
