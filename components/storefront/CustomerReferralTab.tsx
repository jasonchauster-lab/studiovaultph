'use client'

import React, { useState } from 'react'
import { Gift, Copy, Check, Users, Trophy, ArrowRight, Share2, Info } from 'lucide-react'
import { clsx } from 'clsx'

interface CustomerReferralTabProps {
    studio: any
    profile: any
    config: any
    stats: any
}

export default function CustomerReferralTab({ studio, profile, config, stats }: CustomerReferralTabProps) {
    const [copied, setCopied] = useState(false)
    
    // Generate the referral link
    // It should point to the studio's home page with the ref code
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const studioUrl = `${baseUrl}/s/${studio.slug}`
    const referralUrl = `${studioUrl}?ref=${profile.referral_code}`

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const rewardText = config.reward_discount_type === 'percentage'
        ? `${config.reward_discount_value}% OFF`
        : `₱${config.reward_discount_value} OFF`

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-burgundy/5 border border-burgundy/10 p-8 sm:p-12">
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-burgundy/5 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-forest/5 rounded-full blur-3xl opacity-30" />

                <div className="relative z-10 flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1 space-y-6 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-burgundy/10 shadow-sm">
                            <Gift className="w-4 h-4 text-burgundy" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-burgundy">Referral Program</span>
                        </div>
                        
                        <h2 className="text-4xl sm:text-5xl font-serif font-bold text-charcoal-900 tracking-tight leading-[1.1]">
                            Share the love, <br />
                            <span className="text-burgundy italic">get rewarded.</span>
                        </h2>
                        
                        <p className="text-sm sm:text-lg text-charcoal-500 font-medium leading-relaxed max-w-lg">
                            Invite your friends to <span className="text-burgundy font-bold">{studio.name}</span>. 
                            When they complete their first booking, you'll receive <span className="text-burgundy font-black">{rewardText}</span> on your next purchase.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <div className="flex-1 bg-white border border-burgundy/10 rounded-2xl p-1 pl-6 flex items-center shadow-tight">
                                <span className="text-xs font-bold text-charcoal-400 truncate flex-1">{referralUrl}</span>
                                <button 
                                    onClick={handleCopy}
                                    className="px-6 py-4 bg-charcoal-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-burgundy transition-all flex items-center gap-2"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-1/3 grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-3xl p-6 border border-burgundy/5 shadow-tight space-y-2 text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-charcoal-300">Total Referrals</p>
                            <h4 className="text-3xl font-serif font-bold text-burgundy">{stats.total}</h4>
                        </div>
                        <div className="bg-white rounded-3xl p-6 border border-burgundy/5 shadow-tight space-y-2 text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-charcoal-300">Earned Rewards</p>
                            <h4 className="text-3xl font-serif font-bold text-forest">{stats.earned}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Program Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-burgundy/5 shadow-tight space-y-4">
                    <div className="w-12 h-12 bg-burgundy/5 rounded-2xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-burgundy" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-charcoal-900">1. Invite Friends</h3>
                    <p className="text-xs text-charcoal-500 leading-relaxed font-medium">
                        Send your unique link to friends who haven't visited {studio.name} yet.
                    </p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-burgundy/5 shadow-tight space-y-4">
                    <div className="w-12 h-12 bg-burgundy/5 rounded-2xl flex items-center justify-center">
                        <Share2 className="w-6 h-6 text-burgundy" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-charcoal-900">2. They Sign Up & Book</h3>
                    <p className="text-xs text-charcoal-500 leading-relaxed font-medium">
                        Your friend uses your link to create an account and completes their first paid session.
                    </p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-burgundy/5 shadow-tight space-y-4">
                    <div className="w-12 h-12 bg-burgundy/5 rounded-2xl flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-burgundy" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-charcoal-900">3. You Get Rewarded</h3>
                    <p className="text-xs text-charcoal-500 leading-relaxed font-medium">
                        Once their booking is completed, {rewardText} is automatically applied to your next package purchase.
                    </p>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-[2rem] border border-burgundy/5 shadow-tight overflow-hidden">
                <div className="p-8 border-b border-burgundy/5 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-serif font-bold text-charcoal-900">Referral History</h3>
                        <p className="text-[10px] text-charcoal-400 font-bold uppercase tracking-widest mt-1">Track your progress and rewards</p>
                    </div>
                    <button className="text-[10px] font-black text-burgundy uppercase tracking-widest hover:underline flex items-center gap-2">
                        View Terms <Info className="w-3.5 h-3.5" />
                    </button>
                </div>

                {stats.referrals.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-off-white rounded-full flex items-center justify-center mx-auto opacity-50">
                            <Users className="w-8 h-8 text-charcoal-300" />
                        </div>
                        <p className="text-xs font-bold text-charcoal-300 uppercase tracking-widest">No referrals recorded yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-burgundy/5">
                        {stats.referrals.map((ref: any) => (
                            <div key={ref.id} className="p-6 flex items-center justify-between hover:bg-off-white transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-off-white flex items-center justify-center text-xs font-serif font-bold text-burgundy border border-burgundy/5 group-hover:bg-white transition-all">
                                        {ref.referred?.full_name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-charcoal-900">{ref.referred?.full_name || 'Anonymous friend'}</p>
                                        <p className="text-[10px] text-charcoal-400 font-medium">Joined {new Date(ref.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className={clsx(
                                        "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                        ref.status === 'rewarded' ? "bg-forest/10 text-forest" : "bg-charcoal-100 text-charcoal-400"
                                    )}>
                                        {ref.status === 'rewarded' ? 'Reward Granted' : 'Pending Booking'}
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-charcoal-200" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function ChevronRight({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>
    )
}
