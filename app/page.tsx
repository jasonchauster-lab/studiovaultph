'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, MapPin, DollarSign, User, Sparkles, TrendingUp, ShieldCheck, Award, ClipboardList, CalendarDays, LineChart } from 'lucide-react'
import clsx from 'clsx'
import RoleSelectionModal from '@/components/auth/RoleSelectionModal'

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white selection:bg-forest/10 selection:text-charcoal relative">
      <RoleSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full px-4 md:px-8 py-6">
        <nav className="max-w-7xl mx-auto bg-white rounded-xl px-4 sm:px-10 py-5 flex items-center justify-between shadow-tight border border-border-grey">
          <Link href="/" aria-label="Studio Vault PH Home" className="flex items-center gap-1 group">
            <Image src="/logo.png" alt="" width={60} height={60} className="w-10 h-10 object-contain" />
            <span className="text-xl font-serif font-bold text-charcoal tracking-tighter uppercase hidden sm:block">STUDIO VAULT PH</span>
          </Link>
          <div className="flex gap-4 sm:gap-6 items-center">
            <Link href="/login" className="text-slate-600 hover:text-charcoal text-[10px] font-bold uppercase tracking-[0.3em] transition-all">
              Log In
            </Link>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="bg-charcoal text-white px-6 sm:px-8 py-3.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-tight"
            >
              Sign Up
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative px-4 md:px-8 py-16 md:py-40 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20 bg-white">
          <div className="max-w-3xl space-y-10 md:space-y-12 relative z-10 flex-1 w-full">
            <div className="space-y-6 md:space-y-8">
              <div className="inline-flex items-center gap-4 bg-white border border-border-grey px-6 py-3 rounded-lg shadow-tight animate-in fade-in slide-in-from-left-4 duration-700">
                <Sparkles className="w-4 h-4 text-forest" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">A Grounded Approach to Movement</span>
              </div>

              <h1 className="text-4xl md:text-7xl font-serif text-charcoal tracking-tighter leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-1000">
                Elevating the <br className="hidden sm:block" />
                <span className="text-forest italic">Studio Experience.</span>
              </h1>

              <p className="text-lg text-charcoal-700 font-medium leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
                The professional marketplace connecting certified instructors with elite boutique studios. Optimized flow, verified networks, and seamless management.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-label="Get Started Now - Sign up for an account"
                className="group bg-forest text-white w-full sm:w-auto px-12 py-6 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all flex items-center justify-center sm:justify-start gap-4 shadow-tight"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-6 py-2">
                <div className="flex -space-x-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} role="none" className="w-12 h-12 rounded-lg border-4 border-white bg-off-white flex items-center justify-center overflow-hidden shadow-tight">
                      <User className="w-7 h-7 text-slate/20" aria-hidden="true" />
                    </div>
                  ))}
                </div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em]">Validated by <br />Certified Professionals</p>
              </div>
            </div>
          </div>

          {/* Hero Image Container */}
          <div className="flex-1 relative w-full lg:h-[650px] animate-in fade-in zoom-in duration-1000 delay-300">
            <div className="w-full h-full rounded-xl overflow-hidden shadow-tight border border-border-grey group relative">
              <Image
                src="/images/homepage/hero.png"
                alt="Professional Pilates Environment"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 800px"
                priority
              />
              {/* Action overlay */}
              <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 p-6 md:p-8 bg-white border border-border-grey rounded-lg flex items-center gap-6 shadow-card animate-in slide-in-from-bottom-8 duration-1000 delay-700">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-forest rounded-lg flex items-center justify-center shadow-tight flex-shrink-0">
                  <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-charcoal uppercase tracking-[0.3em] block mb-1 md:mb-2">Validated Excellence</p>
                  <p className="text-[10px] md:text-[11px] text-charcoal-700 font-medium leading-relaxed">Certified Equipment and Verified Partners.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Blocks Section (Features) */}
        <section className="px-4 md:px-8 py-20 md:py-32 bg-[#F9FAFB]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {[
                { icon: TrendingUp, title: "Optimize Revenue", desc: "Monetize idle equipment and transform off-peak availability into guaranteed studio income.", color: "forest" },
                { icon: ShieldCheck, title: "Verified Network", desc: "Security is non-negotiable. Every session is managed through a secure, identity-validated ecosystem.", color: "charcoal" },
                { icon: Award, title: "Industry Standard", desc: "Join an exclusive collective of certified boutique studios and top-tier movement professionals.", color: "slate" }
              ].map((prop, i) => (
                <div key={i} className="bg-white border border-border-grey p-12 rounded-lg group hover:border-forest/30 transition-all duration-500 shadow-tight">
                  <div className={clsx(
                    "w-20 h-20 rounded-lg flex items-center justify-center mb-10 shadow-tight transition-all duration-500 group-hover:-translate-y-2 border border-border-grey/50",
                    prop.color === 'forest' ? "bg-forest/10 text-forest" : prop.color === 'charcoal' ? "bg-charcoal/10 text-charcoal" : "bg-slate/10 text-slate"
                  )}>
                    <prop.icon className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif text-charcoal mb-4 md:mb-6">{prop.title}</h2>
                  <p className="text-charcoal-700 text-sm font-medium leading-[1.8]">{prop.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section (Workflow) */}
        <section className="px-4 md:px-8 py-24 md:py-40 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto space-y-16 md:space-y-28 relative z-10">
            <div className="text-center space-y-4 md:space-y-6">
              <p className="text-[10px] font-bold text-forest uppercase tracking-[0.5em]">The Methodology</p>
              <h2 className="text-4xl md:text-6xl font-serif text-charcoal tracking-tighter">Professional Workflow.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0 relative">
              {[
                { step: "01", title: "LIST", icon: ClipboardList, desc: "Define your studio availability and set your preferred session rates." },
                { step: "02", title: "BOOK", icon: CalendarDays, desc: "Verified instructors discover and reserve your space via real-time schedules." },
                { step: "03", title: "THRIVE", icon: LineChart, desc: "Secure payouts and high-level management ensure complete peace of mind." }
              ].map((step, i) => (
                <div key={i} className={clsx(
                  "relative flex flex-col items-center text-center px-12 py-10 group",
                  i !== 2 && "md:border-r md:border-border-grey"
                )}>
                  <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl bg-off-white flex flex-col items-center justify-center shadow-tight border border-border-grey relative group-hover:-translate-y-2 transition-transform mb-8 md:mb-12">
                    <span className="text-[10px] font-bold text-white absolute -top-4 left-1/2 -translate-x-1/2 bg-forest px-6 py-2 rounded-lg shadow-tight uppercase tracking-widest leading-none border border-forest/10">{step.step}</span>
                    <step.icon className="w-10 h-10 md:w-12 md:h-12 text-forest mb-4 md:mb-6 opacity-80" />
                    <span className="text-3xl md:text-4xl font-serif font-bold text-charcoal tracking-widest">{step.title}</span>
                  </div>
                  <div className="max-w-[320px]">
                    <p className="text-charcoal-700 text-[18px] md:text-[20px] font-medium leading-[1.6]">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Philosophy Section (Quote) */}
        <section className="px-4 md:px-8 py-24 md:py-40 bg-buttermilk relative overflow-hidden border-t border-burgundy/5">
          <div className="max-w-5xl mx-auto text-center p-8 md:p-32 rounded-xl relative overflow-hidden bg-white border border-burgundy/10 shadow-tight">
            <div className="relative z-10 space-y-10 md:space-y-12">
              <h2 className="text-[10px] font-bold text-burgundy uppercase tracking-[0.5em]">The Philosophy</h2>
              <blockquote className="text-2xl md:text-5xl text-burgundy font-serif leading-tight tracking-tighter italic">
                &ldquo;We built Studio Vault PH because professional movement shouldn't be limited by logistics. It's a tool built for the industry, by the industry.&rdquo;
              </blockquote>
              <div className="flex flex-col items-center gap-4">
                <p className="text-[10px] font-bold text-burgundy/60 uppercase tracking-[0.3em]">STUDIO VAULT PH FOUNDERS</p>
                <div className="w-16 h-1 bg-burgundy rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Target Audience Sections */}
        <section className="px-4 md:px-8 py-24 md:py-40 bg-white">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-16">
            {[
              {
                title: "For Clients",
                subtitle: "UNPARALLELED ACCESS",
                icon: Sparkles,
                items: ["Curated Instructor Network", "High-End Studio Settings", "Seamless Booking Flow"],
                accent: "forest",
                image: "/images/homepage/client.png"
              },
              {
                title: "For Instructors",
                subtitle: "PROFESSIONAL AUTONOMY",
                icon: User,
                items: ["Prime Booking Locations", "Transparent Pay-as-you-go", "Unified Session Controls"],
                accent: "forest",
                image: "/images/homepage/instructor.png"
              },
              {
                title: "For Studios",
                subtitle: "DENSITY OPTIMIZATION",
                icon: DollarSign,
                items: ["Automated Revenue Recovery", "Absolute Schedule Control", "Verified Staff Access"],
                accent: "forest",
                image: "/images/homepage/studio.png"
              }
            ].map((v, i) => (
              <div key={i} className="flex flex-col space-y-10 group">
                <div className="aspect-[4/5] relative rounded-xl overflow-hidden shadow-card mb-4 group-hover:-translate-y-2 transition-all duration-500 border border-border-grey">
                  <Image src={v.image} alt={`Representative image for ${v.title}`} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px" className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                  <div className="absolute inset-0 bg-charcoal/30 group-hover:bg-transparent transition-all duration-700" aria-hidden="true" />
                  <div className="absolute top-8 left-8 w-14 h-14 rounded-lg flex items-center justify-center bg-white border border-border-grey shadow-tight" aria-hidden="true">
                    <v.icon className="w-6 h-6 text-forest" />
                  </div>
                </div>
                <div className="space-y-2 md:space-y-3 px-2">
                  <h2 className="text-2xl md:text-3xl font-serif text-charcoal tracking-tighter">{v.title}</h2>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">{v.subtitle}</p>
                </div>
                <ul className="space-y-6 px-2">
                  {v.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-4 text-charcoal-700 font-medium text-[14px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-forest" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-4 md:px-8 py-20 md:py-32 border-t border-border-grey bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12 md:gap-16">
          <div className="flex flex-col items-center md:items-start gap-6">
            <div className="flex items-center gap-2 grayscale group-hover:grayscale-0 transition-all opacity-80">
              <Image src="/logo.png" alt="StudioVault Logo" width={80} height={80} className="w-10 h-10 md:w-12 md:h-12 object-contain" />
              <span className="text-lg md:text-xl font-serif text-charcoal tracking-tighter uppercase text-center md:text-left transition-all">STUDIO VAULT PH</span>
            </div>
            <p className="text-[10px] font-bold text-slate uppercase tracking-[0.3em] text-center md:text-left">&copy; {new Date().getFullYear()} STUDIO VAULT PH. ALL RIGHTS RESERVED.</p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-6 md:gap-10 text-[10px] font-bold text-slate uppercase tracking-[0.4em]">
            <Link href="/terms-of-service" className="hover:text-forest transition-all underline decoration-forest/0 hover:decoration-forest underline-offset-8">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-forest transition-all underline decoration-forest/0 hover:decoration-forest underline-offset-8">Privacy Policy</Link>
            <Link href="/support" className="hover:text-forest transition-all underline decoration-forest/0 hover:decoration-forest underline-offset-8">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
