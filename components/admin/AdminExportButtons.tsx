'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { getPayoutsExport, getRevenueExport, getWalletBalancesExport } from '@/app/(dashboard)/admin/actions'

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
}: {
    label: string
    filename: string
    fetchFn: () => Promise<{ rows?: Record<string, any>[]; error?: string }>
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
            className="flex items-center gap-2 px-4 py-2 bg-white border border-cream-200 text-charcoal-700 text-sm font-medium rounded-lg hover:bg-cream-50 hover:border-charcoal-300 transition-colors shadow-sm disabled:opacity-60"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {label}
        </button>
    )
}

interface AdminExportButtonsProps {
    startDate?: string
    endDate?: string
}

export default function AdminExportButtons({ startDate, endDate }: AdminExportButtonsProps) {
    return (
        <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-charcoal-400 font-medium uppercase tracking-wider">Export:</span>
            <ExportButton
                label="Payouts"
                filename="payouts_export"
                fetchFn={getPayoutsExport}
            />
            <ExportButton
                label="Revenue"
                filename="revenue_export"
                fetchFn={() => getRevenueExport(startDate, endDate)}
            />
            <ExportButton
                label="Wallet Balances"
                filename="wallet_balances"
                fetchFn={getWalletBalancesExport}
            />
        </div>
    )
}
