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
    <div className="min-h-screen bg-off-white selection:bg-buttermilk/40 selection:text-burgundy relative">
      <RoleSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full px-4 md:px-8">
        <nav className="relative max-w-7xl mx-auto mt-4 bg-white rounded-2xl px-4 sm:px-8 py-3 flex items-center justify-end shadow-tight border border-border-grey">
          <Link href="/" aria-label="Studio Vault Home" className="absolute left-6 top-1/2 -translate-y-1/2 group">
            <Image
              src="/logo4.png"
              alt="Studio Vault"
              width={320}
              height={80}
              className="h-16 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
              priority
            />
          </Link>
          <div className="flex gap-4 sm:gap-6 items-center">
            <Link href="/login" className="text-muted-burgundy hover:text-burgundy text-[10px] font-bold uppercase tracking-[0.3em] transition-all">
              Log In
            </Link>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="bg-forest text-white px-6 sm:px-8 py-3 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-110 transition-all shadow-tight"
            >
              Sign Up
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* ─── Hero Section — 50/50 Split ─── */}
        <section className="relative px-4 md:px-8 py-16 md:py-28 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left: Content with generous gap-y-6 spacing */}
          <div className="flex-1 w-full flex flex-col gap-y-6 md:gap-y-8 relative z-10">

            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-3 bg-white border border-border-grey px-5 py-3 rounded-lg shadow-tight w-fit animate-in fade-in slide-in-from-left-4 duration-700">
              <Sparkles className="w-4 h-4 text-burgundy" />
              <span className="text-[10px] font-bold text-muted-burgundy uppercase tracking-[0.3em]">A Grounded Approach to Movement</span>
            </div>

            {/* H1 Headline — Playfair Display Serif */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-burgundy tracking-tight leading-[1.1] animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Elevating the <br className="hidden sm:block" />
              <em className="text-burgundy not-italic">Studio</em>{' '}
              <span className="italic">Experience.</span>
            </h1>

            {/* Description — Inter body, generous leading */}
            <p className="text-base md:text-lg text-muted-burgundy leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
              The professional marketplace connecting certified instructors with elite boutique studios. Optimized flow, verified networks, and seamless management.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row gap-y-4 gap-x-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-label="Get Started Now - Sign up for an account"
                className="group bg-forest text-white w-full sm:w-auto px-10 py-5 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-110 transition-all flex items-center justify-center gap-4 shadow-tight"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-5 py-2">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} role="none" className="w-10 h-10 rounded-full border-4 border-white bg-walking-vinnie/60 flex items-center justify-center overflow-hidden shadow-tight">
                      <User className="w-5 h-5 text-burgundy/40" aria-hidden="true" />
                    </div>
                  ))}
                </div>
                <p className="text-[9px] font-bold text-muted-burgundy uppercase tracking-[0.2em] leading-relaxed">
                  Validated by<br />Certified Professionals
                </p>
              </div>
            </div>

            {/* Trust checklist */}
            <div className="flex flex-wrap gap-x-8 gap-y-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              {['Verified Studios', 'Certified Instructors', 'Secure Payments'].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-burgundy shrink-0" />
                  <span className="text-[11px] font-semibold text-muted-burgundy uppercase tracking-wide">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Lifestyle Image — object-cover, rounded, 50% width */}
          <div className="flex-1 relative w-full lg:h-[600px] animate-in fade-in zoom-in duration-1000 delay-300">
            <div className="w-full h-full min-h-[380px] lg:min-h-[600px] rounded-2xl overflow-hidden shadow-card border border-burgundy/10 group relative bg-walking-vinnie/20">
              <Image
                src="/images/homepage/hero_lifestyle_reformer.png"
                alt="Instructor and client using a Pilates reformer together"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 800px"
                priority
              />
              {/* Overlay card — bottom left */}
              <div className="absolute bottom-6 md:bottom-8 left-6 md:left-8 right-6 md:right-8 p-5 md:p-6 bg-white/95 backdrop-blur-sm border border-border-grey rounded-xl flex items-center gap-5 shadow-card animate-in slide-in-from-bottom-8 duration-1000 delay-700">
                <div className="w-12 h-12 bg-forest rounded-xl flex items-center justify-center shadow-tight flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-burgundy uppercase tracking-[0.3em] block mb-1">Validated Excellence</p>
                  <p className="text-[11px] text-muted-burgundy font-medium leading-relaxed">Certified Equipment and Verified Partners.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Trust Blocks (Features) ─── */}
        <section className="px-4 md:px-8 py-24 md:py-40 bg-white border-t border-burgundy/5">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              {[
                {
                  icon: TrendingUp,
                  title: "Optimize Revenue",
                  desc: "Monetize idle equipment and transform off-peak availability into guaranteed studio income."
                },
                {
                  icon: ShieldCheck,
                  title: "Verified Network",
                  desc: "Security is non-negotiable. Every session is managed through a secure, identity-validated ecosystem."
                },
                {
                  icon: Award,
                  title: "Industry Standard",
                  desc: "Join an exclusive collective of certified boutique studios and top-tier movement professionals."
                }
              ].map((prop, i) => (
                <div key={i} className="bg-off-white border border-burgundy/8 p-10 rounded-xl group hover:border-burgundy/20 transition-all duration-500 shadow-tight hover:shadow-card">
                  <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center mb-8 shadow-tight transition-all duration-500 group-hover:-translate-y-2 border border-border-grey">
                    <prop.icon className="w-7 h-7 text-burgundy" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif text-burgundy mb-4 md:mb-5">{prop.title}</h2>
                  <p className="text-muted-burgundy text-[15px] leading-relaxed">{prop.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works ─── */}
        <section className="px-4 md:px-8 py-24 md:py-40 bg-off-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto space-y-16 md:space-y-28 relative z-10">
            <div className="text-center space-y-4 md:space-y-5">
              <p className="text-[10px] font-bold text-muted-burgundy uppercase tracking-[0.5em]">The Methodology</p>
              <h2 className="text-4xl md:text-6xl font-serif text-burgundy tracking-tight">Professional Workflow.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0 relative">
              {[
                { step: "01", title: "LIST", icon: ClipboardList, desc: "Define your studio availability and set your preferred session rates." },
                { step: "02", title: "BOOK", icon: CalendarDays, desc: "Verified instructors discover and reserve your space via real-time schedules." },
                { step: "03", title: "THRIVE", icon: LineChart, desc: "Secure payouts and high-level management ensure complete peace of mind." }
              ].map((step, i) => (
                <div key={i} className={clsx(
                  "relative flex flex-col items-center text-center px-10 py-10 group",
                  i !== 2 && "md:border-r md:border-border-grey"
                )}>
                  <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl bg-white flex flex-col items-center justify-center shadow-tight border border-border-grey relative group-hover:-translate-y-2 transition-transform mb-8 md:mb-12">
                    <span className="text-[10px] font-bold text-white absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-burgundy px-6 py-2 rounded-lg shadow-tight uppercase tracking-widest leading-none border border-burgundy/10">{step.step}</span>
                    <step.icon className="w-10 h-10 md:w-12 md:h-12 text-burgundy mb-4 md:mb-6 opacity-70" />
                    <span className="text-3xl md:text-4xl font-serif font-bold text-burgundy tracking-widest">{step.title}</span>
                  </div>
                  <div className="max-w-[300px]">
                    <p className="text-muted-burgundy text-[17px] md:text-[19px] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Philosophy Quote ─── */}
        <section className="px-4 md:px-8 py-24 md:py-40 bg-[#F4F1E2] relative overflow-hidden border-t border-burgundy/8">
          <div className="max-w-5xl mx-auto text-center p-8 md:p-24 rounded-2xl relative overflow-hidden bg-white border border-burgundy/10 shadow-card">
            <div className="relative z-10 flex flex-col gap-y-8 md:gap-y-10 items-center">
              <p className="text-[10px] font-bold text-burgundy uppercase tracking-[0.5em]">The Philosophy</p>
              <blockquote className="text-2xl md:text-5xl text-burgundy font-serif leading-tight tracking-tight italic">
                &ldquo;We built Studio Vault PH because professional movement shouldn&rsquo;t be limited by logistics. It&rsquo;s a tool built for the industry, by the industry.&rdquo;
              </blockquote>
              <div className="flex flex-col items-center gap-4">
                <p className="text-[10px] font-bold text-muted-burgundy uppercase tracking-[0.3em]">STUDIO VAULT PH FOUNDERS</p>
                <div className="w-16 h-1 bg-forest rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Target Audience Cards ─── */}
        <section className="px-4 md:px-8 py-24 md:py-40 bg-white border-t border-burgundy/5">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            {[
              {
                title: "For Clients",
                subtitle: "UNPARALLELED ACCESS",
                icon: Sparkles,
                items: ["Curated Instructor Network", "High-End Studio Settings", "Seamless Booking Flow"],
                image: "/images/homepage/client.png"
              },
              {
                title: "For Instructors",
                subtitle: "PROFESSIONAL AUTONOMY",
                icon: User,
                items: ["Book Premium Studio Spaces", "Keep 100% of Your Client Fees", "Manage Your Schedule on the Go"],
                image: "/images/homepage/instructor.png"
              },
              {
                title: "For Studios",
                subtitle: "DENSITY OPTIMIZATION",
                icon: DollarSign,
                items: ["Automated Revenue Recovery", "Absolute Schedule Control", "Verified Staff Access"],
                image: "/images/homepage/studio.png"
              }
            ].map((v, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-card border border-border-grey group hover:-translate-y-1 transition-all duration-500">
                {/* Portrait image — flush at top */}
                <div className="aspect-[4/5] relative overflow-hidden rounded-t-2xl">
                  <Image
                    src={v.image}
                    alt={`Representative image for ${v.title}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                    className="object-cover transition-all duration-700"
                  />
                  <div className="absolute top-6 left-6 w-12 h-12 rounded-lg flex items-center justify-center bg-white border border-border-grey shadow-tight" aria-hidden="true">
                    <v.icon className="w-5 h-5 text-burgundy" />
                  </div>
                </div>

                {/* Text content */}
                <div className="p-6 flex flex-col gap-y-5">
                  <div className="flex flex-col gap-y-1">
                    <h2 className="text-2xl md:text-3xl font-serif text-burgundy tracking-tight">{v.title}</h2>
                    <p className="text-[10px] font-bold text-muted-burgundy uppercase tracking-[0.3em]">{v.subtitle}</p>
                  </div>
                  <ul className="flex flex-col gap-y-4">
                    {v.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-4 text-muted-burgundy text-[17px] leading-relaxed py-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-burgundy shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="px-4 md:px-8 py-16 md:py-24 border-t border-border-grey bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10 md:gap-16">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <Image 
              src="/logo4.png" 
              alt="Studio Vault" 
              width={160} 
              height={48} 
              className="h-10 md:h-12 w-auto object-contain" 
            />
            <p className="text-[10px] font-bold text-muted-burgundy uppercase tracking-[0.3em] text-center md:text-left">
              &copy; {new Date().getFullYear()} STUDIO VAULT. ALL RIGHTS RESERVED.
            </p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-6 md:gap-10 text-[10px] font-bold text-muted-burgundy uppercase tracking-[0.4em]">
            <Link href="/terms-of-service" className="hover:text-burgundy transition-all underline decoration-burgundy/0 hover:decoration-burgundy underline-offset-8">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-burgundy transition-all underline decoration-burgundy/0 hover:decoration-burgundy underline-offset-8">Privacy Policy</Link>
            <Link href="/support" className="hover:text-burgundy transition-all underline decoration-burgundy/0 hover:decoration-burgundy underline-offset-8">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
