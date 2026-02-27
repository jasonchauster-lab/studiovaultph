'use client'

import React from 'react'
import { Download } from 'lucide-react'

export interface Transaction {
    date: string
    type: string
    client?: string
    studio?: string
    instructor?: string
    details?: string
    status?: string
    total_amount: number
    platform_fee?: number
    studio_fee?: number
    instructor_fee?: number
}

export default function ExportCsvButton({ data, filename = 'transactions' }: { data: Transaction[], filename?: string }) {
    const handleExport = () => {
        if (!data || data.length === 0) return

        // CSV Header
        const headers = [
            'Date',
            'Type',
            'Client',
            'Studio',
            'Instructor',
            'Details',
            'Status',
            'Total Amount (PHP)',
            'Platform Fee (PHP)',
            'Studio Fee (PHP)',
            'Instructor Fee (PHP)'
        ]

        const escape = (val: any) => {
            const str = val === null || val === undefined ? '' : String(val)
            // Replace em-dashes with hyphens
            const cleanStr = str.replace(/—/g, '-')
            // Prefix with \t (tab) to force Excel to treat as text
            return `"\t${cleanStr.replace(/"/g, '""')}"`
        }

        // CSV Rows
        const rows = data.map(t => [
            escape(new Date(t.date).toLocaleString()),
            escape(t.type),
            escape(t.client),
            escape(t.studio),
            escape(t.instructor),
            escape(t.details),
            escape(t.status),
            escape(t.total_amount),
            escape(t.platform_fee),
            escape(t.studio_fee),
            escape(t.instructor_fee)
        ])

        // Combine
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\r\n')

        // Add UTF-8 BOM so Excel/Sheets correctly reads special characters
        const BOM = '\uFEFF'
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        link.setAttribute('href', url)
        link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-cream-300 text-charcoal-700 rounded-lg hover:border-charcoal-900 hover:bg-cream-50 transition-all text-sm font-medium shadow-sm active:scale-95"
        >
            <Download className="w-4 h-4" />
            Export CSV
        </button>
    )
}
