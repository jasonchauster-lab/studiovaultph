'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Shield, Lock, Eye, FileText } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-off-white selection:bg-forest/10 selection:text-charcoal font-sans">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full px-4 md:px-8 py-6">
        <nav className="max-w-7xl mx-auto bg-white rounded-xl px-4 sm:px-10 py-5 flex items-center justify-between shadow-tight border border-border-grey">
          <Link href="/" aria-label="Studio Vault PH Home" className="flex items-center gap-1 group">
            {/* Desktop Logo */}
            <div className="hidden sm:block">
              <Image 
                src="/logo4.png" 
                alt="" 
                width={120} 
                height={48} 
                className="h-10 md:h-12 w-auto object-contain" 
              />
            </div>
            {/* Mobile Logo */}
            <div className="block sm:hidden">
                        <Image
                            src="/logo4.png"
                            alt="Studio Vault Logo"
                            width={160}
                            height={40}
                            className="h-10 w-auto object-contain hidden md:block"
                        />     </div>
            <span className="text-xl font-serif font-bold text-charcoal tracking-tighter uppercase hidden sm:block">STUDIO VAULT PH</span>
          </Link>
          <Link 
            href="/" 
            className="flex items-center gap-2 text-slate-600 hover:text-charcoal text-[10px] font-bold uppercase tracking-[0.3em] transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <div className="space-y-12">
          {/* Header Section */}
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center gap-4 bg-white border border-border-grey px-6 py-3 rounded-lg shadow-tight">
              <Shield className="w-4 h-4 text-forest" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Our Commitment to Privacy</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif text-charcoal tracking-tighter leading-[1.1]">
              Privacy <span className="text-forest italic">Policy.</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Last Updated: March 11, 2026</p>
          </div>

          {/* Intro Card */}
          <div className="bg-white border border-border-grey p-8 md:p-12 rounded-xl shadow-tight space-y-6">
            <p className="text-lg text-charcoal-700 font-medium leading-relaxed">
              At Studio Vault PH, we value your privacy and are committed to protecting your personal data. This Privacy Policy outlines how we collect, use, and safeguard your information when you use our platform.
            </p>
          </div>

          {/* Policy Sections */}
          <div className="grid gap-8">
            <section className="bg-white border border-border-grey p-8 md:p-12 rounded-xl shadow-tight space-y-6">
              <div className="flex items-center gap-4 text-forest">
                <Eye className="w-6 h-6" />
                <h2 className="text-2xl font-serif text-charcoal tracking-tight">1. Information We Collect</h2>
              </div>
              <div className="space-y-4 text-charcoal-700 leading-relaxed font-medium">
                <p>We collect information that you provide directly to us when you create an account, update your profile, or communicate with us. This may include:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><span className="text-charcoal font-bold">Account Information:</span> Name, email address, phone number, and password.</li>
                  <li><span className="text-charcoal font-bold">Profile Information:</span> Biography, certifications, studio details, and photos.</li>
                  <li><span className="text-charcoal font-bold">Payment Information:</span> Transaction history and billing details (processed securely via our partners).</li>
                  <li><span className="text-charcoal font-bold">Usage Data:</span> Information about how you interact with our platform.</li>
                </ul>
              </div>
            </section>

            <section className="bg-white border border-border-grey p-8 md:p-12 rounded-xl shadow-tight space-y-6">
              <div className="flex items-center gap-4 text-forest">
                <FileText className="w-6 h-6" />
                <h2 className="text-2xl font-serif text-charcoal tracking-tight">2. How We Use Your Information</h2>
              </div>
              <div className="space-y-4 text-charcoal-700 leading-relaxed font-medium">
                <p>Your information is used to provide and improve our services, including:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Facilitating bookings between instructors and studios.</li>
                  <li>Verifying identities to maintain a professional network.</li>
                  <li>Processing payments and managing account earnings.</li>
                  <li>Communicating important updates and support responses.</li>
                  <li>Optimizing the platform experience based on user feedback.</li>
                </ul>
              </div>
            </section>

            <section className="bg-white border border-border-grey p-8 md:p-12 rounded-xl shadow-tight space-y-6">
              <div className="flex items-center gap-4 text-forest">
                <Lock className="w-6 h-6" />
                <h2 className="text-2xl font-serif text-charcoal tracking-tight">3. Data Security & Protection</h2>
              </div>
              <div className="space-y-4 text-charcoal-700 leading-relaxed font-medium">
                <p>
                  Security is at the heart of Studio Vault PH. We implement industry-standard technical and organizational measures to protect your data against unauthorized access, loss, or alteration.
                </p>
                <p>
                  We do not sell your personal data to third parties. We only share information with partners necessary to provide our services (e.g., payment processors) or when required by law.
                </p>
              </div>
            </section>

            <section className="bg-white border border-border-grey p-8 md:p-12 rounded-xl shadow-tight space-y-6">
              <div className="flex items-center gap-4 text-forest">
                <Shield className="w-6 h-6" />
                <h2 className="text-2xl font-serif text-charcoal tracking-tight">4. Your Rights</h2>
              </div>
              <div className="space-y-4 text-charcoal-700 leading-relaxed font-medium">
                <p>You have the right to access, correct, or delete your personal information at any time. You can manage most of these settings directly within your account dashboard.</p>
                <p>For any specific requests or questions regarding your data, please contact our support team.</p>
              </div>
            </section>
          </div>

          {/* Contact Section */}
          <div className="text-center py-12 space-y-6">
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">Questions regarding our policy?</p>
            <Link 
              href="/support"
              className="inline-block bg-charcoal text-white px-10 py-5 rounded-lg text-[10px] font-bold uppercase tracking-[0.3em] hover:brightness-[1.2] transition-all shadow-tight"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="px-4 md:px-8 py-12 border-t border-border-grey bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-bold text-slate uppercase tracking-[0.3em]">&copy; 2026 STUDIO VAULT PH. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8 text-[10px] font-bold text-slate uppercase tracking-[0.3em]">
            <Link href="/terms-of-service" className="hover:text-forest transition-all">Terms of Service</Link>
            <Link href="/support" className="hover:text-forest transition-all">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
