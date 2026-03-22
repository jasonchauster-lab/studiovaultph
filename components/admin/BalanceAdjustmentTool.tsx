'use client'

import { useState } from 'react'
import { Search, Loader2, CheckCircle, AlertCircle, User, CreditCard, MinusCircle, PlusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { adjustUserBalance } from '@/app/(dashboard)/admin/actions'
import clsx from 'clsx'

interface UserSearchResult {
    id: string
    full_name: string
    email: string
    role: string
    wallet_balance: number
    available_balance: number
}

interface BalanceAdjustmentToolProps {
    initialProfile?: any
    variant?: 'default' | 'minimal'
}

export default function BalanceAdjustmentTool({ initialProfile, variant = 'default' }: BalanceAdjustmentToolProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(initialProfile || null)

    const [amount, setAmount] = useState('')
    const [type, setType] = useState<'credit' | 'debit'>('credit')
    const [reason, setReason] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const supabase = createClient()

    const handleSearch = async () => {
        if (!searchQuery.trim()) return
        setIsSearching(true)
        setMessage(null)

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, wallet_balance, available_balance')
            .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
            .limit(5)

        setIsSearching(false)
        if (error) {
            setMessage({ type: 'error', text: 'Search failed' })
        } else {
            setSearchResults(data as UserSearchResult[])
        }
    }

    const handleAdjust = async () => {
        if (!selectedUser || !amount || !reason) return

        if (reason.trim().length < 3) {
            setMessage({ type: 'error', text: 'Please provide a more detailed reason (min 3 characters).' })
            return
        }

        const numAmount = parseFloat(amount)
        if (isNaN(numAmount) || numAmount === 0) {
            setMessage({ type: 'error', text: 'Invalid amount' })
            return
        }

        const actionText = type === 'credit' ? 'credit' : 'debit'
        const confirmed = window.confirm(`Are you sure you want to ${actionText} ₱${Math.abs(numAmount).toLocaleString()} ${type === 'credit' ? 'to' : 'from'} ${selectedUser.full_name}'s account?`)

        if (!confirmed) return

        setIsSubmitting(true)
        setMessage(null)

        const finalAmount = type === 'credit' ? Math.abs(numAmount) : -Math.abs(numAmount)
        const result = await adjustUserBalance(selectedUser.id, finalAmount, reason)

        setIsSubmitting(false)
        if (result.error) {
            setMessage({ type: 'error', text: result.error })
        } else {
            setMessage({ type: 'success', text: `Successfully ${type === 'credit' ? 'credited' : 'debited'} ₱${Math.abs(numAmount).toLocaleString()} ${type === 'credit' ? 'to' : 'from'} ${selectedUser.full_name}'s wallet.` })
            // Update local balance
            setSelectedUser({
                ...selectedUser,
                wallet_balance: (selectedUser.wallet_balance || 0) + finalAmount,
                available_balance: (selectedUser.available_balance || 0) + finalAmount
            })
            setAmount('')
            setReason('')
        }
    }

    return (
        <div className="space-y-6">
            {!selectedUser ? (
                <div className="space-y-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-burgundy/40 group-focus-within:text-forest transition-colors" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search user by name or email..."
                            className="w-full bg-stone-50 border border-stone-200 rounded-2xl py-4 pl-12 pr-4 text-burgundy text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/40 transition-all placeholder:text-burgundy/20"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-stone-200 hover:bg-stone-300 rounded-xl text-[9px] font-black uppercase tracking-widest text-burgundy/60 transition-all active:scale-95"
                        >
                            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
                        </button>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                            {searchResults.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className="w-full flex items-center justify-between p-4 bg-white border border-stone-200 rounded-[24px] hover:border-forest/30 hover:shadow-cloud transition-all text-left group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-forest/10 transition-colors">
                                            <User className="w-5 h-5 text-burgundy/40 group-hover:text-forest transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-burgundy uppercase tracking-widest">{user.full_name}</p>
                                            <p className="text-[10px] text-burgundy/40 font-bold uppercase tracking-wider mt-0.5">{user.email} • {user.role}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] text-burgundy/30 uppercase font-black tracking-widest mb-1">Available</p>
                                        <p className="text-sm font-serif text-forest">₱{(user.available_balance || 0).toLocaleString()}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className={clsx(
                    "animate-in zoom-in-95 duration-500",
                    variant === 'minimal' ? "space-y-4" : "space-y-8"
                )}>
                    {/* Selected User Header */}
                    {!(variant === 'minimal' && initialProfile) && (
                        <div className="flex items-center justify-between p-6 bg-stone-50 border border-stone-200 rounded-[32px]">
                            <div className="flex items-center gap-5">
                                <div className="w-12 h-12 rounded-full bg-forest flex items-center justify-center shadow-md">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="font-serif text-xl text-burgundy">{selectedUser.full_name}</p>
                                    <p className="text-[10px] font-black text-forest uppercase tracking-widest mt-1">Current Available: ₱{(selectedUser.available_balance || 0).toLocaleString()}</p>
                                    <p className="text-[8px] text-burgundy/30 font-black uppercase tracking-[0.2em] mt-0.5">Wallet (Legacy): ₱{(selectedUser.wallet_balance || 0).toLocaleString()}</p>
                                </div>
                            </div>
                            {!initialProfile && (
                                <button
                                    onClick={() => { setSelectedUser(null); setSearchResults([]) }}
                                    className="text-[9px] text-burgundy/40 hover:text-burgundy font-black uppercase tracking-[0.2em] transition-colors"
                                >
                                    Change User
                                </button>
                            )}
                        </div>
                    )}

                    <div className={clsx(
                        "grid gap-6",
                        variant === 'minimal' ? "grid-cols-4" : "grid-cols-2"
                    )}>
                        <div className={clsx(variant === 'minimal' ? "col-span-1" : "col-span-2 sm:col-span-1")}>
                            {variant !== 'minimal' && <label className="block text-[10px] font-black text-burgundy/40 uppercase tracking-[0.3em] mb-3 ml-2">Adjustment Type</label>}
                            <div className={clsx("flex bg-stone-50 p-1.5 rounded-[20px] border border-stone-200 shadow-tight", variant === 'minimal' && "h-12")}>
                                <button
                                    onClick={() => setType('credit')}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center rounded-[14px] transition-all",
                                        type === 'credit' ? "bg-forest text-white shadow-md active:scale-95" : "text-burgundy/40 hover:bg-stone-100"
                                    )}
                                    title="Credit"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setType('debit')}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center rounded-[14px] transition-all",
                                        type === 'debit' ? "bg-burgundy text-white shadow-md active:scale-95" : "text-burgundy/40 hover:bg-stone-100"
                                    )}
                                    title="Debit"
                                >
                                    <MinusCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className={clsx(variant === 'minimal' ? "col-span-1" : "col-span-2 sm:col-span-1")}>
                            {variant !== 'minimal' && <label className="block text-[10px] font-black text-burgundy/40 uppercase tracking-[0.3em] mb-3 ml-2">Amount</label>}
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-burgundy/30 font-black text-[10px]">₱</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0"
                                    className={clsx(
                                        "w-full bg-stone-50 border border-stone-200 rounded-[20px] pl-10 pr-6 text-burgundy font-serif text-lg focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/40 transition-all shadow-tight",
                                        variant === 'minimal' ? "h-12" : "py-4"
                                    )}
                                />
                            </div>
                        </div>

                        <div className={clsx(variant === 'minimal' ? "col-span-2" : "col-span-2")}>
                            {variant !== 'minimal' && <label className="block text-[10px] font-black text-burgundy/40 uppercase tracking-[0.3em] mb-3 ml-2">Internal Audit Note</label>}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Brief explanation for this adjustment..."
                                    className={clsx(
                                        "w-full bg-stone-50 border border-stone-200 rounded-[20px] px-6 text-burgundy text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest/40 transition-all placeholder:text-burgundy/20 shadow-tight",
                                        variant === 'minimal' ? "h-12 pr-14" : "py-4.5"
                                    )}
                                />
                                {variant === 'minimal' && (
                                    <button
                                        onClick={handleAdjust}
                                        disabled={isSubmitting || !amount || !reason}
                                        className="absolute right-1.5 top-1.5 w-9 h-9 flex items-center justify-center bg-forest text-white rounded-[14px] disabled:opacity-30 disabled:grayscale transition-all hover:brightness-110 shadow-md active:scale-95"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {variant !== 'minimal' && (
                        <div className="space-y-6 pt-4">
                            {message && (
                                <div className={clsx(
                                    "p-5 rounded-[24px] flex items-center gap-4 text-[11px] font-black uppercase tracking-widest animate-in fade-in border shadow-tight",
                                    message.type === 'success' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
                                )}>
                                    {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                                    <span>{message.text}</span>
                                </div>
                            )}

                            <button
                                onClick={handleAdjust}
                                disabled={isSubmitting || !amount || !reason}
                                className={clsx(
                                    "w-full py-5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-cloud flex items-center justify-center gap-3 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.99]",
                                    type === 'credit' ? "bg-forest shadow-forest/20" : "bg-burgundy shadow-burgundy/20"
                                )}
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        {type === 'credit' ? <PlusCircle className="w-5 h-5" /> : <MinusCircle className="w-5 h-5" />}
                                        EXECUTE AUDIT {type === 'credit' ? 'CREDIT' : 'DEBIT'}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
