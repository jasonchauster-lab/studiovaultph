'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, MapPin, DollarSign, User, Sparkles, TrendingUp, ShieldCheck, Award } from 'lucide-react'
import clsx from 'clsx'
import RoleSelectionModal from '@/components/auth/RoleSelectionModal'

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-alabaster selection:bg-sage/20 selection:text-charcoal relative">
      <div className="fixed inset-0 bg-white/50 animate-mesh -z-10 pointer-events-none" />
      <RoleSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Navigation */}
      <div className="sticky top-0 z-50 w-full px-6 py-4">
        <nav className="max-w-7xl mx-auto glass-navbar rounded-[32px] px-8 py-4 flex items-center justify-between shadow-cloud border border-white/60">
          <Link href="/" className="flex items-center gap-0 group">
            <Image src="/logo.png" alt="StudioVault Logo" width={60} height={60} className="w-12 h-12 object-contain" />
            <span className="text-xl font-serif font-bold text-charcoal tracking-tight hidden sm:block -ml-2">StudioVaultPH</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/login" className="text-charcoal/60 hover:text-charcoal text-[11px] font-bold uppercase tracking-widest px-6 py-3 bg-white/40 backdrop-blur-md rounded-full transition-all hover:bg-white/60 border border-white/40">
              Log In
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-sage text-white px-8 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-cloud shadow-sage/20 border border-sage/20"
            >
              Sign Up
            </button>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="relative px-6 py-32 md:py-48 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
        <div className="max-w-3xl space-y-10 relative z-10 flex-1">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 bg-white/40 backdrop-blur-md border border-white/60 px-5 py-2.5 rounded-full shadow-sm animate-in fade-in slide-in-from-left-4 duration-700">
              <Sparkles className="w-3.5 h-3.5 text-gold" />
              <span className="text-[10px] font-bold text-charcoal/60 uppercase tracking-widest">A New Era of Movement</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-serif font-bold text-charcoal tracking-tight leading-[1.05] animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Elevating the <br />
              <span className="text-sage italic">Pilates Experience.</span>
            </h1>

            <p className="text-xl text-charcoal/40 font-medium leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
              The premium marketplace connecting certified instructors with elite studios. Monetize space and optimize flow with ease.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-5 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
            <button
              onClick={() => setIsModalOpen(true)}
              className="group bg-charcoal text-white px-10 py-5 rounded-[24px] text-[12px] font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-3 shadow-xl hover:shadow-charcoal/20"
            >
              Start Your Journey
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center gap-4 py-2">
              <div className="flex -space-x-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-cream-100 flex items-center justify-center overflow-hidden">
                    <User className="w-6 h-6 text-charcoal/20" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest">Join 50+ Verified Professionals</p>
            </div>
          </div>
        </div>

        {/* Hero Image Container */}
        <div className="flex-1 relative w-full aspect-square lg:aspect-auto lg:h-[600px] animate-in fade-in zoom-in duration-1000 delay-300">
          <div className="absolute inset-0 bg-sage/5 rounded-[40px] blur-3xl animate-pulse -z-10" />
          <div className="w-full h-full rounded-[40px] overflow-hidden shadow-2xl border-8 border-white group relative">
            <Image
              src="/images/homepage/hero.png"
              alt="Premium Pilates Studio"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
            />
            {/* Glass decoration overlay */}
            <div className="absolute bottom-8 left-8 right-8 p-6 glass-card border-white/40 border flex items-center gap-4 animate-in slide-in-from-bottom-8 duration-1000 delay-700">
              <div className="w-12 h-12 bg-sage rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-charcoal uppercase tracking-widest block mb-1">State-of-the-art Equipment</p>
                <p className="text-[10px] text-charcoal/60 font-medium">Find the perfect space for your practice.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Blocks Section */}
      <section className="px-6 py-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { icon: TrendingUp, title: "Optimize Revenue", desc: "Monetize idle equipment and transform off-peak hours into guaranteed studio income.", color: "sage" },
              { icon: ShieldCheck, title: "Verified Network", desc: "Security is non-negotiable. Every professional is identity-verified and certified.", color: "gold" },
              { icon: Award, title: "Elite Standards", desc: "Join an exclusive collective of premium studios and top-tier pilates instructors.", color: "charcoal" }
            ].map((prop, i) => (
              <div key={i} className="glass-card p-10 group hover:translate-y-[-8px] transition-all duration-500">
                <div className={clsx(
                  "w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-cloud transition-transform duration-500 group-hover:rotate-6",
                  prop.color === 'sage' ? "bg-sage/10 text-sage" : prop.color === 'gold' ? "bg-gold/10 text-gold" : "bg-charcoal/5 text-charcoal"
                )}>
                  <prop.icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-charcoal mb-4 italic">{prop.title}</h3>
                <p className="text-charcoal/40 text-sm font-medium leading-relaxed">{prop.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-32 bg-white/40 relative overflow-hidden">
        <Image
          src="/hero-bg.png"
          alt=""
          fill
          className="object-cover opacity-5 pointer-events-none"
        />
        <div className="max-w-7xl mx-auto space-y-20 relative z-10">
          <div className="text-center space-y-4">
            <h2 className="text-[11px] font-bold text-sage uppercase tracking-[0.4em]">The Methodology</h2>
            <h3 className="text-4xl md:text-5xl font-serif font-bold text-charcoal tracking-tight">Ethereal Workflow.</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-16 relative">
            {[
              { step: "01", title: "List", desc: "Define your equipment and set your preferred hourly rental rates." },
              { step: "02", title: "Book", desc: "Instructors discover and reserve your space through our seamless interface." },
              { step: "03", title: "Thrive", desc: "Automated payouts and professional management ensure total peace of mind." }
            ].map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center space-y-6 group">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-cloud border border-white/60 relative group-hover:scale-110 transition-transform">
                  <span className="text-[10px] font-bold text-sage absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border border-white/60 shadow-sm uppercase tracking-widest">{step.step}</span>
                  <span className="text-2xl font-serif font-bold text-charcoal italic">{step.title}</span>
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-charcoal">{step.title} Your Terms</h4>
                  <p className="text-charcoal/40 text-[13px] font-medium leading-relaxed max-w-[240px]">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Designed by Studio Owners Section */}
      <section className="px-6 py-32">
        <div className="max-w-4xl mx-auto text-center glass-card p-16 md:p-24 relative overflow-hidden min-h-[500px] flex flex-col justify-center">
          <Image
            src="/images/homepage/studio.png"
            alt="Beautiful studio"
            fill
            className="object-cover opacity-20 filter blur-sm group-hover:scale-110 transition-transform duration-[20s]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
          <div className="relative z-10 space-y-10">
            <h2 className="text-[11px] font-bold text-gold uppercase tracking-[0.3em] font-sans">The Philosophy</h2>
            <blockquote className="text-3xl md:text-4xl text-charcoal font-serif font-bold italic leading-tight">
              &ldquo;We built StudioVault because movement shouldn't be limited by logistics. It's a tool built for professionals, by professionals.&rdquo;
            </blockquote>
            <div className="flex flex-col items-center gap-2">
              <p className="text-[11px] font-bold text-charcoal uppercase tracking-widest">StudioVaultPH Founders</p>
              <div className="w-12 h-0.5 bg-gold/40 rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Sections */}
      <section className="px-6 py-32 bg-white/20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
          {[
            {
              title: "For Clients",
              subtitle: "Premium Access.",
              icon: Sparkles,
              items: ["Curated Instructors", "Seamless Marketplace", "Exceptional Settings"],
              light: "white",
              image: "/images/homepage/client.png"
            },
            {
              title: "For Instructors",
              subtitle: "Total Autonomy.",
              icon: User,
              items: ["Prime Locations", "Pay-as-you-go", "Unified Controls"],
              light: "sage",
              image: "/images/homepage/instructor.png"
            },
            {
              title: "For Studios",
              subtitle: "Loss Recovery.",
              icon: DollarSign,
              items: ["Revenue Optimization", "Schedule Control", "Verified Staff"],
              light: "gold",
              image: "/images/homepage/studio.png"
            }
          ].map((v, i) => (
            <div key={i} className="flex flex-col space-y-8 p-6 group">
              <div className="aspect-[4/3] relative rounded-[32px] overflow-hidden shadow-xl mb-4 group-hover:-translate-y-2 transition-transform duration-500">
                <Image src={v.image} alt={v.title} fill className="object-cover" />
                <div className="absolute inset-0 bg-charcoal/20 group-hover:bg-transparent transition-colors" />
                <div className={clsx(
                  "absolute top-6 left-6 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md",
                  v.light === 'sage' ? "bg-white/90 text-sage" : v.light === 'gold' ? "bg-white/90 text-gold" : "bg-white/90 text-charcoal"
                )}>
                  <v.icon className="w-5 h-5" />
                </div>
              </div>
              <div className="space-y-2 px-2">
                <h2 className="text-3xl font-serif font-bold text-charcoal tracking-tight">{v.title}</h2>
                <p className="text-[11px] font-bold text-charcoal/40 uppercase tracking-widest">{v.subtitle}</p>
              </div>
              <ul className="space-y-5 px-2">
                {v.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-charcoal/60 font-medium text-[13px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-sage/40" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-20 border-t border-white/60 bg-alabaster/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-0 opacity-40 grayscale group-hover:grayscale-0 transition-all">
              <Image src="/logo.png" alt="StudioVault Logo" width={60} height={60} className="w-10 h-10 object-contain" />
              <span className="text-lg font-serif font-bold text-charcoal tracking-tight -ml-2">StudioVaultPH</span>
            </div>
            <p className="text-[10px] font-bold text-charcoal/30 uppercase tracking-widest">&copy; {new Date().getFullYear()} StudioVaultPH. All rights reserved.</p>
          </div>
          <div className="flex gap-10 text-[10px] font-bold text-charcoal/30 uppercase tracking-[0.2em]">
            <Link href="/terms-of-service" className="hover:text-sage transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
            <Link href="/support" className="hover:text-charcoal transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
