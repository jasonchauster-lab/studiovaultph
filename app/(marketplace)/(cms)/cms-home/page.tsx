'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Globe, Zap, Shield, ArrowRight, Sparkles, Layout, Palette, Users, Smartphone, Star, User, Layers, Monitor, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const industries = [
    {
        id: 'pilates',
        label: 'Pilates',
        category: 'Pilates Studio',
        title: 'Precision & Control',
        description: 'Elevate your Pilates studio with a platform that understands reformer class blocks and private sessions.',
        heroImage: '/images/builder/hero_pilates.png',
        mockupImage: '/images/builder/v_pilates.png',
        accent: 'text-emerald-400',
        color: 'text-forest'
    },
    {
        id: 'yoga',
        label: 'Yoga',
        category: 'Yoga Studio',
        title: 'Flow With Ease',
        description: 'Design a tranquil digital home for your yogis. Seamlessly manage multi-instructor schedules and workshops.',
        heroImage: '/images/builder/hero_yoga.png',
        mockupImage: '/images/builder/v_yoga.png',
        accent: 'text-orange-400',
        color: 'text-orange-600'
    },
    {
        id: 'beauty',
        label: 'Beauty',
        category: 'Beauty Salon',
        title: 'Aesthetic Excellence',
        description: 'Manage appointments and product sales for your boutique spa or salon with ease.',
        heroImage: '/images/builder/hero_beauty.png',
        mockupImage: '/images/builder/v_dance.png', // Temporary until better beauty mockup
        accent: 'text-pink-400',
        color: 'text-pink-600'
    },
    {
        id: 'boxing',
        label: 'Boxing',
        category: 'MMA Club',
        title: 'Power & Performance',
        description: 'Built for high-intensity gyms. Quick checkout flows to get your fighters into the ring faster.',
        heroImage: '/images/builder/hero_boxing.png',
        mockupImage: '/images/builder/v_boxing.png',
        accent: 'text-red-500',
        color: 'text-red-700'
    },
    {
        id: 'training',
        label: 'Training',
        category: 'Personal Training',
        title: 'Results Driven',
        description: 'Empower your personal trainers with a professional home for 1-on-1 bookings.',
        heroImage: '/images/builder/hero_yoga.png', // Temporary placeholder
        mockupImage: '/images/builder/v_training.png',
        accent: 'text-blue-400',
        color: 'text-blue-700'
    }
]

