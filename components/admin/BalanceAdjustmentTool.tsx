'use client'

import { useState } from 'react'
import { Search, Loader2, CheckCircle, AlertCircle, User, CreditCard, MinusCircle, PlusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { adjustUserBalance } from '@/app/(dashboard)/admin/actions'

interface UserSearchResult {
    id: string
    full_name: string
    email: string
    role: string
    wallet_balance: number
}

export default function BalanceAdjustmentTool() {
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)

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
            .select('id, full_name, email, role, wallet_balance')
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
                wallet_balance: (selectedUser.wallet_balance || 0) + finalAmount
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
                                        <p className="text-xs font-mono text-rose-gold">₱{(user.wallet_balance || 0).toLocaleString()}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 animate-in zoom-in-95 duration-300">
                    {/* Selected User Header */}
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-gold flex items-center justify-center">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-white">{selectedUser.full_name}</p>
                                <p className="text-xs text-white/50">Current Balance: ₱{(selectedUser.wallet_balance || 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => { setSelectedUser(null); setSearchResults([]) }}
                            className="text-[10px] text-white/40 hover:text-white underline uppercase tracking-widest font-bold"
                        >
                            Change User
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Adjustment Type</label>
                            <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                                <button
                                    onClick={() => setType('credit')}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${type === 'credit' ? 'bg-green-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Credit
                                </button>
                                <button
                                    onClick={() => setType('debit')}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${type === 'debit' ? 'bg-red-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                                >
                                    <MinusCircle className="w-4 h-4" />
                                    Debit
                                </button>
                            </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Amount (₱)</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-gold/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Reason (Publicly visible to user)</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Offline Viber Settlement, Promo Credit, etc."
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-gold/50 transition-all"
                            />
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-in fade-in ${message.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-red-600/20 text-red-400 border border-red-600/30'}`}>
                            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            {message.text}
                        </div>
                    )}

                    <button
                        onClick={handleAdjust}
                        disabled={isSubmitting || !amount || !reason}
                        className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${type === 'credit' ? 'bg-green-600 hover:bg-green-500 shadow-green-900/40' : 'bg-red-600 hover:bg-red-500 shadow-red-900/40'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : `Execute ${type === 'credit' ? 'Credit' : 'Debit'}`}
                    </button>
                </div>
            )}
        </div>
    )
}
