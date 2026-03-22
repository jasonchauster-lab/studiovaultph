'use client'

import { useState } from 'react'
import { Download, Loader2, FileSpreadsheet, CreditCard, Wallet } from 'lucide-react'
import { getPayoutsExport, getRevenueExport, getWalletBalancesExport } from '@/app/(dashboard)/admin/actions'
import clsx from 'clsx'

function toCSV(rows: Record<string, any>[]): string {
    if (!rows || rows.length === 0) return ''
    const headers = Object.keys(rows[0])
    const escape = (val: any) => {
        const str = val === null || val === undefined ? '' : String(val)
        // Prefix with \t (tab) to force Excel to treat as text (prevents scientific notation)
        return `"\t${str.replace(/"/g, '""')}"`
    }
    const lines = [
        headers.join(','),
        ...rows.map(row => headers.map(h => escape(row[h])).join(','))
    ]
    return lines.join('\r\n')
}

function downloadCSV(csv: string, filename: string) {
    // Add UTF-8 BOM so Excel/Sheets correctly reads special characters
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

function ExportButton({
    label,
    filename,
    fetchFn,
    icon: Icon,
    variant = 'secondary'
}: {
    label: string
    filename: string
    fetchFn: () => Promise<{ rows?: Record<string, any>[]; error?: string }>
    icon: any
    variant?: 'primary' | 'secondary'
}) {
    const [loading, setLoading] = useState(false)

    const handleClick = async () => {
        setLoading(true)
        try {
            const result = await fetchFn()
            if (result.error) {
                alert(`Export failed: ${result.error}`)
            } else if (result.rows && result.rows.length > 0) {
                const csv = toCSV(result.rows)
                const dateStr = new Date().toISOString().slice(0, 10)
                downloadCSV(csv, `${filename}_${dateStr}.csv`)
            } else {
                alert('No data to export.')
            }
        } catch (e) {
            alert('Unexpected error during export.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className={clsx(
                "group relative overflow-hidden px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 disabled:opacity-50 flex items-center gap-3 shadow-xl",
                variant === 'primary' 
                    ? "bg-forest text-white shadow-forest/20 hover:shadow-forest/40 hover:-translate-y-0.5" 
                    : "bg-white text-burgundy border border-stone-100 shadow-stone-200/50 hover:border-forest/30 hover:shadow-forest/10 hover:-translate-y-0.5"
            )}
        >
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-400 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            ) : (
                <Icon className={clsx(
                    "w-4 h-4 transition-transform duration-500 group-hover:scale-110",
                    variant === 'primary' ? "text-amber-400" : "text-forest"
                )} />
            )}
            
            <span className="relative z-10">
                {loading ? "Extracting..." : label}
            </span>
            
            {!loading && (
                <Download className={clsx(
                    "w-3 h-3 transition-all duration-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0",
                    variant === 'primary' ? "text-white/60" : "text-forest/60"
                )} />
            )}
        </button>
    )
}

interface AdminExportButtonsProps {
    startDate?: string
    endDate?: string
}

export default function AdminExportButtons({ startDate, endDate }: AdminExportButtonsProps) {
    return (
        <div className="bg-white border border-stone-100 p-8 rounded-[32px] shadow-sm relative overflow-hidden group">
            {/* Background texture/glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-forest/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none group-hover:bg-forest/10 transition-colors duration-700" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="text-center md:text-left">
                    <h3 className="text-xl font-serif text-burgundy tracking-tight">Financial Intelligence</h3>
                    <p className="text-[10px] font-black text-burgundy/30 uppercase tracking-[0.3em] mt-1">
                        Consolidated ledger analytics & reports
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <ExportButton
                        label="Payouts"
                        filename="payouts_export"
                        fetchFn={getPayoutsExport}
                        icon={CreditCard}
                    />
                    <ExportButton
                        label="Revenue"
                        filename="revenue_export"
                        fetchFn={() => getRevenueExport(startDate, endDate)}
                        icon={FileSpreadsheet}
                    />
                    <ExportButton
                        label="Wallets"
                        filename="wallet_balances"
                        fetchFn={getWalletBalancesExport}
                        icon={Wallet}
                        variant="primary"
                    />
                </div>
            </div>
        </div>
    )
}
