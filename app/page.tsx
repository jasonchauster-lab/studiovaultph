'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, MapPin, Calendar, DollarSign, User, Sparkles } from 'lucide-react'
import RoleSelectionModal from '@/components/auth/RoleSelectionModal'

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-cream-50 font-sans text-charcoal-900">
      <RoleSelectionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="text-2xl font-serif font-bold text-charcoal-900 tracking-tight">StudioVaultPH</div>
        <div className="flex gap-4">
          <Link href="/login" className="text-charcoal-600 hover:text-charcoal-900 font-medium px-4 py-2">
            Log In
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-charcoal-900 text-cream-50 px-5 py-2 rounded-full font-medium hover:bg-charcoal-800 transition-colors"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="px-4 sm:px-6 py-16 md:py-24 max-w-5xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-serif text-charcoal-900 mb-6 leading-tight">
          Find your space.<br />
          <span className="text-charcoal-600 italic">Build your practice.</span>
        </h1>
        <p className="text-xl text-charcoal-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          The first marketplace connecting freelance Pilates instructors with premium studios — and helping clients discover affordable sessions during off-peak hours.
        </p>

        <div className="flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="group bg-charcoal-900 text-cream-50 px-8 py-4 rounded-full text-lg font-bold hover:bg-charcoal-800 transition-all flex items-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-1"
          >
            Join StudioVaultPH
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </header>


      {/* Value Props */}
      <section className="px-4 sm:px-6 py-16 bg-white border-y border-cream-200">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 items-start">

          {/* For Clients */}
          <div className="space-y-6">
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
          <div className="space-y-6 md:px-8 border-x-0 md:border-x border-cream-200">
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
          <div className="space-y-6">
            <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-charcoal-900" />
            </div>
            <h2 className="text-3xl font-serif text-charcoal-900">For Studio Owners</h2>
            <p className="text-lg text-charcoal-600">Turn your empty hours into revenue. List your unused reformers and let verified instructors book them instantly.</p>
            <ul className="space-y-3">
              {[
                'Monetize your unused studio hours',
                'Set your own hourly rates',
                'Full control over availability',
                'Automated payments and payouts'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-charcoal-700">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  {item}
                </li>
              ))}
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
