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
    <div className="min-h-screen bg-surface selection:bg-primary/10 selection:text-primary relative font-sans">
      <RoleSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full px-4 md:px-8 py-4">
        <nav className="relative max-w-7xl mx-auto glass-nav rounded-2xl px-6 sm:px-10 py-4 flex items-center justify-between shadow-ambient">
          <Link href="/" aria-label="Studio Vault Home" className="group">
            <Image
              src="/logo4.png"
              alt="Studio Vault"
              width={240}
              height={60}
              className="h-10 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
              priority
            />
          </Link>
          <div className="flex gap-8 items-center">
            <Link href="/login" className="label-atelier hover:text-primary transition-colors">
              Log In
            </Link>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn-primary-atelier !py-3 !px-6"
            >
              Sign Up
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* ─── Hero Section — Asymmetrical Digital Atelier ─── */}
        <section className="relative px-6 md:px-12 py-20 md:py-32 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24 overflow-hidden">
          
          {/* Left: Content with Asymmetric Breathing Room */}
          <div className="flex-1 w-full flex flex-col gap-y-10 relative z-10 lg:pr-12">
            
            {/* Eyebrow badge */}
            <div className="vault-badge w-fit animate-in fade-in slide-in-from-left-4 duration-700">
              A Grounded Approach to Movement
            </div>

            {/* H1 Headline — Authoritative Sophistication */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-primary tracking-tight leading-[1.05] animate-in fade-in slide-in-from-bottom-4 duration-1000">
              Elevating the <br />
              <em className="not-italic">Studio</em>{' '}
              <span className="italic font-light">Experience.</span>
            </h1>

            {/* Description — Inter body */}
            <p className="text-lg md:text-xl text-muted-surface leading-loose max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
              The professional marketplace connecting certified instructors with elite boutique studios. Optimized flow, verified networks, and seamless management.
            </p>

            {/* CTA Group */}
            <div className="flex flex-col sm:flex-row gap-8 items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="btn-primary-atelier w-full sm:w-auto px-12 py-6 text-xs"
              >
                Get Started Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center gap-4 py-2">
                <div className="flex -space-x-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-surface bg-primary/10 flex items-center justify-center overflow-hidden shadow-ambient">
                      <User className="w-6 h-6 text-primary/30" />
                    </div>
                  ))}
                </div>
                <p className="label-atelier leading-tight">
                  Validated by<br />Certified Professionals
                </p>
              </div>
            </div>
          </div>

          {/* Right: Gallery Piece (Lifestyle Image) — Asymmetrical offset */}
          <div className="flex-1 relative w-full lg:h-[700px] animate-in fade-in zoom-in duration-1000 delay-300 lg:-mr-20">
            <div className="w-full h-full min-h-[450px] lg:min-h-[700px] rounded-xl overflow-hidden shadow-ambient group bg-surface-container-low relative">
              <Image
                src="/images/homepage/hero_lifestyle_reformer.png"
                alt="Instructor and client using a Pilates reformer together"
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 900px"
                priority
              />
              {/* Overlay card — Ambient Tonal Layering */}
              <div className="absolute bottom-10 left-10 right-10 p-8 bg-white/90 backdrop-blur-md rounded-xl flex items-center gap-6 shadow-ambient animate-in slide-in-from-bottom-8 duration-1000 delay-700">
                <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="label-atelier text-primary mb-1">Validated Excellence</p>
                  <p className="text-sm text-muted-surface font-medium leading-relaxed">Certified Equipment and Verified Partners.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Tonal Architecture: Features Section ─── */}
        <section className="px-6 md:px-12 py-32 md:py-48 surface-elevated">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
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
                <div key={i} className="atelier-card flex flex-col items-start gap-y-8">
                  <div className="w-16 h-16 rounded-xl bg-surface flex items-center justify-center shadow-ambient transition-transform duration-500 group-hover:-translate-y-2">
                    <prop.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-3xl font-serif text-primary tracking-tight">{prop.title}</h2>
                    <p className="text-muted-surface text-base leading-relaxed">{prop.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How It Works: Professional Workflow ─── */}
        <section className="px-6 md:px-12 py-32 md:py-48 bg-surface">
          <div className="max-w-7xl mx-auto space-y-20 relative z-10 text-center">
            <div className="space-y-6">
              <p className="label-atelier">The Methodology</p>
              <h2 className="text-5xl md:text-7xl font-serif text-primary tracking-tight">Professional Workflow.</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
              {[
                { step: "01", title: "LIST", icon: ClipboardList, desc: "Define your studio availability and set your preferred session rates." },
                { step: "02", title: "BOOK", icon: CalendarDays, desc: "Verified instructors discover and reserve your space via real-time schedules." },
                { step: "03", title: "THRIVE", icon: LineChart, desc: "Secure payouts and high-level management ensure complete peace of mind." }
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center group">
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-3xl bg-white flex flex-col items-center justify-center shadow-ambient relative transition-transform duration-500 hover:-translate-y-3 mb-10">
                    <span className="vault-badge absolute top-0 -translate-y-1/2">{step.step}</span>
                    <step.icon className="w-12 h-12 text-primary/40 mb-6" />
                    <span className="text-4xl font-serif font-bold text-primary tracking-[0.2em]">{step.title}</span>
                  </div>
                  <p className="text-muted-surface text-lg leading-relaxed max-w-[280px]">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Philosophy Quote ─── */}
        <section className="px-6 md:px-12 py-32 md:py-48 surface-elevated">
          <div className="max-w-5xl mx-auto text-center p-12 md:p-32 rounded-3xl surface-overlay relative overflow-hidden">
            <div className="relative z-10 flex flex-col gap-y-12 items-center">
              <p className="label-atelier">The Philosophy</p>
              <blockquote className="text-3xl md:text-5xl lg:text-6xl text-primary font-serif italic leading-[1.15] tracking-tight max-w-4xl">
                &ldquo;We built Studio Vault PH because professional movement shouldn&rsquo;t be limited by logistics. It&rsquo;s a tool built for the industry, by the industry.&rdquo;
              </blockquote>
              <div className="flex flex-col items-center gap-6">
                <p className="label-atelier text-primary tracking-[0.5em]">STUDIO VAULT PH FOUNDERS</p>
                <div className="w-20 h-0.5 bg-primary/20 rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Target Audience: Tonal Layering ─── */}
        <section className="px-6 md:px-12 py-32 md:py-48 bg-surface">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
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
              <div key={i} className="atelier-card !p-0 overflow-hidden group">
                {/* Gallery image */}
                <div className="aspect-[4/5] relative overflow-hidden">
                  <Image
                    src={v.image}
                    alt={v.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 400px"
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute top-8 left-8 w-14 h-14 rounded-xl flex items-center justify-center bg-white/90 backdrop-blur-md shadow-ambient">
                    <v.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Text content with intentional breathing room */}
                <div className="p-10 flex flex-col gap-y-8">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-serif text-primary tracking-tight">{v.title}</h2>
                    <p className="label-atelier text-primary">{v.subtitle}</p>
                  </div>
                  <ul className="space-y-5">
                    {v.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-4 text-muted-surface text-base leading-relaxed">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/30 mt-2.5 shrink-0" />
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

      {/* ─── Footer: Minimalist Editorial ─── */}
      <footer className="px-6 md:px-12 py-24 bg-white border-t border-surface-container-highest">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-16">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <Image 
              src="/logo4.png" 
              alt="Studio Vault" 
              width={180} 
              height={50} 
              className="h-10 w-auto object-contain opacity-80" 
            />
            <p className="label-atelier text-xs">
              &copy; 2026 STUDIO VAULT. ALL RIGHTS RESERVED.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-10">
            {['Terms of Service', 'Privacy Policy', 'Support'].map((link) => (
              <Link key={link} href={`/${link.toLowerCase().replace(/ /g, '-')}`} className="label-atelier hover:text-primary transition-colors underline decoration-primary/0 hover:decoration-primary/20 underline-offset-8">
                {link}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