export default function WebsiteBuilderSalesPage() {
    const [activeIndex, setActiveIndex] = useState(0)
    const [scrolled, setScrolled] = useState(false)
    const AUTO_PLAY_DURATION = 5000 // 5 seconds

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Unified Sync Engine - One timer to rule them all
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveIndex(prev => (prev + 1) % industries.length)
        }, 5000)

        return () => clearInterval(timer)
    }, [])

    const activeIndustry = industries[activeIndex]


    return (
        <div className="min-h-screen bg-white selection:bg-forest/10 selection:text-forest overflow-x-hidden font-atelier">
            {/* Header / Nav */}
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 border-b ${
                scrolled 
                ? 'bg-white border-cream-100 py-5' 
                : 'bg-transparent border-transparent py-8'
            } px-6 sm:px-12`}
            style={{ transform: 'translateZ(0)' }}
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Image 
                            src="/logo4.png" 
                            alt="StudioVault" 
                            width={160} 
                            height={48} 
                            className={`h-12 w-auto transition-all ${!scrolled ? 'brightness-0 invert' : ''}`} 
                            priority
                            loading="eager"
                        />
                    </Link>
                    <div className="hidden md:flex items-center gap-10">
                        <Link href="#features" className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                            scrolled ? 'text-slate hover:text-forest' : 'text-white/70 hover:text-white'
                        }`}>Features</Link>
                        <Link href="#pricing" className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                            scrolled ? 'text-slate hover:text-forest' : 'text-white/70 hover:text-white'
                        }`}>Pricing</Link>
                        <Link href="/login" className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                            scrolled ? 'text-slate hover:text-forest' : 'text-white/70 hover:text-white'
                        }`}>Partner Login</Link>
                        <Link 
                            href="/pricing" 
                            className={`${
                                scrolled ? 'bg-forest' : 'bg-white/10 hover:bg-white/20'
                            } text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95`}
                        >
                            FREE TRIAL
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section - Cinematic Lifestyle Slider */}
            <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-charcoal">
                {/* Background Slider */}
                <div className="absolute inset-0 z-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIndustry.id}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute inset-0"
                        >
                            <Image 
                                src={activeIndustry.heroImage}
                                alt={activeIndustry.category}
                                fill
                                className="object-cover"
                                priority
                                sizes="100vw"
                            />
                            <div className="absolute inset-0 bg-charcoal/40" style={{ transform: 'translateZ(0)' }} />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top right, #1b1c19 0%, rgba(27, 28, 25, 0.4) 50%, transparent 100%)', transform: 'translateZ(0)' }} />
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 w-full flex flex-col lg:flex-row items-center gap-16 md:gap-24">
                    <div className="flex-1 space-y-10 text-center lg:text-left">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-3 bg-white/10 border border-white/20 px-4 py-2 rounded-full"
                            style={{ transform: 'translateZ(0)' }}
                        >
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#34d399]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Professional Management for Studio Owners</span>
                        </motion.div>

                        <div className="space-y-4">
                            <motion.h1 
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.8 }}
                                className="text-5xl md:text-[5.5rem] font-serif !text-white leading-[0.9] tracking-tighter"
                            >
                                #1 Software <br />
                                for Your <br />
                                <div className="h-[1.1em] overflow-hidden relative inline-block align-bottom min-w-[300px]">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeIndustry.category}
                                            initial={{ y: 50, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -50, opacity: 0 }}
                                            transition={{ type: "spring", damping: 15, stiffness: 100 }}
                                            className={`${activeIndustry.accent} italic`}
                                        >
                                            {activeIndustry.category}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </motion.h1>
                        </div>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg md:text-xl text-white/70 max-w-xl leading-relaxed font-light mx-auto lg:mx-0"
                        >
                            Manage smarter, not harder, with software that's always in your corner. From booking and membership management to branding and website creation.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-6 pt-4 justify-center lg:justify-start"
                        >
                            <Link 
                                href="/pricing" 
                                className="bg-forest text-white px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(0,131,88,0.3)] hover:translate-y-[-4px] transition-all flex items-center justify-center gap-3"
                            >
                                FREE TRIAL
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <Link 
                                href="#pricing" 
                                className="bg-white/10 text-white border border-white/20 px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-white/20 transition-all flex items-center justify-center gap-3"
                            >
                                Learn More
                            </Link>
                        </motion.div>
                    </div>

                    <motion.div 
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, type: "spring", damping: 20 }}
                        className="hidden lg:block flex-1 relative"
                    >
                        <div className="relative z-10 w-full max-w-[500px] mx-auto perspective-1000">
                            <motion.div
                                key={activeIndustry.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8 }}
                                className="relative bg-white/5 border-4 border-white/10 rounded-[3rem] overflow-hidden shadow-2xl aspect-[4/5] lg:aspect-auto"
                            >
                                <Image 
                                    src={activeIndustry.mockupImage}
                                    alt={activeIndustry.title}
                                    width={600}
                                    height={750}
                                    sizes="(max-width: 1024px) 100vw, 500px"
                                    className="object-cover h-full w-full"
                                    priority
                                />
                            </motion.div>
                        </div>
                    </motion.div>
                </div>

                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-20">
                    {industries.map((_, i) => (
                        <div 
                            key={i}
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                                activeIndex === i ? 'w-10 bg-emerald-400' : 'w-2 bg-white/20'
                            }`}
                        />
                    ))}
                </div>
            </section>

            {/* Value Props - High Contrast Grid */}
            <section id="features" className="py-32 px-6 bg-white border-b border-cream-100">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-24">
                        <div className="space-y-6">
                            <div className="w-12 h-12 bg-forest/10 rounded-2xl flex items-center justify-center">
                                <Shield className="w-6 h-6 text-forest" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-serif !text-charcoal tracking-tight">Establish Authority</h3>
                            <p className="text-sm md:text-base text-slate font-medium leading-relaxed">
                                Enhance your brand credibility with a custom domain. Personalize every detail—logos, colors, fonts—to capture your studio's essence.
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="w-12 h-12 bg-burgundy/10 rounded-2xl flex items-center justify-center">
                                <Zap className="w-6 h-6 text-burgundy" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-serif !text-charcoal tracking-tight">0% Platform Fees</h3>
                            <p className="text-sm md:text-base text-slate font-medium leading-relaxed">
                                Stop sharing your revenue. Direct bookings through your standalone storefront incur zero platform convenience fees. Capture 100% of your value.
                            </p>
                        </div>
                        <div className="space-y-6">
                            <div className="w-12 h-12 bg-charcoal/10 rounded-2xl flex items-center justify-center">
                                <Globe className="w-6 h-6 text-charcoal" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-serif !text-charcoal tracking-tight">Seamless Client Journey</h3>
                            <p className="text-sm md:text-base text-slate font-medium leading-relaxed">
                                A singular destination for your clients. Memberships, class bookings, and digital products, all within your own branded ecosystem.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Alternating Feature 1: Mobile First */}
            <section className="py-24 md:py-48 px-6 bg-[#faf9f6]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-24">
                    <div className="flex-1 space-y-8 order-2 md:order-1">
                        <div className="bg-white rounded-3xl p-6 shadow-ambient max-w-lg mx-auto md:mx-0">
                            <Image 
                                src="/images/builder/studio-lifestyle.png"
                                alt="Studio Interior"
                                width={600}
                                height={400}
                                sizes="(max-width: 768px) 100vw, 600px"
                                className="rounded-2xl"
                            />
                        </div>
                    </div>
                    <div className="flex-1 space-y-10 order-1 md:order-2">
                        <div className="inline-flex items-center gap-2 text-forest bg-forest/5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Native Experience
                        </div>
                        <h2 className="text-4xl md:text-6xl font-serif !text-charcoal leading-tight tracking-tight">
                            Your very own app <br />
                            <span className="italic">without the store friction.</span>
                        </h2>
                        <p className="text-lg md:text-xl text-slate font-normal leading-relaxed">
                            Embrace the future of digital branding. Our storefronts act as high-performance progressive web apps, giving your clients the speed of a native app with the accessibility of a URL.
                        </p>
                        <div className="grid grid-cols-2 gap-8 pt-4">
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-charcoal">Installable PWA</h4>
                                <p className="text-xs text-slate/70">Clients can save your shop directly to their home screen.</p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-charcoal">Apple Pay Ready</h4>
                                <p className="text-xs text-slate/70">One-tap checkout for maximum conversion rates.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>




            {/* Full Width Showcase - Studio Vault Centered Style */}
            <section className="py-48 px-6 bg-[#1b1c19] text-white text-center overflow-hidden">
                <div className="max-w-3xl mx-auto space-y-10 relative z-10">
                    <h2 className="text-5xl md:text-8xl font-serif !text-white leading-tight tracking-tighter">Your Studio. <br /> Your Rules.</h2>
                    <p className="text-lg md:text-xl text-white/50 leading-relaxed font-light">
                        StudioVault’s branding engine isn’t just a skin—it’s a complete structural shift. We handle the heavy lifting of scheduling and payments, while you take center stage.
                    </p>
                    <div className="pt-10">
                        <Link 
                            href="/pricing" 
                            className="bg-forest text-white px-12 py-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-xl hover:scale-105 transition-all inline-flex items-center gap-4"
                        >
                            FREE TRIAL
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                {/* Overlapping Mockup - Studio Dashboard */}
                <div className="max-w-7xl mx-auto mt-32 relative px-4 text-left">
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="relative z-10 max-w-5xl mx-auto"
                    >
                         <Image 
                            src="/images/builder/dashboard-mockup.png"
                            alt="StudioVault Dashboard"
                            width={1100}
                            height={730}
                            sizes="(max-width: 1200px) 100vw, 1100px"
                            className="rounded-[2.5rem] shadow-2xl border-8 border-white/5 mx-auto"
                        />
                    </motion.div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-forest/20 blur-[150px] opacity-20 rounded-full" />
                </div>
            </section>

            {/* Pricing Section - Studio Vault Inspired Comparison */}
            <section id="pricing" className="py-48 px-6 bg-white relative">
                <div className="max-w-7xl mx-auto space-y-24">
                    <div className="text-center space-y-6">
                        <div className="inline-flex items-center gap-2 text-burgundy bg-burgundy/5 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                            Simple & Transparent
                        </div>
                        <h2 className="text-5xl md:text-8xl font-serif !text-charcoal tracking-tight">Growth-Ready <span className="italic !text-forest">Pricing.</span></h2>
                        <p className="text-slate uppercase text-[10px] font-black tracking-[0.4em]">Billed per Location</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                        {/* STARTER TIER */}
                        <div className="bg-white rounded-[40px] p-12 border border-cream-200 shadow-sm flex flex-col space-y-12 hover:border-forest/30 transition-all group lg:scale-95">
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-black uppercase tracking-[0.2em] text-slate/50">Starter</h3>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-serif text-charcoal">₱999</span>
                                            <span className="text-sm text-slate font-black">/ MO</span>
                                        </div>
                                    </div>
                                    <div className="w-14 h-14 bg-cream-50 rounded-2xl flex items-center justify-center text-slate hover:bg-forest/5 hover:text-forest transition-colors">
                                        <User className="w-6 h-6" />
                                    </div>
                                </div>
                                <p className="text-sm text-slate leading-relaxed font-light">The Essentials for Solo Pros. Launch your whitelabel storefront and start building your independent brand today.</p>
                            </div>

                            <div className="h-px bg-cream-100 w-full" />

                            <ul className="flex-1 space-y-5">
                                {[
                                    '100% Whitelabel Storefront',
                                    'Zero-Fee Booking Logic',
                                    '1 Owner Account',
                                    'Marketplace Listing',
                                    'SEO Optimized Builder'
                                ].map(f => (
                                    <li key={f} className="flex items-center gap-4 text-xs font-black text-charcoal uppercase tracking-widest">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-emerald-600" />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                                <li className="flex items-center gap-4 text-[10px] font-black text-slate uppercase tracking-widest line-through">
                                    <div className="w-5 h-5 rounded-full bg-cream-100 flex items-center justify-center">
                                        <ArrowRight className="w-3 h-3 text-slate/30" />
                                    </div>
                                    Custom Domain Support
                                </li>
                            </ul>

                            <Link href="/studio" className="w-full py-6 rounded-2xl bg-[#f0f0f0] text-charcoal text-[11px] font-black uppercase tracking-[0.3em] text-center hover:bg-cream-100 transition-all font-black">
                                Select Starter
                            </Link>
                        </div>

                        {/* PRO TIER */}
                        <div className="bg-[#1b1c19] rounded-[40px] p-12 border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.3)] flex flex-col space-y-12 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-forest/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                            
                            <div className="space-y-6 relative z-10">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-black uppercase tracking-[0.2em] text-forest">Pro</h3>
                                            <span className="bg-forest text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Tier 2</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-serif text-white">₱1,500</span>
                                            <span className="text-sm text-white/40 font-black">/ MO</span>
                                        </div>
                                    </div>
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-white transition-all shadow-xl">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                </div>
                                <p className="text-sm text-white/50 leading-relaxed font-light">The Growth Engine for Studios. Unlock custom domains, unlimited staff, and advanced SEO to scale your business.</p>
                            </div>

                            <div className="h-px bg-white/10 w-full" />

                            <ul className="flex-1 space-y-5 relative z-10">
                                {[
                                    'Everything in Starter',
                                    'Unlimited Staff Accounts',
                                    'Custom Domain Support',
                                    'Priority Concierge Setup',
                                    'Dominate Local Search (SEO)'
                                ].map(f => (
                                    <li key={f} className="flex items-center gap-4 text-xs font-black text-white uppercase tracking-widest">
                                        <div className="w-5 h-5 rounded-full bg-forest flex items-center justify-center shadow-[0_0_15px_rgba(0,214,121,0.4)]">
                                            <Check className="w-3 h-3 text-[#1b1c19]" />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <Link href="/studio" className="relative z-10 w-full py-6 rounded-2xl bg-forest text-white text-[11px] font-black uppercase tracking-[0.3em] text-center hover:brightness-110 transition-all shadow-xl font-black">
                                Upgrade to Pro
                            </Link>

                            {/* Background Texture */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Minimal Footer */}
            <footer className="py-24 px-6 bg-[#1b1c19] border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
                    <div className="space-y-4 text-center md:text-left">
                        <Image 
                            src="/logo4.png" 
                            alt="StudioVault" 
                            width={140} 
                            height={42} 
                            className="h-10 w-auto brightness-0 invert opacity-50 mx-auto md:mx-0" 
                            loading="lazy"
                        />
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">The Platform for Independents.</p>
                    </div>
                    <div className="flex gap-12">
                        <Link href="/" className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-forest transition-colors">Home</Link>
                        <Link href="/marketplace" className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-forest transition-colors">Marketplace</Link>
                        <Link href="/support" className="text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-forest transition-colors">Support</Link>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between text-[9px] font-black text-white/10 uppercase tracking-widest gap-4 items-center">
                    <span>© 2026 StudioVault PH. All Rights Reserved.</span>
                    <div className="flex gap-8">
                        <Link href="/privacy" className="hover:text-white/30">Privacy</Link>
                        <Link href="/terms" className="hover:text-white/30">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}

