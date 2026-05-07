'use client'

import { useState } from 'react'
import { ChevronDown, Plus, Minus } from 'lucide-react'
import { clsx } from 'clsx'

interface Step4Props {
    data: any
    outlets: any[]
    updateData: (data: any) => void
}

export default function Step4_Employment({ data, outlets, updateData }: Step4Props) {
    const [showAdditional, setShowAdditional] = useState(false)

    return (
        <div className="space-y-12">
            <div className="space-y-2">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight font-atelier">Employment details</h2>
                <p className="text-sm text-zinc-500 font-medium">Professional info regarding their role in the company.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Designation</label>
                    <input 
                        type="text" 
                        value={data.designation || ''}
                        onChange={(e) => updateData({ designation: e.target.value })}
                        placeholder="e.g. Senior Lead Instructor"
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Commencement / Start date</label>
                    <input 
                        type="date" 
                        value={data.start_date || ''}
                        onChange={(e) => updateData({ start_date: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Probation Completion / End date</label>
                    <input 
                        type="date" 
                        value={data.end_date || ''}
                        onChange={(e) => updateData({ end_date: e.target.value })}
                        className={clsx(
                            "w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none",
                            data.is_current && "opacity-40"
                        )}
                        disabled={data.is_current}
                    />
                    <div className="flex items-center gap-2 mt-2 ml-1">
                         <input 
                            type="checkbox" 
                            id="is_current"
                            checked={data.is_current}
                            onChange={(e) => updateData({ is_current: e.target.checked })}
                            className="w-4 h-4 rounded-md border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                         />
                         <label htmlFor="is_current" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Still working here</label>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Employment Type</label>
                    <select 
                        value={data.employment_type || ''}
                        onChange={(e) => updateData({ employment_type: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none appearance-none"
                    >
                        <option value="">Please select</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contractor">Contractor</option>
                        <option value="Freelancer">Freelancer</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Default location</label>
                    <select 
                        value={data.default_location_id || ''}
                        onChange={(e) => updateData({ default_location_id: e.target.value })}
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none appearance-none"
                    >
                        <option value="">Please select</option>
                        {outlets.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Department</label>
                    <input 
                        type="text" 
                        value={data.department || ''}
                        onChange={(e) => updateData({ department: e.target.value })}
                        placeholder="e.g. Sales, Instruction"
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                    />
                </div>

                <div className="md:col-span-2">
                    <button 
                        type="button"
                        onClick={() => setShowAdditional(!showAdditional)}
                        className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
                    >
                        {showAdditional ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        Additional Options
                    </button>

                    {showAdditional && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Staff Pass No.</label>
                                <input 
                                    type="text" 
                                    value={data.staff_pass_no || ''}
                                    onChange={(e) => updateData({ staff_pass_no: e.target.value })}
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Staff Pass Expiry</label>
                                <input 
                                    type="date" 
                                    value={data.staff_pass_expiry || ''}
                                    onChange={(e) => updateData({ staff_pass_expiry: e.target.value })}
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Probationary Period</label>
                                <input 
                                    type="text" 
                                    value={data.probationary_period || ''}
                                    onChange={(e) => updateData({ probationary_period: e.target.value })}
                                    placeholder="e.g. 3 months"
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Notice Period</label>
                                <input 
                                    type="text" 
                                    value={data.notice_period || ''}
                                    onChange={(e) => updateData({ notice_period: e.target.value })}
                                    placeholder="e.g. 1 month"
                                    className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-[13px] font-medium focus:bg-white outline-none"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
