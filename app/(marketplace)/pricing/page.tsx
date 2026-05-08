'use client'

import { useState, Fragment, memo, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, X, ChevronRight, User, Users, Sparkles, Building2, HelpCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'

const tiers = [
    {
        name: 'Starter',
        description: 'For freelancers, like personal trainers and yoga teachers.',
        price: '680',
        billing: 'one location per month',
        annualTotal: 'PHP8,160',
        features: [
            '1 owner account',
            'One location only'
        ],
        cta: 'Start 1 month free trial',
        popular: false,
        dark: false
    },
    {
        name: 'Team',
        description: 'For small teams like boutique fitness and wellness studio.',
        price: '2,600',
        billing: 'per location per month',
        annualTotal: 'PHP31,200',
        features: [
            'Unlimited staff user account'
        ],
        cta: 'Start 1 month free trial',
        popular: true,
        dark: false
    },
    {
        name: 'Business',
        description: 'For medium-to-large businesses looking to scale up.',
        price: '4,400',
        billing: 'per location per month',
        annualTotal: 'PHP52,800',
        features: [
            'Unlimited staff user account'
        ],
        cta: 'Start 1 month free trial',
        popular: false,
        dark: false
    },
    {
        name: 'Enterprise',
        description: 'For large businesses that need additional security, control, and support.',
        price: 'Custom',
        billing: 'Flat price',
        features: [],
        cta: 'Contact sales',
        popular: false,
        dark: true,
        image: '/images/pricing/enterprise-illustration.png' // Illustration from screenshot
    }
]

interface Feature {
    name: string;
    values?: string[];
    isHeader?: boolean;
    info?: string;
}

interface Category {
    name: string;
    features: Feature[];
}

const comparisonCategories: Category[] = [
    {
        name: 'Key Differences',
        features: [
            { name: 'Staff account', values: ['1', 'Unlimited', 'Unlimited', 'Unlimited'], info: 'Number of staff members that can access the dashboard.' },
            { name: 'Staff role management', values: ['1 role', '3 roles (Add-on available)', 'Unlimited roles', 'Unlimited roles'] },
            { name: 'No of fixed location(s)', values: ['1', 'Unlimited (Charges per location)', 'Unlimited (Charges per location)', 'Unlimited (Charges per location)'] },
            { name: 'No of active schedule(s)', values: ['1 only without overlap', 'Unlimited with overlaps', 'Unlimited with overlaps', 'Unlimited with overlaps'] },
            { name: 'Waitlist', values: ['x', 'check', 'check', 'check'] },
            { name: 'Court Booking', values: ['x', 'check', 'check', 'check'] },
            { name: 'Spot booking', values: ['x', 'check', 'check', 'check'] },
            { name: 'Shareable packages', values: ['x', 'check', 'check', 'check'] },
            { name: 'Group booking', values: ['x', 'check', 'check', 'check'] },
            { name: 'Family account', values: ['x', 'check', 'check', 'check'] },
            { name: 'Branded mobile app', values: ['Available as add-on', 'Available as add-on', 'check', 'check'] },
            { name: 'Franchise model', values: ['x', 'Available as add-on (per outlet)', 'check', 'check'] },
        ]
    },
    {
        name: 'Business Management',
        features: [
            { name: 'Productivity Basics', isHeader: true },
            { name: 'Customer website', values: ['check', 'check', 'check', 'check'] },
            { name: 'Customer mobile app', values: [
                'Shared app (Additional cost for branded app)', 
                'Shared app (Additional cost for branded app)', 
                'Shared app & branded app', 
                'Shared app & branded app'
            ] },
            { name: 'Schedule classes, appointments, and facility access', values: ['check', 'check', 'check', 'check'] },
            { name: 'Schedule courses and events', values: [
                '2 active courses (Add-on available)', 
                '5 active courses (Add-on available)', 
                '100 active courses', 
                '100 active courses'
            ] },
            { name: 'Calendar-based scheduler', values: ['check', 'check', 'check', 'check'] },
            { name: 'Customer account management', values: ['check', 'check', 'check', 'check'] },
            { name: 'Smart tagging', values: [
                'Available as add-on', 
                'Available as add-on', 
                '10 active smart tags (Add-on available)', 
                '10 active smart tags (Add-on available)'
            ] },
            { name: 'Booking management', values: ['check', 'check', 'check', 'check'] },
            { name: 'Online class (Teleconference)', values: ['check', 'check', 'check', 'check'] },
            { name: 'QR code check-in', values: ['check', 'check', 'check', 'check'] },
            { name: 'Bluetooth beacon check-in', values: ['x', 'x', 'x', 'check'] },
            { name: 'Facial recognition check-in', values: ['x', 'x', 'x', 'check'] },
            { name: 'Igloohome Smart Door Lock Integration', values: ['Available as add-on', 'Available as add-on', 'check', 'check'] },
            
            { name: 'Staff, Leave & Payroll Management', isHeader: true },
            { name: 'Staff management', values: ['x', 'check', 'check', 'check'] },
            { name: 'Leave management', values: ['x', 'x', 'check', 'check'] },
            { name: 'Payroll and commission management', values: ['x', 'check', 'check', 'check'] },

            { name: 'Business Intelligence / Reporting', isHeader: true },
            { name: 'Dashboards', values: [
                'Filter up to 3 months of data (1-year history)', 
                'Filter up to 3 months of data (1-year history)', 
                'Filter up to 12 months of data (2-year history)', 
                'Unlimited'
            ] },
            { name: 'Sales, finance, and bookings analysis reports', values: [
                'Filter up to 3 months of data (1-year history)', 
                'Filter up to 3 months of data (1-year history)', 
                'Filter up to 12 months of data (2-year history)', 
                'Unlimited'
            ] },
            { name: 'Data export', values: ['check', 'check', 'check', 'check'] },

            { name: 'Forms', isHeader: true },
            { name: 'Custom forms', values: [
                '3 active forms (Add-on available)', 
                '5 active forms (Add-on available)', 
                '50 active forms', 
                '50 active forms'
            ] },
            { name: 'Digital waiver form', values: ['check', 'check', 'check', 'check'] },
        ]
    },
    {
        name: 'Automated Marketing',
        features: [
            { name: 'Create marketing campaigns (Email, SMS, and WhatsApp)', values: [
                'x', 
                '10 active campaigns (Add-on available)', 
                '100 active campaigns', 
                '100 active campaigns'
            ] },
            { name: 'Email broadcasts per month', values: ['x', '2,000', '5,000', '10,000'] },
            { name: 'Create ad hoc campaigns (Email, SMS, and WhatsApp)', values: ['x', 'check', 'check', 'check'] },
            { name: 'Leads management', values: ['Available as add-on', 'Available as add-on', 'check', 'check'] },
        ]
    },
    {
        name: 'Seamless Commerce',
        features: [
            { name: 'Payment', isHeader: true },
            { name: 'Invoice management', values: ['check', 'check', 'check', 'check'] },
            { name: 'Customer postpaid billing', values: ['check', 'check', 'check', 'check'] },
            { name: 'Credit card payment', values: ['check', 'check', 'check', 'check'] },
            { name: 'Local payment methods', values: ['check', 'check', 'check', 'check'] },
            { name: 'Software point of sales (POS) system', values: ['Standard', 'Standard', 'check', 'check'] },
            { name: 'Book and pay later (house account)', values: ['check', 'check', 'check', 'check'] },
            { name: 'Manual QR payment', values: ['Available as add-on', 'Available as add-on', 'check', 'check'] },
            { name: 'Store credits', values: ['check', 'check', 'check', 'check'] },

            { name: 'E-Commerce', isHeader: true },
            { name: 'Sell products', values: [
                '5 items (Add-on available)', 
                '15 items (Add-on available)', 
                '1000 items (Add-on available)', 
                'Unlimited'
            ] },
            { name: 'Rent products', values: [
                '5 items (Add-on available)', 
                '15 items (Add-on available)', 
                '1000 items (Add-on available)', 
                'Unlimited'
            ] },
            { name: '3PL delivery integration', values: ['x', 'x', 'x', 'check'] },
        ]
    },
    {
        name: 'Rewards System',
        features: [
            { name: 'Promo code(s)', values: [
                '5 active codes (Add-on available)', 
                '15 active codes (Add-on available)', 
                '100 active codes', 
                'Unlimited'
            ] },
            { name: 'Stamp card(s)', values: [
                '1 (Add-on available)', 
                '3 (Add-on available)', 
                '10', 
                'Unlimited'
            ] },
            { name: 'Points and rewards catalogue', values: ['Available as add-on', 'Available as add-on', 'check', 'check'] },
            { name: 'Referral programme', values: ['check', 'check', 'check', 'check'] },
            { name: 'Gift cards', values: ['check', 'check', 'check', 'check'] },
        ]
    },
    {
        name: 'Content and Community',
        features: [
            { name: 'Create blogs', values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
            { name: 'Add friends', values: ['x', 'x', 'check', 'check'] },
            { name: 'Community feeds', values: ['x', 'x', 'check', 'check'] },
        ]
    },
    {
        name: 'Communication',
        features: [
            { name: 'WhatsApp chat widget (customer website)', values: ['check', 'check', 'check', 'check'] },
            { name: 'Contact us form', values: ['check', 'check', 'check', 'check'] },
        ]
    },
    {
        name: 'Customer Support',
        features: [
            { name: 'Issues tracking with Studio Vault support', values: ['Email, live chat, and live video call', 'Email, live chat, and live video call', 'Email, live chat, and live video call', 'Email, live chat, and live video call'] },
        ]
    },
    {
        name: 'Mobile OTP verification',
        features: [
            { name: 'Up to 1000 OTP SMS', values: ['Contact us for pricing', 'Contact us for pricing', 'Contact us for pricing', 'Contact us for pricing'] },
        ]
    }
]

const ComparisonTable = memo(({ billingCycle }: { billingCycle: 'monthly' | 'annually' }) => {
    return (
        <div className="overflow-x-auto rounded-[2.5rem] border border-cream-100 shadow-lg overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                    <tr className="bg-[#1b1c19] text-white">
                        <th className="p-8 w-1/4">
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/70">Key Differences</span>
                        </th>
                        {tiers.map(t => (
                            <th key={t.name} className="p-8 w-[18.75%] text-center border-l border-white/10">
                                <div className="space-y-3">
                                    <h4 className="text-base font-black uppercase tracking-widest text-emerald-400">{t.name}</h4>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-white">
                                            {t.name === 'Enterprise' ? t.billing : `PHP${billingCycle === 'annually' ? (Math.floor(parseFloat(t.price.replace(',', '')) * 0.8)).toLocaleString() : t.price} / mo`}
                                        </p>
                                        {t.name !== 'Enterprise' && (
                                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Billed {billingCycle}</p>
                                        )}
                                    </div>
                                    <Button 
                                        href={t.name === 'Enterprise' ? '/contact' : `/login?mode=signup&role=studio&plan=${t.name.toLowerCase()}&billing=${billingCycle}`}
                                        variant={t.name === 'Team' ? 'forest' : 'outline'}
                                        className="mt-4 w-full"
                                        size="sm"
                                    >
                                        {t.cta}
                                    </Button>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <TableBody />
            </table>
        </div>
    )
})

const TableBody = memo(() => {
    return (
        <>
            {comparisonCategories.map(cat => (
                <tbody key={cat.name} style={{ contentVisibility: 'auto', containIntrinsicSize: '1px 500px' }}>
                    {/* Category Header (Optional styling) */}
                    <tr key={`header-${cat.name}`} className="bg-[#1b1c19] border-t border-white/5">
                        <td colSpan={5} className="p-5 px-8 text-[11px] font-black uppercase tracking-[0.5em] text-emerald-400">
                            {cat.name}
                        </td>
                    </tr>
                    {cat.features.map((f, i) => (
                        <tr 
                            key={`${cat.name}-${f.name}`} 
                            className={`${f.isHeader ? 'bg-cream-50' : i % 2 === 0 ? 'bg-white' : 'bg-cream-50/30'} border-b border-cream-100 hover:bg-forest/[0.02] group`}
                        >
                            <td className="p-6 px-8 flex items-center justify-between">
                                <span className={`${f.isHeader ? 'text-xs font-black' : 'text-[11px] font-black'} text-charcoal uppercase tracking-widest`}>
                                    {f.name}
                                </span>
                                {!f.isHeader && (
                                    <HelpCircle className="w-3.5 h-3.5 text-slate/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </td>
                            {f.isHeader ? (
                                <td colSpan={4} className="bg-cream-50"></td>
                            ) : (
                                f.values?.map((v, valIdx) => (
                                    <td key={valIdx} className="p-6 text-center border-l border-cream-100/50">
                                        <div className="flex justify-center items-center">
                                            {v === 'check' ? (
                                                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                </div>
                                            ) : v === 'x' ? (
                                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <X className="w-3 h-3 text-slate-400" />
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-black text-slate/80 uppercase tracking-widest leading-tight max-w-[120px]">
                                                    {v}
                                                    {v.includes('Add-on available') && (
                                                        <span className="block text-[9px] opacity-60 mt-1 font-bold normal-case text-forest">(Add-on available)</span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                ))
                            )}
                        </tr>
                    ))}
                </tbody>
            ))}
        </>
    )
})

ComparisonTable.displayName = 'ComparisonTable'
TableBody.displayName = 'TableBody'


export default function PricingPage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('annually')

    return (
        <div className="min-h-screen bg-white font-atelier selection:bg-forest/10 selection:text-forest">
            {/* Nav */}
            <nav 
                className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-cream-100 px-6 sm:px-12 py-5"
                style={{ transform: 'translateZ(0)' }}
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Image src="/logo4.png" alt="StudioVault" width={140} height={42} style={{ height: '36px', width: 'auto' }} priority />
                    </Link>
                    <div className="hidden md:flex items-center gap-10">
                        <Link href="/pricing" className="text-[10px] font-black uppercase tracking-[0.2em] text-forest transition-colors">Pricing</Link>
                        <Link href="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate hover:text-forest transition-colors">Partner Login</Link>
                        <Button 
                            href="/login?mode=signup&role=studio" 
                            variant="forest"
                            className="px-8 py-3.5"
                        >
                            FREE TRIAL
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-48 pb-32 px-6 overflow-hidden flex items-center">
                {/* Background Image */}
                <div 
                    className="absolute inset-0 z-0"
                    style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
                >
                    <Image 
                        src="/images/pricing/hero_bg.png"
                        alt="Studio Background"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-white/80" />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white" />
                </div>

                <div className="max-w-7xl mx-auto text-center space-y-12 relative z-10">
                    <div className="space-y-6">
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-5xl md:text-8xl font-serif text-charcoal leading-[0.9] tracking-tighter"
                        >
                            Solo, team or enterprise? <br />
                            <span className="italic !text-forest inline-block mt-2">Enjoy 1-month free trial.</span>
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-slate/80 text-lg md:text-xl max-w-2xl mx-auto font-light"
                        >
                            Book a demo with us to choose the right plan for your team.
                        </motion.p>
                    </div>

                    {/* Pricing Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-12">
                        {tiers.map((tier) => (
                            <div 
                                key={tier.name}
                                className={`rounded-[2.5rem] p-10 flex flex-col space-y-10 border transition-all hover:translate-y-[-8px] shadow-xl bg-white border-cream-100 ${
                                    tier.popular ? 'ring-4 ring-emerald-400/20 scale-[1.02] z-10' : ''
                                }`}
                            >
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-xl font-bold text-charcoal">{tier.name}</h3>
                                        {tier.popular && (
                                            <span className="bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase px-3 py-1 rounded-full">Popular</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate/60 leading-relaxed font-light min-h-[40px]">
                                        {tier.description}
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-charcoal">
                                            PHP{billingCycle === 'annually' && tier.name !== 'Enterprise' 
                                                ? (Math.floor(parseFloat(tier.price.replace(',', '')) * 0.8)).toLocaleString() 
                                                : tier.price
                                            }
                                        </span>
                                        <span className="text-[10px] text-slate/40 font-black uppercase">/ month</span>
                                    </div>
                                    <p className="text-[9px] text-slate/30 font-black uppercase tracking-widest">{tier.billing}</p>
                                </div>

                                {/* Billing Toggle UI in Cards - Wired to State */}
                                <div className="flex bg-cream-100 ring-1 ring-black/5 shadow-inner rounded-full p-1 w-full text-[9px] font-black uppercase tracking-widest text-slate/40 relative">
                                    <button 
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`flex-1 py-2 rounded-full transition-all relative z-10 ${billingCycle === 'monthly' ? 'text-white' : 'hover:text-charcoal'}`}
                                    >
                                        Pay Monthly
                                    </button>
                                    <button 
                                        onClick={() => setBillingCycle('annually')}
                                        className={`flex-1 py-2 rounded-full transition-all relative z-10 ${billingCycle === 'annually' ? 'text-white' : 'hover:text-charcoal'}`}
                                    >
                                        Pay Annually <span className="text-[7px] block opacity-60">20% OFF</span>
                                    </button>
                                    
                                    {/* Animated Background Slider */}
                                    <motion.div 
                                        className="absolute inset-y-1 bg-black rounded-full shadow-xl will-change-transform"
                                        initial={false}
                                        animate={{ 
                                            left: billingCycle === 'monthly' ? '4px' : '50%',
                                            right: billingCycle === 'monthly' ? '50%' : '4px'
                                        }}
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                </div>

                                <ul className="flex-1 space-y-5">
                                    {tier.features.map(f => (
                                        <li key={f} className="flex items-start gap-4 text-xs font-black text-slate/80 uppercase tracking-widest leading-relaxed">
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                <Check className="w-3 h-3 text-emerald-600" />
                                            </div>
                                            {f}
                                        </li>
                                    ))}
                                    <div className="pt-4 opacity-50 flex items-center justify-center">
                                        <Building2 className="w-16 h-16 text-slate/20" />
                                    </div>
                                </ul>

                                <Button 
                                    href={tier.name === 'Enterprise' ? '/contact' : `/login?mode=signup&role=studio&plan=${tier.name.toLowerCase()}&billing=${billingCycle}`}
                                    variant={tier.name === 'Team' ? 'forest' : 'outline'}
                                    className="w-full py-4"
                                >
                                    {tier.cta}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Comparison Section */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-4xl md:text-5xl font-serif text-charcoal">See how our plans compare</h2>
                        <p className="text-slate/60 text-sm max-w-2xl mx-auto font-light">
                            All our plans are designed to help you save time on daily tasks and grow your business. Explore all the features to find the plan that works for you.
                        </p>
                        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">* Features coming soon</p>
                    </div>

                    {/* Announcement Bar */}
                    <div className="bg-amber-100/50 border border-amber-200 rounded-full py-3 px-8 text-center text-amber-800 text-[10px] font-bold uppercase tracking-widest max-w-4xl mx-auto">
                        Save 20% when you pay upfront annually
                    </div>

                    {/* Table Container */}
                    <ComparisonTable billingCycle={billingCycle} />
                </div>
            </section>

            {/* Support section matching Studio Vault footer style */}
            <section className="py-24 px-6 bg-[#faf9f6] border-t border-cream-100">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    <div className="space-y-6">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-charcoal">Customer Support</h4>
                        <div className="space-y-4">
                            <p className="text-[10px] text-slate/60 font-bold uppercase tracking-widest">Issues tracking with Studio Vault support</p>
                            <p className="text-xs text-slate/80 leading-relaxed font-light italic">Email, live chat, and live video call</p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-charcoal">Mobile OTP</h4>
                        <div className="space-y-4">
                            <p className="text-[10px] text-slate/60 font-bold uppercase tracking-widest">Up to 1000 OTP SMS</p>
                            <p className="text-xs text-slate/80 leading-relaxed font-light">Contact us for pricing</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-24 px-6 bg-[#1b1c19] text-white border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="space-y-4 text-center md:text-left">
                        <Image src="/logo4.png" alt="StudioVault" width={160} height={48} style={{ height: '40px', width: 'auto' }} className="brightness-0 invert opacity-50 mx-auto md:mx-0" />
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">The Platform for Independents.</p>
                    </div>
                    <div className="flex gap-12">
                        <Link href="/" className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-forest transition-colors">Home</Link>
                        <Link href="/marketplace" className="text-[10px) font-black text-white/40 uppercase tracking-widest hover:text-forest transition-colors">Marketplace</Link>
                        <Link href="/support" className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-forest transition-colors">Support</Link>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between text-[9px] font-black text-white/10 uppercase tracking-widest gap-4 items-center">
                    <span>© 2026 StudioVault PH. All Rights Reserved.</span>
                </div>
            </footer>
        </div>
    )
}

