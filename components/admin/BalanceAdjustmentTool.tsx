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
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search user by name or email..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-rose-gold/50 transition-all"
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md text-xs font-bold transition-colors"
                        >
                            {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
                        </button>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="space-y-2 animate-in fade-in duration-300">
                            {searchResults.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => setSelectedUser(user)}
                                    className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-rose-gold/20 flex items-center justify-center">
                                            <User className="w-4 h-4 text-rose-gold" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{user.full_name}</p>
                                            <p className="text-[10px] text-white/50">{user.email} • {user.role}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-white/40 uppercase font-bold">Available</p>
                                        <p className="text-xs font-mono text-rose-gold">₱{(user.available_balance || 0).toLocaleString()}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className={clsx(
                    "animate-in zoom-in-95 duration-300",
                    variant === 'minimal' ? "space-y-3" : "space-y-6"
                )}>
                    {/* Selected User Header - Hide in minimal if we have initialProfile */}
                    {!(variant === 'minimal' && initialProfile) && (
                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-rose-gold flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-white">{selectedUser.full_name}</p>
                                    <p className="text-xs text-white/50">Current Available: ₱{(selectedUser.available_balance || 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-white/30">Wallet (Legacy): ₱{(selectedUser.wallet_balance || 0).toLocaleString()}</p>
                                </div>
                            </div>
                            {!initialProfile && (
                                <button
                                    onClick={() => { setSelectedUser(null); setSearchResults([]) }}
                                    className="text-[10px] text-white/40 hover:text-white underline uppercase tracking-widest font-bold"
                                >
                                    Change User
                                </button>
                            )}
                        </div>
                    )}

                    <div className={clsx(
                        "grid gap-3",
                        variant === 'minimal' ? "grid-cols-4" : "grid-cols-2"
                    )}>
                        <div className={clsx(variant === 'minimal' ? "col-span-1" : "col-span-2 sm:col-span-1")}>
                            {variant !== 'minimal' && <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Type</label>}
                            <div className={clsx("flex bg-charcoal/50 p-1 rounded-xl border border-white/10", variant === 'minimal' && "h-10")}>
                                <button
                                    onClick={() => setType('credit')}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center rounded-lg transition-all",
                                        type === 'credit' ? "bg-green-600 text-white shadow-sm" : "text-white/40 hover:bg-white/5"
                                    )}
                                    title="Credit"
                                >
                                    <PlusCircle className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setType('debit')}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center rounded-lg transition-all",
                                        type === 'debit' ? "bg-red-600 text-white shadow-sm" : "text-white/40 hover:bg-white/5"
                                    )}
                                    title="Debit"
                                >
                                    <MinusCircle className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className={clsx(variant === 'minimal' ? "col-span-1" : "col-span-2 sm:col-span-1")}>
                            {variant !== 'minimal' && <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Amount</label>}
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="₱0"
                                className={clsx(
                                    "w-full bg-charcoal/50 border border-white/10 rounded-xl px-3 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-rose-gold/50 transition-all text-center",
                                    variant === 'minimal' ? "h-10" : "py-3"
                                )}
                            />
                        </div>

                        <div className={clsx(variant === 'minimal' ? "col-span-2" : "col-span-2")}>
                            {variant !== 'minimal' && <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Reason</label>}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Note..."
                                    className={clsx(
                                        "w-full bg-charcoal/50 border border-white/10 rounded-xl px-4 text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-rose-gold/50 transition-all",
                                        variant === 'minimal' ? "h-10 pr-10" : "py-3"
                                    )}
                                />
                                {variant === 'minimal' && (
                                    <button
                                        onClick={handleAdjust}
                                        disabled={isSubmitting || !amount || !reason}
                                        className="absolute right-1 top-1 w-8 h-8 flex items-center justify-center bg-rose-gold text-white rounded-lg disabled:opacity-30 disabled:grayscale transition-all hover:brightness-110 shadow-sm"
                                    >
                                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {variant !== 'minimal' && (
                        <>
                            {message && (
                                <div className={clsx(
                                    "p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in border",
                                    message.type === 'success' ? "bg-green-600/20 text-green-400 border-green-600/30" : "bg-red-600/20 text-red-400 border-red-600/30"
                                )}>
                                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    {message.text}
                                </div>
                            )}

                            <button
                                onClick={handleAdjust}
                                disabled={isSubmitting || !amount || !reason}
                                className={clsx(
                                    "w-full py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-white disabled:opacity-50 disabled:cursor-not-allowed",
                                    type === 'credit' ? "bg-green-600 hover:bg-green-500 shadow-green-900/40" : "bg-red-600 hover:bg-red-500 shadow-red-900/40"
                                )}
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Execute ${type === 'credit' ? 'Credit' : 'Debit'}`}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
