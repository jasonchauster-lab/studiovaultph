import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import ReferralCard from '@/components/customer/ReferralCard'
import { Gift, Users, CheckCircle, Wallet, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const BACK_HREF: Record<string, string> = {
    customer: '/customer',
    instructor: '/instructor',
    studio: '/studio',
    admin: '/admin',
}

export default async function ReferralPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const headersList = await headers()
    const origin = `${headersList.get('x-forwarded-proto') ?? 'http'}://${headersList.get('host') ?? 'localhost:3000'}`

    const [{ data: profile }, { data: referralHistory }] = await Promise.all([
        supabase.from('profiles').select('referral_code, role').eq('id', user.id).single(),
        supabase
            .from('wallet_top_ups')
            .select('id, amount, admin_notes, created_at')
            .eq('user_id', user.id)
            .eq('type', 'referral_bonus')
            .eq('status', 'approved')
            .order('created_at', { ascending: false }),
    ])

    const backHref = BACK_HREF[profile?.role ?? 'customer'] ?? '/customer'
    const totalEarned = (referralHistory ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)

    return (
        <div className="min-h-screen p-8 lg:p-12">
            <div className="max-w-2xl mx-auto space-y-10">

                {/* Header */}
                <div>
                    <Link
                        href={backHref}
                        className="inline-flex items-center gap-3 text-[10px] font-black text-charcoal/20 hover:text-burgundy uppercase tracking-[0.3em] transition-all mb-8 group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-2xl sm:text-5xl font-serif text-burgundy tracking-tighter mb-2">Refer a Friend</h1>
                    <p className="text-[10px] font-black text-muted-burgundy uppercase tracking-[0.4em]">Earn ₱50 for every successful referral</p>
                </div>

                {/* Referral Link Card */}
                {profile?.referral_code && (
                    <ReferralCard referralCode={profile.referral_code} origin={origin} />
                )}

                {/* Earnings Summary */}
                {(referralHistory ?? []).length > 0 && (
                    <div className="earth-card p-6 bg-white">
                        <p className="text-[10px] font-black text-muted-burgundy uppercase tracking-[0.3em] mb-4">Your Referral Earnings</p>
                        <p className="text-4xl font-serif text-burgundy mb-6">₱{totalEarned.toLocaleString()}</p>
                        <div className="space-y-3">
                            {referralHistory!.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between py-2.5 border-b border-border-grey last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-burgundy">Referral Bonus</p>
                                        <p className="text-[10px] text-muted-burgundy mt-0.5">
                                            {new Date(entry.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-green-700">+₱{entry.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* How it Works */}
                <div className="earth-card p-6 bg-white space-y-6">
                    <h2 className="text-lg font-serif font-bold text-burgundy">How It Works</h2>
                    <div className="space-y-5">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-buttermilk border border-burgundy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[11px] font-black text-burgundy">1</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-burgundy">Share your link</p>
                                <p className="text-xs text-muted-burgundy mt-1 leading-relaxed">Copy your unique referral link above and share it with friends, family, or anyone who loves Pilates.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-buttermilk border border-burgundy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[11px] font-black text-burgundy">2</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-burgundy">Friend signs up</p>
                                <p className="text-xs text-muted-burgundy mt-1 leading-relaxed">Your friend clicks your link and creates a new PilatesBridge account. Their account is automatically linked to you.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-buttermilk border border-burgundy/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-[11px] font-black text-burgundy">3</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-burgundy">They complete their first booking</p>
                                <p className="text-xs text-muted-burgundy mt-1 leading-relaxed">Once their first session is marked <span className="font-semibold text-burgundy">Completed</span>, ₱50 is instantly credited to your PilatesBridge wallet — no waiting, no forms.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Terms & Conditions */}
                <div className="earth-card p-6 bg-white space-y-4">
                    <h2 className="text-lg font-serif font-bold text-burgundy">Terms &amp; Conditions</h2>
                    <ul className="space-y-2.5 text-xs text-muted-burgundy leading-relaxed">
                        <li className="flex gap-2">
                            <span className="text-burgundy font-bold mt-0.5">·</span>
                            The ₱50 reward is credited <span className="font-semibold text-burgundy">&nbsp;only after your referred friend's first booking is marked Completed</span> by their instructor or studio. Sign-ups alone do not trigger the reward.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-burgundy font-bold mt-0.5">·</span>
                            There is no limit to how many friends you can refer. Each successful referral earns you ₱50.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-burgundy font-bold mt-0.5">·</span>
                            Each referred friend can only be credited to one referrer. The referral is attributed to the link used at sign-up — it cannot be changed retroactively.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-burgundy font-bold mt-0.5">·</span>
                            Self-referrals are not permitted. You cannot refer yourself using your own code.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-burgundy font-bold mt-0.5">·</span>
                            Referral bonuses are credited to your PilatesBridge wallet and can be used to pay for any session bookings on the platform.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-burgundy font-bold mt-0.5">·</span>
                            PilatesBridge reserves the right to withhold or reverse referral bonuses if fraudulent activity is detected (e.g., fake accounts, coordinated abuse).
                        </li>
                        <li className="flex gap-2">
                            <span className="text-burgundy font-bold mt-0.5">·</span>
                            These terms may be updated at any time. Continued use of the referral program constitutes acceptance of the current terms.
                        </li>
                    </ul>
                </div>

            </div>
        </div>
    )
}
