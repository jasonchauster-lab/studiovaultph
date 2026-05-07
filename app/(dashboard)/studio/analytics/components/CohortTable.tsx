import React from 'react'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'

interface CohortTableProps {
    cohortMonths: string[]
    groupedCohort: Record<string, Record<number, number>>
    maxMonthIndex: number
}

export const CohortTable = React.memo(({ cohortMonths, groupedCohort, maxMonthIndex }: CohortTableProps) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white border border-zinc-100 rounded-[3rem] p-12 shadow-sm space-y-10"
        >
            <div className="space-y-1">
                <div className="flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-primary rounded-full" />
                    <h3 className="text-xl font-black text-zinc-900 tracking-tightest">Retention Cohorts</h3>
                </div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-4.5">User return rate by joining month</p>
            </div>

            <div className="overflow-x-auto pb-4">
                <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                        <tr className="border-b border-zinc-50">
                            <th className="py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Cohort Month</th>
                            <th className="py-6 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Sample Size</th>
                            {Array.from({ length: Math.min(6, maxMonthIndex + 1) }).map((_, i) => (
                                <th key={i} className="py-6 text-center text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Month {i}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                            {cohortMonths.map(month => {
                            const cohortRow = groupedCohort[month] || {}
                            const initialSize = cohortRow[0] || 0
                            
                            return (
                                <tr key={month} className="group hover:bg-zinc-50/50 transition-all">
                                    <td className="py-8">
                                        <span className="text-sm font-black text-zinc-900 tracking-tight group-hover:text-primary transition-colors">{month}</span>
                                    </td>
                                    <td className="py-8">
                                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-100">{initialSize} users</span>
                                    </td>
                                    {Array.from({ length: Math.min(6, maxMonthIndex + 1) }).map((_, i) => {
                                        const activeCount = cohortRow[i] || 0
                                        const percentage = initialSize > 0 ? Math.round((activeCount / initialSize) * 100) : 0
                                        
                                        return (
                                            <td key={i} className="py-4 px-2">
                                                <div className={clsx(
                                                    "h-16 rounded-[1.5rem] flex items-center justify-center text-xs font-black transition-all border",
                                                    percentage === 0 ? "bg-zinc-50 text-zinc-300 border-zinc-100" :
                                                    percentage < 20 ? "bg-primary/5 text-primary/60 border-primary/10" :
                                                    percentage < 50 ? "bg-primary/20 text-primary border-primary/20" :
                                                    "bg-primary text-white border-primary shadow-lg shadow-primary/10"
                                                )}>
                                                    {percentage}%
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </motion.div>
    )
})

CohortTable.displayName = 'CohortTable'
