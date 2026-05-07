'use client'

import React, { useState } from 'react'
import { 
    Calendar, CreditCard, Gift, User, 
    Settings, LogOut, ChevronRight, Clock,
    MapPin, Ticket, Star, LayoutDashboard
} from 'lucide-react'
import { clsx } from 'clsx'
import CustomerReferralTab from '@/components/storefront/CustomerReferralTab'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import ReviewModal from '@/components/reviews/ReviewModal'

interface DashboardClientProps {
    studio: any
    profile: any
    activePlans: any[]
    bookings: any[]
    pastBookings: any[]
    referralStats: any
    referralConfig: any
    studioMembership: any
    walletTransactions: any[]
    theme: any
}

export default function DashboardClient({ 
    studio, 
    profile, 
    activePlans, 
    bookings, 
    pastBookings,
    referralStats, 
    referralConfig,
    studioMembership,
    walletTransactions,
    theme
}: DashboardClientProps) {
    const searchParams = useSearchParams()
    const initialTab = searchParams.get('tab') as any
    const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'plans' | 'referrals' | 'wallet'>(
        (initialTab && ['overview', 'bookings', 'plans', 'referrals', 'wallet'].includes(initialTab)) 
            ? initialTab 
            : 'overview'
    )
    const [reviewingBooking, setReviewingBooking] = useState<any | null>(null)

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'bookings', label: 'My Bookings', icon: Calendar },
        { id: 'plans', label: 'My Plans', icon: CreditCard },
        ...(studio.website_config?.features?.wallet_enabled !== false ? [{ id: 'wallet', label: 'My Wallet', icon: CreditCard }] : []),
        ...(referralConfig?.is_enabled ? [{ id: 'referrals', label: 'Refer & Earn', icon: Gift }] : [])
    ] as const

    return (
        <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar Navigation */}
            <aside className="w-full lg:w-64 space-y-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-4 px-2">
                        <div className="w-12 h-12 rounded-2xl bg-burgundy/10 flex items-center justify-center text-xl font-serif font-bold text-burgundy">
                            {profile.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h2 className="text-lg font-serif font-bold text-charcoal-900 leading-tight">{profile.full_name}</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-300">Member Since {new Date(profile.created_at).getFullYear()}</p>
                        </div>
                    </div>
                </div>

                <nav className="space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                                activeTab === tab.id 
                                    ? "bg-white text-burgundy shadow-tight border border-burgundy/5" 
                                    : "text-charcoal-400 hover:text-charcoal-900 hover:bg-white/50"
                            )}
                        >
                            <tab.icon className={clsx("w-4 h-4", activeTab === tab.id ? "text-burgundy" : "text-charcoal-300")} />
                            {tab.label}
                            {activeTab === tab.id && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
                        </button>
                    ))}
                </nav>

                <div className="pt-8 border-t border-charcoal-100">
                    <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 transition-all">
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
                {activeTab === 'overview' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-700">
                        {/* Summary Header */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-8 rounded-[2rem] border border-burgundy/5 shadow-tight space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-300">Active Plans</p>
                                <h4 className="text-4xl font-serif font-bold text-charcoal-900">{activePlans.length}</h4>
                            </div>
                            <div className="bg-white p-8 rounded-[2rem] border border-burgundy/5 shadow-tight space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-300">Upcoming Sessions</p>
                                <h4 className="text-4xl font-serif font-bold text-charcoal-900">{bookings.length}</h4>
                            </div>
                            {studio.website_config?.features?.wallet_enabled !== false && (
                                <div className="bg-white p-8 rounded-[2rem] border border-burgundy/5 shadow-tight space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-charcoal-300">Wallet Balance</p>
                                    <h4 className="text-4xl font-serif font-bold text-charcoal-900">₱{(studioMembership?.available_balance || 0).toLocaleString()}</h4>
                                </div>
                            )}
                            {referralConfig?.is_enabled && (
                                <div className="bg-burgundy text-white p-8 rounded-[2rem] shadow-xl shadow-burgundy/10 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Rewards Earned</p>
                                    <h4 className="text-4xl font-serif font-bold">{referralStats.earned}</h4>
                                </div>
                            )}
                        </div>

                        {/* Recent Activity Mini-Grids */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                            {/* Upcoming Session */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-serif font-bold text-charcoal-900">Next Session</h3>
                                    <button onClick={() => setActiveTab('bookings')} className="text-[10px] font-black text-burgundy uppercase tracking-widest hover:underline">View All</button>
                                </div>
                                {bookings[0] ? (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-burgundy/5 shadow-tight flex items-center gap-6">
                                        <div className="w-20 h-20 bg-burgundy/5 rounded-3xl flex flex-col items-center justify-center text-burgundy">
                                            <span className="text-[10px] font-black uppercase tracking-widest">{new Date(bookings[0].booking_date).toLocaleString('en-US', { month: 'short' })}</span>
                                            <span className="text-3xl font-serif font-bold">{new Date(bookings[0].booking_date).getDate()}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-xl font-serif font-bold text-charcoal-900">{bookings[0].slots?.display_name || bookings[0].slots?.service?.name || 'Pilates Session'}</h4>
                                            <div className="flex items-center gap-4 text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">
                                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {bookings[0].slots?.start_time}</span>
                                                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {bookings[0].slots?.instructor?.full_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-off-white p-12 rounded-[2.5rem] border border-dashed border-charcoal-100 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-300">No upcoming sessions</p>
                                        <Link href={`/s/${studio.slug}#booking`} className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline mt-4 inline-block">Book a Class →</Link>
                                    </div>
                                )}
                            </div>

                            {/* Active Plan */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-serif font-bold text-charcoal-900">Active Plan</h3>
                                    <button onClick={() => setActiveTab('plans')} className="text-[10px] font-black text-burgundy uppercase tracking-widest hover:underline">View All</button>
                                </div>
                                {activePlans[0] ? (
                                    <div className="bg-white p-8 rounded-[2.5rem] border border-burgundy/5 shadow-tight flex items-center gap-6">
                                        <div className="w-20 h-20 bg-forest/5 rounded-3xl flex items-center justify-center text-forest">
                                            <Ticket className="w-10 h-10" />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-xl font-serif font-bold text-charcoal-900">{activePlans[0].packages?.name || activePlans[0].memberships?.name}</h4>
                                            <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">
                                                {activePlans[0].remaining_credits === null ? 'Unlimited' : `${activePlans[0].remaining_credits} Credits Remaining`}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-off-white p-12 rounded-[2.5rem] border border-dashed border-charcoal-100 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-300">No active plans</p>
                                        <Link href={`/s/${studio.slug}#pricing`} className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline mt-4 inline-block">Purchase Plan →</Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Referral Quick Card */}
                        {referralConfig?.is_enabled && (
                            <div className="bg-white rounded-[2.5rem] border border-burgundy/5 shadow-tight p-8 sm:p-12 flex flex-col md:flex-row items-center gap-12 group cursor-pointer hover:border-burgundy/20 transition-all" onClick={() => setActiveTab('referrals')}>
                                <div className="flex-1 space-y-4 text-center md:text-left">
                                    <h3 className="text-3xl font-serif font-bold text-charcoal-900">Invite & Get {referralConfig.reward_discount_type === 'percentage' ? `${referralConfig.reward_discount_value}%` : `₱${referralConfig.reward_discount_value}`} Off</h3>
                                    <p className="text-sm text-charcoal-500 font-medium leading-relaxed max-w-lg">
                                        Refer your friends and family. Once they complete their first booking, we'll grant you a discount on your next package.
                                    </p>
                                    <button className="flex items-center gap-2 text-[10px] font-black text-burgundy uppercase tracking-widest group-hover:gap-4 transition-all">Get My link <ChevronRight className="w-4 h-4" /></button>
                                </div>
                                <div className="w-full md:w-32 h-32 bg-burgundy/5 rounded-[2rem] flex items-center justify-center">
                                    <Gift className="w-12 h-12 text-burgundy group-hover:scale-110 transition-transform" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'bookings' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                        <h2 className="text-3xl font-serif font-bold text-charcoal-900">Upcoming Sessions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {bookings.length === 0 ? (
                                <div className="col-span-2 bg-off-white p-12 rounded-[2.5rem] border border-dashed border-charcoal-100 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-300">No upcoming sessions</p>
                                    <Link href={`/s/${studio.slug}#booking`} className="text-[10px] font-black uppercase tracking-widest text-burgundy hover:underline mt-4 inline-block">Book a Class →</Link>
                                </div>
                            ) : (
                                bookings.map((booking) => (
                                    <div key={booking.id} className="bg-white p-8 rounded-[2.5rem] border border-burgundy/5 shadow-tight space-y-6">
                                        <div className="flex items-start justify-between">
                                            <div className="w-16 h-16 bg-burgundy/5 rounded-2xl flex flex-col items-center justify-center text-burgundy">
                                                <span className="text-[9px] font-black uppercase tracking-widest">{new Date(booking.booking_date).toLocaleString('en-US', { month: 'short' })}</span>
                                                <span className="text-2xl font-serif font-bold">{new Date(booking.booking_date).getDate()}</span>
                                            </div>
                                            <div className={clsx(
                                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                                booking.status === 'confirmed' ? "bg-forest/10 text-forest" : "bg-charcoal-100 text-charcoal-400"
                                            )}>
                                                {booking.status}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-xl font-serif font-bold text-charcoal-900">{booking.slots?.display_name || booking.slots?.service?.name || 'Class'}</h4>
                                            <div className="space-y-2">
                                                <p className="flex items-center gap-3 text-[10px] font-bold text-charcoal-400 uppercase tracking-widest"><Clock className="w-4 h-4 opacity-40" /> {booking.slots?.start_time} - {booking.slots?.end_time}</p>
                                                <p className="flex items-center gap-3 text-[10px] font-bold text-charcoal-400 uppercase tracking-widest"><User className="w-4 h-4 opacity-40" /> {booking.slots?.instructor?.full_name}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Session History */}
                        <div className="space-y-8 mt-16 pt-16 border-t border-charcoal-100">
                            <h2 className="text-3xl font-serif font-bold text-charcoal-900">Session History</h2>
                            {pastBookings.length === 0 ? (
                                <div className="bg-white p-12 rounded-[2.5rem] border border-dashed border-charcoal-100 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal-300">No past sessions yet</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {pastBookings.map((booking) => (
                                        <div key={booking.id} className="bg-white p-8 rounded-[2.5rem] border border-burgundy/5 shadow-tight space-y-6 flex flex-col">
                                            <div className="flex items-start justify-between">
                                                <div className="w-16 h-16 bg-charcoal-50 rounded-2xl flex flex-col items-center justify-center text-charcoal-400">
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{new Date(booking.booking_date).toLocaleString('en-US', { month: 'short' })}</span>
                                                    <span className="text-2xl font-serif font-bold">{new Date(booking.booking_date).getDate()}</span>
                                                </div>
                                                <div className="px-3 py-1 bg-charcoal-100/50 text-charcoal-400 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                    Past
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <h4 className="text-xl font-serif font-bold text-charcoal-900">{booking.slots?.display_name || booking.slots?.service?.name || 'Class'}</h4>
                                                <div className="space-y-2">
                                                    <p className="flex items-center gap-3 text-[10px] font-bold text-charcoal-400 uppercase tracking-widest"><Clock className="w-4 h-4 opacity-40" /> {booking.slots?.start_time}</p>
                                                    <p className="flex items-center gap-3 text-[10px] font-bold text-charcoal-400 uppercase tracking-widest"><User className="w-4 h-4 opacity-40" /> {booking.slots?.instructor?.full_name}</p>
                                                </div>
                                            </div>
                                            {(!booking.customer_reviewed_instructor || !booking.customer_reviewed_studio) && (
                                                <button 
                                                    onClick={() => setReviewingBooking(booking)}
                                                    className="w-full py-3 bg-burgundy/5 text-burgundy rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-burgundy hover:text-white transition-all shadow-tight"
                                                >
                                                    Rate Session
                                                </button>
                                            )}
                                            {(booking.customer_reviewed_instructor || booking.customer_reviewed_studio) && (
                                                <div className="w-full py-3 bg-forest/5 text-forest/60 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
                                                    Rating Submitted
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'plans' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                        <h2 className="text-3xl font-serif font-bold text-charcoal-900">My Plans & Packages</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activePlans.map((plan) => (
                                <div key={plan.id} className="bg-white p-8 rounded-[2.5rem] border border-burgundy/5 shadow-tight space-y-6 flex flex-col">
                                    <div className="flex items-center justify-between">
                                        <div className="w-12 h-12 bg-forest/5 rounded-2xl flex items-center justify-center text-forest">
                                            <Ticket className="w-6 h-6" />
                                        </div>
                                        <div className="bg-forest/10 text-forest px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Active</div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h4 className="text-xl font-serif font-bold text-charcoal-900">{plan.packages?.name || plan.memberships?.name}</h4>
                                        <p className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">
                                            {plan.remaining_credits === null ? 'Unlimited Sessions' : `${plan.remaining_credits} Sessions Remaining`}
                                        </p>
                                    </div>
                                    <div className="pt-4 border-t border-charcoal-50 flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-charcoal-300">Expires {plan.expires_at ? new Date(plan.expires_at).toLocaleDateString() : 'Never'}</span>
                                        <Link href={`/s/${studio.slug}#booking`} className="text-[10px] font-black text-burgundy uppercase tracking-widest hover:underline">Book Now</Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'referrals' && (
                    <CustomerReferralTab 
                        studio={studio}
                        profile={profile}
                        config={referralConfig}
                        stats={referralStats}
                    />
                )}

                {activeTab === 'wallet' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <h2 className="text-3xl font-serif font-bold text-charcoal-900">My Wallet</h2>
                            <div className="px-6 py-3 bg-white border border-burgundy/10 rounded-2xl shadow-tight">
                                <span className="text-[10px] font-black uppercase tracking-widest text-charcoal-300 block mb-0.5">Available Balance</span>
                                <span className="text-2xl font-serif font-bold text-burgundy">₱{(studioMembership?.available_balance || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-burgundy/5 shadow-tight overflow-hidden">
                            <div className="p-8 border-b border-burgundy/5">
                                <h3 className="text-xl font-serif font-bold text-charcoal-900">Transaction History</h3>
                                <p className="text-[10px] text-charcoal-400 font-bold uppercase tracking-widest mt-1">Logs for rewards, bookings, and adjustments</p>
                            </div>

                            {walletTransactions.length === 0 ? (
                                <div className="p-20 text-center space-y-4">
                                    <div className="w-16 h-16 bg-off-white rounded-full flex items-center justify-center mx-auto opacity-50">
                                        <CreditCard className="w-8 h-8 text-charcoal-300" />
                                    </div>
                                    <p className="text-xs font-bold text-charcoal-300 uppercase tracking-widest">No transactions yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-burgundy/5">
                                    {walletTransactions.map((tx) => (
                                        <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-off-white transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className={clsx(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                                                    tx.amount > 0 ? "bg-forest/5 border-forest/10 text-forest" : "bg-burgundy/5 border-burgundy/10 text-burgundy"
                                                )}>
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-charcoal-900">{tx.description || tx.type}</p>
                                                    <p className="text-[10px] text-charcoal-400 font-medium">{new Date(tx.created_at).toLocaleDateString()} • {tx.type}</p>
                                                </div>
                                            </div>
                                            <div className={clsx(
                                                "text-sm font-serif font-bold",
                                                tx.amount > 0 ? "text-forest" : "text-charcoal-900"
                                            )}>
                                                {tx.amount > 0 ? '+' : ''}₱{Math.abs(tx.amount).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {reviewingBooking && (
                <ReviewModal 
                    booking={reviewingBooking}
                    currentUserId={profile.id}
                    isInstructor={false}
                    onClose={() => setReviewingBooking(null)}
                    onSuccess={() => {
                        setReviewingBooking(null)
                        // Trigger a page refresh to update flags
                        window.location.reload()
                    }}
                />
            )}
        </div>
    )
}
