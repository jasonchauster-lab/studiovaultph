'use client'

import React, { useState } from 'react'
import { 
    Download, Calendar, 
    Search, Filter, 
    ChevronDown, DollarSign,
    Users, LayoutGrid,
    MoreVertical, Edit3,
    CheckCircle2, Loader2
} from 'lucide-react'
import { getPayrollData, updateInstructorPayrollConfig } from './actions'
import { useToast } from '@/components/ui/Toast'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import Link from 'next/link'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PayrollRecord {
    instructorId: string
    instructorName: string
    totalClasses: number
    totalStudents: number
    totalEarnings: number
    basePayRate: number
    commissionType: 'none' | 'flat' | 'percentage'
    commissionValue: number
    commissionThreshold: number
}

interface PayrollClientProps {
    initialPayroll: PayrollRecord[]
    studioId: string
}

export default function PayrollClient({ initialPayroll, studioId }: PayrollClientProps) {
    const [payroll, setPayroll] = useState(initialPayroll)
    const [isLoading, setIsLoading] = useState(false)
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
    const [editingInstructor, setEditingInstructor] = useState<PayrollRecord | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const { toast } = useToast()

    const handleRefresh = async () => {
        setIsLoading(true)
        try {
            const data = await getPayrollData(studioId, startDate, endDate)
            setPayroll(data as PayrollRecord[])
        } catch (err: any) {
            toast(err.message || 'Failed to fetch payroll data', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    const handleUpdatePayroll = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!editingInstructor) return
        setIsSaving(true)
        const formData = new FormData(e.currentTarget)
        
        const config = {
            basePayRate: Number(formData.get('basePayRate')),
            commissionType: formData.get('commissionType') as string,
            commissionValue: Number(formData.get('commissionValue')),
            commissionThreshold: Number(formData.get('commissionThreshold'))
        }

        try {
            await updateInstructorPayrollConfig(studioId, editingInstructor.instructorId, config)
            toast('Payroll configuration updated', 'success')
            setEditingInstructor(null)
            handleRefresh()
        } catch (err) {
            toast('Failed to update payroll config', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleExportPDF = () => {
        const doc = new jsPDF()
        
        // Add Header
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text('Studio Vault PH - Payroll Report', 20, 20)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Period: ${format(new Date(startDate), 'MMMM dd, yyyy')} to ${format(new Date(endDate), 'MMMM dd, yyyy')}`, 20, 30)
        doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 20, 35)

        // Summary Stats
        const totalPayout = payroll.reduce((sum, r) => sum + r.totalEarnings, 0)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(`Total Payout: ₱${totalPayout.toLocaleString()}`, 20, 50)
        
        // Table
        autoTable(doc, {
            startY: 60,
            head: [['Instructor', 'Base Rate', 'Commission', 'Sessions', 'Students', 'Total Earnings']],
            body: payroll.map(r => [
                r.instructorName,
                `PHP ${r.basePayRate.toLocaleString()}`,
                r.commissionType === 'none' ? 'None' : 
                   (r.commissionType === 'flat' ? `PHP ${r.commissionValue} (Threshold: ${r.commissionThreshold})` : 
                   `${r.commissionValue}% (Threshold: ${r.commissionThreshold})`),
                r.totalClasses,
                r.totalStudents,
                `PHP ${r.totalEarnings.toLocaleString()}`
            ]),
            headStyles: { fillColor: [45, 50, 130] }, // Matching our brand color #2D3282
            theme: 'striped'
        })

        doc.save(`Payroll_Report_${startDate}_to_${endDate}.pdf`)
    }

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Header / Summary matched to screenshot style */}
            <div className="flex flex-col xl:flex-row gap-8 items-start">
                <div className="flex-1 space-y-4">
                    <h2 className="text-3xl font-black text-zinc-900 tracking-tight">Monthly Payroll Summary</h2>
                    <p className="text-sm font-bold text-zinc-400 max-w-xl">Review and manage instructor payouts based on classes completed and student volume.</p>
                </div>

                <div className="w-full xl:w-auto flex flex-wrap items-center gap-4 bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Date Range</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-zinc-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-zinc-600 outline-none"
                            />
                            <span className="text-zinc-300">to</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-zinc-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-zinc-600 outline-none"
                            />
                            <button 
                                onClick={handleRefresh}
                                disabled={isLoading}
                                className="ml-2 p-2 bg-[#2D3282] text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid matched to screenshot style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#2D3282] rounded-[2.5rem] p-8 space-y-4 shadow-xl shadow-[#2D3282]/10">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Payout</p>
                        <h3 className="text-3xl font-black text-white tracking-tight">₱{payroll.reduce((sum, r) => sum + r.totalEarnings, 0).toLocaleString()}</h3>
                    </div>
                </div>
                
                <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 space-y-4 shadow-sm">
                    <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-300">
                        <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Sessions</p>
                        <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{payroll.reduce((sum, r) => sum + r.totalClasses, 0)}</h3>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 space-y-4 shadow-sm">
                    <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-300">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Students</p>
                        <h3 className="text-3xl font-black text-zinc-900 tracking-tight">{payroll.reduce((sum, r) => sum + r.totalStudents, 0)}</h3>
                    </div>
                </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white border border-zinc-100 rounded-[3rem] overflow-hidden shadow-sm">
                <div className="p-10 border-b border-zinc-50 flex items-center justify-between">
                    <h3 className="text-lg font-black text-zinc-900 tracking-tight">Detailed Breakdown</h3>
                    <button 
                        onClick={handleExportPDF}
                        disabled={payroll.length === 0}
                        className="px-6 py-2.5 bg-zinc-50 text-zinc-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5" /> Export PDF
                    </button>
                </div>
                
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50/30 border-b border-zinc-100">
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Instructor</th>
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Payroll Config</th>
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sessions</th>
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Students</th>
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Total Earnings</th>
                            <th className="px-10 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {payroll.length > 0 ? payroll.map((record) => (
                            <tr key={record.instructorId} className="hover:bg-zinc-50/50 transition-all group">
                                <td className="px-10 py-6">
                                    <span className="text-sm font-black text-zinc-900 tracking-tight">{record.instructorName}</span>
                                </td>
                                <td className="px-10 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-zinc-600">Base: ₱{(record.basePayRate || 0).toLocaleString()}</span>
                                        {record.commissionType !== 'none' && (
                                            <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest mt-1">
                                                + {record.commissionType === 'flat' ? `₱${record.commissionValue}` : `${record.commissionValue}%`} {record.commissionThreshold > 0 ? `(if ≥ ${record.commissionThreshold} studs)` : 'Comm'}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-10 py-6 text-sm font-bold text-zinc-600">{record.totalClasses}</td>
                                <td className="px-10 py-6 text-sm font-bold text-zinc-600">{record.totalStudents}</td>
                                <td className="px-10 py-6 text-right">
                                    <span className="text-md font-black text-[#2D3282]">₱{record.totalEarnings.toLocaleString()}</span>
                                </td>
                                <td className="px-10 py-6 text-right">
                                    <button 
                                        onClick={() => setEditingInstructor(record)}
                                        className="p-2 text-zinc-300 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-all"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-10 py-20 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-4">
                                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                                            <Users className="w-8 h-8 text-zinc-200" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-zinc-900 tracking-tight">No Instructors Found</p>
                                            <p className="text-xs font-bold text-zinc-400">Make sure you have added staff members to your studio management.</p>
                                        </div>
                                        <Link 
                                            href="/studio/management/staff/members"
                                            className="px-6 py-2 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-zinc-800 transition-all"
                                        >
                                            Manage Staff
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Payroll Modal */}
            {editingInstructor && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setEditingInstructor(null)} />
                    <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]">
                        <div>
                            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Instructor Payroll Config</h2>
                            <p className="text-sm font-bold text-zinc-400 mt-2">Setting the rates for {editingInstructor.instructorName}</p>
                        </div>

                        <form onSubmit={handleUpdatePayroll} className="space-y-6">
                            {/* Base Pay */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Base Pay Rate (Per Session)</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-zinc-300">₱</span>
                                    <input 
                                        name="basePayRate" 
                                        type="number" 
                                        defaultValue={editingInstructor.basePayRate} 
                                        required 
                                        className="w-full pl-12 pr-8 py-4 bg-zinc-50 border-none rounded-2xl text-md font-black text-zinc-900 outline-none focus:ring-2 focus:ring-[#2D3282]/10 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Commission Logic */}
                            <div className="p-6 bg-zinc-50/50 rounded-[2rem] space-y-6 border border-zinc-100">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Commission Type</label>
                                    <select 
                                        name="commissionType" 
                                        defaultValue={editingInstructor.commissionType} 
                                        className="w-full px-8 py-4 bg-white border-none rounded-2xl text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-[#2D3282]/10 transition-all appearance-none shadow-sm"
                                    >
                                        <option value="none">No Commission</option>
                                        <option value="flat">Flat Amount Per Student</option>
                                        <option value="percentage">Percentage of Session Revenue</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Comm. Value</label>
                                        <input 
                                            name="commissionValue" 
                                            type="number" 
                                            step="0.01"
                                            defaultValue={editingInstructor.commissionValue} 
                                            className="w-full px-8 py-4 bg-white border-none rounded-2xl text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-[#2D3282]/10 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Activation Threshold</label>
                                        <input 
                                            name="commissionThreshold" 
                                            type="number" 
                                            placeholder="Min Students"
                                            defaultValue={editingInstructor.commissionThreshold} 
                                            className="w-full px-8 py-4 bg-white border-none rounded-2xl text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-[#2D3282]/10 transition-all shadow-sm"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-zinc-400 font-bold px-2 italic leading-relaxed">
                                    * Threshold: Commission only kicks in if the total students in a class is greater than or equal to this number.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setEditingInstructor(null)}
                                    className="flex-1 py-4 bg-zinc-100 text-zinc-400 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-[2] py-4 bg-[#2D3282] text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-[#2D3282]/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Configuration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
