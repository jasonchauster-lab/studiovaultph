'use client'

import React, { useState, useEffect } from 'react'
import { X, Search, User, Package, CreditCard, ChevronRight, Loader2, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { recordManualSale, getCustomersForSale } from '@/app/(dashboard)/studio/sales/sales-actions'
import { useToast } from '@/components/ui/Toast'

interface AddTransactionModalProps {
    isOpen: boolean
    onClose: () => void
    packages: any[]
    memberships: any[]
}

export default function AddTransactionModal({ isOpen, onClose, packages, memberships }: AddTransactionModalProps) {
    const { toast } = useToast()
    const [step, setStep] = useState(1)
    const [searchQuery, setSearchQuery] = useState('')
    const [customers, setCustomers] = useState<any[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [selectedPlanType, setSelectedPlanType] = useState<'package' | 'membership'>('package')
    const [selectedPlan, setSelectedPlan] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [amount, setAmount] = useState('')

    useEffect(() => {
        if (!isOpen) {
            setStep(1)
            setSelectedCustomer(null)
            setSelectedPlan(null)
            setAmount('')
            setSearchQuery('')
        }
    }, [isOpen])

    useEffect(() => {
        const fetchCustomers = async () => {
            if (searchQuery.length < 2) {
                setCustomers([])
                return
            }
            const data = await getCustomersForSale(searchQuery)
            setCustomers(data)
        }
        const timer = setTimeout(fetchCustomers, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    if (!isOpen) return null

    const handleSubmit = async () => {
        if (!selectedCustomer || !selectedPlan || !amount) return
        
        setIsSubmitting(true)
        const result = await recordManualSale({
            customerId: selectedCustomer.id,
            planType: selectedPlanType,
            planId: selectedPlan.id,
            amount: Number(amount),
            paymentMethod: 'manual'
        })

        if (result.success) {
            toast('Transaction recorded successfully', 'success')
            onClose()
        } else {
            toast(result.error || 'Failed to record transaction', 'error')
        }
        setIsSubmitting(false)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-10 py-8 border-b border-zinc-50 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-charcoal uppercase tracking-tight">Record Manual Sale</h2>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                            Step {step} of 3: {step === 1 ? 'Select Customer' : step === 2 ? 'Select Product' : 'Confirm Payment'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-zinc-300" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-10">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="relative group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-300 group-focus-within:text-[#2D3282] transition-colors" />
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-16 pr-6 py-5 bg-zinc-50 border border-zinc-100 rounded-3xl text-sm font-bold placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#2D3282]/5 focus:border-[#2D3282]/20 transition-all"
                                />
                            </div>

                            <div className="space-y-3">
                                {customers.map(c => (
                                    <button 
                                        key={c.id}
                                        onClick={() => {
                                            setSelectedCustomer(c)
                                            setStep(2)
                                        }}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-zinc-50 hover:border-[#2D3282]/20 hover:bg-zinc-50 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-[#2D3282]">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-black text-charcoal">{c.full_name}</p>
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{c.email}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-zinc-200 group-hover:text-[#2D3282] transition-colors" />
                                    </button>
                                ))}
                                {searchQuery.length >= 2 && customers.length === 0 && (
                                    <p className="text-center py-10 text-[10px] font-black text-zinc-300 uppercase tracking-widest">No customers found</p>
                                )}
                                {searchQuery.length < 2 && (
                                    <div className="py-20 flex flex-col items-center gap-4 text-center">
                                        <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                                            <User className="w-8 h-8 text-zinc-100" />
                                        </div>
                                        <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest max-w-[200px]">Start typing to find a customer for this transaction</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8">
                            {/* Type Switcher */}
                            <div className="flex p-1 bg-zinc-100 rounded-2xl w-full">
                                <button 
                                    onClick={() => setSelectedPlanType('package')}
                                    className={clsx(
                                        "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        selectedPlanType === 'package' ? "bg-white text-charcoal shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                                    )}
                                >
                                    Packages
                                </button>
                                <button 
                                    onClick={() => setSelectedPlanType('membership')}
                                    className={clsx(
                                        "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        selectedPlanType === 'membership' ? "bg-white text-charcoal shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                                    )}
                                >
                                    Memberships
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {(selectedPlanType === 'package' ? packages : memberships).map(plan => (
                                    <button 
                                        key={plan.id}
                                        onClick={() => {
                                            setSelectedPlan(plan)
                                            setAmount(plan.price.toString())
                                            setStep(3)
                                        }}
                                        className="flex items-center justify-between p-6 rounded-3xl border border-zinc-50 hover:border-[#2D3282]/20 hover:bg-zinc-50 transition-all group"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#2D3282]">
                                                {selectedPlanType === 'package' ? <Package className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-black text-charcoal">{plan.name}</p>
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                                                    {plan.credits || 'Unlimited'} Credits · {plan.validity_days} Days
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-charcoal">₱{plan.price?.toLocaleString()}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-10">
                            <div className="bg-zinc-50 rounded-[2rem] p-10 flex flex-col items-center text-center gap-6">
                                <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-emerald-500">
                                    <Check className="w-10 h-10 stroke-[3]" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Confirming Sale to</p>
                                    <h4 className="text-2xl font-black text-charcoal">{selectedCustomer.full_name}</h4>
                                </div>
                                
                                <div className="w-full h-px bg-zinc-200/50" />
                                
                                <div className="w-full flex justify-between items-center text-left">
                                    <div>
                                        <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Item</p>
                                        <p className="text-sm font-bold text-charcoal">{selectedPlan.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">Type</p>
                                        <p className="text-sm font-bold text-charcoal uppercase tracking-tighter">{selectedPlanType}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Final Amount (PHP)</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-zinc-400">₱</span>
                                    <input 
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full pl-12 pr-6 py-5 bg-white border border-zinc-100 rounded-3xl text-2xl font-black text-charcoal focus:outline-none focus:ring-4 focus:ring-[#2D3282]/5 focus:border-[#2D3282] transition-all"
                                    />
                                </div>
                                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest ml-1 italic">
                                    Recording as a manual cash/bank transfer payment. Plan will be activated immediately.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-10 py-8 border-t border-zinc-50 flex items-center justify-between shrink-0 bg-zinc-50/30">
                    <button 
                        disabled={step === 1 || isSubmitting}
                        onClick={() => setStep(step - 1)}
                        className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-charcoal transition-all disabled:opacity-0"
                    >
                        Go Back
                    </button>
                    {step === 3 ? (
                        <button 
                            disabled={isSubmitting || !amount}
                            onClick={handleSubmit}
                            className="bg-[#2D3282] text-white px-12 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:opacity-90 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</>
                            ) : (
                                <>Complete Transaction</>
                            )}
                        </button>
                    ) : (
                        <div className="w-20" /> // Spacer
                    )}
                </div>
            </div>
        </div>
    )
}
