'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
    CheckCircle2, Sparkles, ChevronRight, 
    User, MapPin, LayoutGrid, Users, Ticket, 
    Globe, Receipt, DollarSign, Wallet, Calendar, Zap,
    Trophy, ArrowRight
} from 'lucide-react'
import clsx from 'clsx'
import { OnboardingStatus } from '@/app/(dashboard)/studio/onboarding-actions'

interface OnboardingChecklistProps {
    status: OnboardingStatus
}

export default function OnboardingChecklist({ status }: OnboardingChecklistProps) {
    const [isExpanded, setIsExpanded] = useState(status.progress < 100)

    const tasks = [
        { id: 'identity', label: 'Business Profile', icon: User, done: status.identity, href: '/studio/management/business', tip: 'Fill out your studio name, industry, and registration details to complete your business profile.' },
        { id: 'infrastructure', label: 'Branch Setup', icon: MapPin, done: status.infrastructure, href: '/studio/management/outlets', tip: 'Enter your physical address so clients can find your studio on the map.' },
        { id: 'equipment', label: 'Equipment List', icon: LayoutGrid, done: status.equipment, href: '/studio/management/equipments', tip: 'List your reformers, chairs, or mats to show clients what you offer.' },
        { id: 'team', label: 'Staff & Team', icon: Users, done: status.team, href: '/studio/management/staff/members', tip: 'Pro tip: Adding more instructors helps you scale your class capacity!' },
        { id: 'pricing', label: 'Pricing Plans', icon: Ticket, done: status.pricing, href: '/studio/pricing', tip: 'Create memberships or class packs to start selling your services.' },
        { id: 'website', label: 'Live Storefront', icon: Globe, done: status.website, href: '/studio/website', tip: 'Head to the builder and save your first design change to go live.' },
        { id: 'waiver', label: 'Legal Waiver', icon: Receipt, done: status.waiver, href: '/studio/online-store/waiver-form', tip: 'Protect your business by setting up your terms and conditions.' },
        { id: 'finance', label: 'Tax Settings', icon: DollarSign, done: status.finance, href: '/studio/management/tax-settings', tip: 'Add your local tax rates (like VAT) to ensure correct invoicing.' },
        { id: 'payouts', label: 'Payout Details', icon: Wallet, done: status.payouts, href: '/studio/settings/marketplace', tip: 'Link your bank or GCash account to receive your earnings.' },
        { id: 'operations', label: 'First Class', icon: Calendar, done: status.operations, href: '/studio/schedule', tip: 'Add your first class slot to the calendar to start taking bookings.' }
    ]

    const completedCount = tasks.filter(t => t.done).length

    return (
        <div className="relative group">
            {/* Background Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-[#2D3282]/20 to-indigo-500/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
            
            <div className="relative bg-white border border-zinc-100 rounded-[2.5rem] shadow-xl overflow-hidden">
                {/* Header / Progress Bar */}
                <div className={clsx(
                    "p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 transition-all duration-500",
                    isExpanded ? "border-b border-zinc-50" : ""
                )}>
                    <div className="flex items-start gap-6">
                        <div className={clsx(
                            "w-20 h-20 rounded-[2.2rem] flex items-center justify-center shrink-0 shadow-lg transition-all duration-500",
                            status.progress === 100 ? "bg-emerald-500 text-white rotate-12" : "bg-indigo-50 text-[#2D3282] border border-indigo-100"
                        )}>
                            {status.progress === 100 ? <Trophy className="w-10 h-10" /> : <Sparkles className="w-10 h-10" />}
                        </div>
                        <div className="space-y-1.5 pt-1">
                            <h2 className="text-3xl font-black text-zinc-900 tracking-tightest">
                                {status.progress === 100 ? 'Studio is Battle-Ready!' : 'Complete your Studio Setup'}
                            </h2>
                            <p className="text-zinc-500 text-base font-bold flex items-center gap-2">
                                <span className={clsx(
                                    "px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black",
                                    status.progress === 100 ? "bg-emerald-100 text-emerald-600" : "bg-indigo-100 text-[#2D3282]"
                                )}>
                                    {completedCount} / {tasks.length} Steps Complete
                                </span>
                                {status.progress < 100 && (
                                    <span className="hidden sm:inline opacity-60">• Just a few more steps to go live</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-6 w-full md:w-auto">
                        {/* Radical Progress Meter */}
                        <div className="relative w-48 h-4 bg-zinc-100 rounded-full overflow-hidden shadow-inner">
                            <div 
                                className={clsx(
                                    "absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_20px_rgba(45,50,130,0.3)]",
                                    status.progress === 100 ? "bg-emerald-500" : "bg-[#2D3282]"
                                )}
                                style={{ width: `${status.progress}%` }}
                            />
                        </div>
                        
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-[#2D3282] transition-colors flex items-center gap-2"
                        >
                            {isExpanded ? 'Hide Details' : 'View Checklist'}
                            <ChevronRight className={clsx("w-4 h-4 transition-transform duration-300", isExpanded ? "rotate-90" : "")} />
                        </button>
                    </div>
                </div>

                {/* Checklist Content */}
                {isExpanded && (
                    <div className="p-4 md:p-8 bg-zinc-50/30">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {tasks.map((task) => (
                                <Link 
                                    key={task.id}
                                    href={task.href}
                                    className={clsx(
                                        "p-5 rounded-3xl border transition-all duration-300 group/task flex flex-col h-full",
                                        task.done 
                                            ? "bg-emerald-50/30 border-emerald-100/50 grayscale opacity-60 hover:grayscale-0 hover:opacity-100" 
                                            : "bg-white border-zinc-100 shadow-sm hover:shadow-md hover:border-indigo-200 hover:-translate-y-1"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={clsx(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                                            task.done ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400 group-hover/task:bg-indigo-50 group-hover/task:text-[#2D3282]"
                                        )}>
                                            <task.icon className="w-5 h-5" />
                                        </div>
                                        {task.done ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <ArrowRight className="w-4 h-4 text-zinc-300 opacity-0 group-hover/task:opacity-100 group-hover/task:translate-x-1 transition-all" />
                                        )}
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <p className={clsx(
                                            "text-[12px] font-black tracking-tight",
                                            task.done ? "text-emerald-700" : "text-zinc-900"
                                        )}>
                                            {task.label}
                                        </p>
                                        <p className={clsx(
                                            "text-[10px] font-bold leading-relaxed",
                                            task.done ? "text-emerald-600/60" : "text-zinc-400"
                                        )}>
                                            {task.tip}
                                        </p>
                                    </div>
                                    {!task.done && (
                                        <div className="mt-4 pt-4 border-t border-zinc-50">
                                            <div className="flex items-center gap-2 text-[#2D3282] text-[10px] font-black uppercase tracking-widest group-hover/task:translate-x-1 transition-transform">
                                                Complete Now <ArrowRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>

                        {status.progress < 100 && (
                            <div className="mt-8 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-center justify-center gap-4 animate-pulse">
                                <Zap className="w-4 h-4 text-[#2D3282]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#2D3282]">
                                    Complete all steps to unlock Discovery Mode and go public
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
