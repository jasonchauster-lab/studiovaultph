'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle2, MapPin, Calendar, DollarSign, User, Sparkles, TrendingUp, ShieldCheck, Award } from 'lucide-react'
import RoleSelectionModal from '@/components/auth/RoleSelectionModal'

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-cream-50 font-sans text-charcoal-900">
      <RoleSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Navigation */}
      <div className="sticky top-0 z-50 w-full bg-cream-50/95 backdrop-blur-md border-b border-cream-200/50 shadow-sm transition-all duration-300">
        <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <Link href="/" className="flex items-center gap-2 z-30">
            <Image src="/logo.png" alt="StudioVault Logo" width={40} height={40} className="w-10 h-10 object-contain" />
            <span className="text-2xl font-serif font-bold text-charcoal-900 tracking-tight hidden sm:block">StudioVaultPH</span>
          </Link>
          <div className="flex gap-4 relative z-30">
            <Link href="/login" className="text-charcoal-600 hover:text-charcoal-900 font-medium px-4 py-2 bg-cream-50/80 backdrop-blur-sm rounded-full">
              Log In
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-charcoal-900 text-cream-50 px-5 py-2 rounded-full font-medium hover:bg-charcoal-800 transition-colors shadow-sm"
            >
              Sign Up
            </button>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.png')" }}
        />
        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/70 to-charcoal-900/40" />

        <header className="relative z-20 px-4 sm:px-6 py-24 md:py-32 max-w-7xl mx-auto flex flex-col items-start text-left">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-serif text-cream-50 mb-6 leading-tight">
              The Elite Marketplace for<br />
              <span className="text-cream-200 italic">Pilates Professionals.</span>
            </h1>
            <p className="text-xl text-cream-100 mb-10 leading-relaxed max-w-xl">
              The first marketplace connecting verified freelance instructors with premium studios—helping owners monetize unbooked equipment during off-peak hours.
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="group bg-cream-50 text-charcoal-900 px-8 py-4 rounded-full text-lg font-bold hover:bg-white transition-all flex items-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1"
            >
              Join StudioVaultPH
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="mt-4 inline-flex items-center gap-2 bg-charcoal-900/60 backdrop-blur-md border border-cream-200/20 px-4 py-2 rounded-full">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-sm text-cream-50 font-medium">Early Access: Joining as a Founding Partner (Limited to 5 Studios)</span>
            </div>
          </div>
        </header>
      </div>


      {/* How It Works Section */}
      <section className="px-4 sm:px-6 py-16 bg-cream-100/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif text-charcoal-900 text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 text-center relative">
            {/* Connecting lines for desktop */}
            <div className="hidden md:block absolute top-[44px] left-[16.6%] right-[16.6%] h-0.5 bg-cream-300 z-0"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-cream-50 border-4 border-charcoal-900 flex flex-col items-center justify-center mb-6 shadow-sm">
                <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-widest mb-1">Step 1</span>
                <span className="text-xl font-serif text-charcoal-900 leading-tight">List</span>
              </div>
              <h3 className="text-xl font-bold text-charcoal-900 mb-3">Set Your Terms</h3>
              <p className="text-charcoal-600 max-w-xs mx-auto text-sm leading-relaxed">Post your available reformers and set your own hourly rental rate.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-cream-50 border-4 border-charcoal-900 flex flex-col items-center justify-center mb-6 shadow-sm">
                <span className="text-[10px] font-bold text-charcoal-500 uppercase tracking-widest mb-1">Step 2</span>
                <span className="text-xl font-serif text-charcoal-900 leading-tight">Book</span>
              </div>
              <h3 className="text-xl font-bold text-charcoal-900 mb-3">Instant Match</h3>
              <p className="text-charcoal-600 max-w-xs mx-auto text-sm leading-relaxed">Verified instructors browse and book your space at the price you've set.</p>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-charcoal-900 border-4 border-charcoal-900 flex flex-col items-center justify-center mb-6 shadow-sm text-white">
                <span className="text-[10px] font-bold text-cream-200 uppercase tracking-widest mb-1">Step 3</span>
                <span className="text-xl font-serif leading-tight">Earn</span>
              </div>
              <h3 className="text-xl font-bold text-charcoal-900 mb-3">Direct Payouts</h3>
              <p className="text-charcoal-600 max-w-xs mx-auto text-sm leading-relaxed">Receive your full rental fee automatically. No guesswork, no complex splits.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Blocks Section (Decision Zone) */}
      <section className="px-4 sm:px-6 py-16 bg-cream-100/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-8 bg-cream-50 rounded-3xl border border-cream-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-charcoal-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
                <TrendingUp className="w-7 h-7 text-cream-400" />
              </div>
              <h3 className="text-xl font-serif font-bold text-charcoal-900 mb-3 italic">Stop Idle Loss</h3>
              <p className="text-charcoal-600 text-sm leading-relaxed">Every hour a reformer sits empty is lost revenue. Turn your "dead air" into guaranteed house income.</p>
            </div>

            <div className="flex flex-col items-center text-center p-8 bg-cream-50 rounded-3xl border border-cream-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-charcoal-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg -rotate-3">
                <ShieldCheck className="w-7 h-7 text-cream-400" />
              </div>
              <h3 className="text-xl font-serif font-bold text-charcoal-900 mb-3 italic">Vetted & Insured</h3>
              <p className="text-charcoal-600 text-sm leading-relaxed">Every professional in the Vault is identity-verified, certified, and fully insured.</p>
            </div>

            <div className="flex flex-col items-center text-center p-8 bg-cream-50 rounded-3xl border border-cream-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-charcoal-900 rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
                <Award className="w-7 h-7 text-cream-400" />
              </div>
              <h3 className="text-xl font-serif font-bold text-charcoal-900 mb-3 italic">Founding Partner Program</h3>
              <p className="text-charcoal-600 text-sm leading-relaxed">We are currently only accepting 5 premium studios for our exclusive launch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Designed by Studio Owners Section */}
      <section className="px-4 sm:px-6 py-20 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-serif text-charcoal-900 mb-8">&ldquo;Designed by Studio Owners&rdquo;</h2>
          <blockquote className="text-xl md:text-2xl text-charcoal-700 font-serif italic leading-relaxed relative">
            <span className="absolute -top-6 -left-4 text-6xl text-cream-300 pointer-events-none">&ldquo;</span>
            We built StudioVault because we were tired of seeing our reformers sit idle. We understand the high cost of rent in BGC and the challenge of finding reliable instructors. This isn't just a platform; it’s a tool built by the community to help our local industry thrive.
            <span className="absolute -bottom-10 -right-4 text-6xl text-cream-300 pointer-events-none">&rdquo;</span>
          </blockquote>
        </div>
      </section>

      {/* Safety & Maintenance Section */}
      <section className="px-4 sm:px-6 py-16 bg-cream-50 border-y border-cream-200">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-cream-200 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cream-100/50 rounded-bl-full -mr-10 -mt-10" />

            <h2 className="text-3xl font-serif text-charcoal-900 mb-10">Our Commitment to You</h2>
            <div className="grid md:grid-cols-3 gap-10">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-green-700" />
                </div>
                <h3 className="text-lg font-bold text-charcoal-900">Verified Professionalism</h3>
                <p className="text-charcoal-600 text-sm leading-relaxed">Every instructor must upload a valid Pilates Certification and Government ID before their first booking.</p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-amber-700" />
                </div>
                <h3 className="text-lg font-bold text-charcoal-900">Equipment Respect</h3>
                <p className="text-charcoal-600 text-sm leading-relaxed">Our community guidelines hold instructors strictly accountable for the care of your studio&rsquo;s equipment.</p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-blue-700" />
                </div>
                <h3 className="text-lg font-bold text-charcoal-900">Instant Reporting</h3>
                <p className="text-charcoal-600 text-sm leading-relaxed">A dedicated channel for studios to report any issues immediately after a session.</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Value Props */}
      <section className="px-4 sm:px-6 py-16 bg-white border-y border-cream-200">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 items-start">

          {/* For Clients */}
          <div className="space-y-6 order-3 md:order-1">
            <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-charcoal-900" />
            </div>
            <h2 className="text-3xl font-serif text-charcoal-900">For Clients</h2>
            <p className="text-lg text-charcoal-600">Enjoy premium Pilates at a fraction of the cost. Book sessions with top freelance instructors or reserve studio space during off-peak hours — same quality, smarter price.</p>
            <ul className="space-y-3">
              {[
                'Discounted rates during off-peak hours',
                'Access certified, vetted instructors',
                'Book studios or private sessions with ease',
                'Flexible scheduling that fits your lifestyle'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-charcoal-700">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* For Instructors */}
          <div className="space-y-6 md:px-8 border-x-0 md:border-x border-cream-200 order-2 md:order-2">
            <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center mb-4">
              <User className="w-6 h-6 text-charcoal-900" />
            </div>
            <h2 className="text-3xl font-serif text-charcoal-900">For Instructors</h2>
            <p className="text-lg text-charcoal-600">Stop being tied to one location. Find premium studios near your clients and book specialized equipment by the hour.</p>
            <ul className="space-y-3">
              {[
                'Access premium reformers in BGC & Makati',
                'Pay only for the hours you book',
                'Manage all your bookings in one regular place',
                'No monthly membership fees'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-charcoal-700">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* For Studios */}
          <div className="space-y-6 order-1 md:order-3">
            <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-charcoal-900" />
            </div>
            <h2 className="text-3xl font-serif text-charcoal-900">For Studio Owners</h2>
            <p className="text-lg font-bold text-charcoal-800">Stop Losing Revenue on Idle Equipment.</p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-charcoal-700">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span><strong className="text-charcoal-900">Fully Vetted Professionals:</strong> Only instructors with verified certifications and insurance can book your space.</span>
              </li>
              <li className="flex items-start gap-3 text-charcoal-700">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span><strong className="text-charcoal-900">Complete Schedule Control:</strong> You decide which reformers are available and at what times.</span>
              </li>
              <li className="flex items-start gap-3 text-charcoal-700">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <span><strong className="text-charcoal-900">Automated Payouts:</strong> Seamless system splits funds and deposits directly without chasing invoices.</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-12 text-center text-charcoal-500 text-sm">
        <p>&copy; {new Date().getFullYear()} StudioVaultPH. All rights reserved.</p>
      </footer>

    </div>
  )
}
