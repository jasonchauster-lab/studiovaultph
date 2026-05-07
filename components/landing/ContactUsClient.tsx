'use client'

import { useState } from 'react'
import Header from './Header'
import Footer from './Footer'
import RoleSelectionModal from '@/components/auth/RoleSelectionModal'
import DemoModal from '@/components/forms/DemoModal'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Phone, MapPin, Mail, ArrowRight, MessageCircle, Laptop } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function ContactUsClient() {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)

  const openRoleModal = () => setIsRoleModalOpen(true)
  const closeRoleModal = () => setIsRoleModalOpen(false)

  const openDemoModal = () => setIsDemoModalOpen(true)
  const closeDemoModal = () => setIsDemoModalOpen(false)

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/10 selection:text-primary relative font-sans overflow-x-hidden">
      <RoleSelectionModal isOpen={isRoleModalOpen} onClose={closeRoleModal} />
      <DemoModal isOpen={isDemoModalOpen} onClose={closeDemoModal} />
      
      <Header onSignUpClick={openRoleModal} />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center text-center px-6 overflow-hidden">
          <Image
            src="/images/contact/hero_bg.png"
            alt="Studio Vault Studio"
            fill
            className="object-cover brightness-[0.4]"
            priority
          />
          <div className="relative z-10 max-w-4xl mx-auto">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-4xl md:text-6xl lg:text-7xl font-serif text-white mb-6 leading-[1.1]"
            >
              Let&apos;s create the <br />
              <span className="italic">magic together.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            >
              Have questions? Reach out and one of our team members will get back to you as soon as possible.
            </motion.p>
          </div>
        </section>

        {/* Engagement Cards Section */}
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Demo Card */}
            <motion.div 
              whileHover={{ y: -8 }}
              className="atelier-card group"
            >
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                <Laptop className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif text-primary mb-4">Demo and Pricing</h3>
              <p className="text-primary/60 mb-8 leading-relaxed">
                Contact our sales for pricing and book a demo to find the plan that&apos;s right for you.
              </p>
              <Button 
                onClick={openDemoModal}
                className="w-full sm:w-auto"
                icon={ArrowRight}
              >
                Book a Demo
              </Button>
            </motion.div>

            {/* Support Card */}
            <motion.div 
              whileHover={{ y: -8 }}
              className="atelier-card group"
            >
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif text-primary mb-4">Get Support</h3>
              <p className="text-primary/60 mb-8 leading-relaxed">
                Find answers to common problems or get specific help for your business.
              </p>
              <Button 
                variant="outline"
                href="/support"
                className="w-full sm:w-auto"
                icon={ArrowRight}
              >
                Get Help
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Let's Connect Section */}
        <section className="py-24 px-6 md:px-12 bg-white border-t border-cream-200">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl">
              <Image
                src="/images/contact/connect_team.png"
                alt="Studio Vault Team"
                fill
                className="object-cover"
              />
            </div>
            
            <div>
              <span className="label-atelier text-primary/40 mb-4 block">Reach Out</span>
              <h2 className="text-4xl md:text-5xl font-serif text-primary mb-8">Let&apos;s Connect</h2>
              <p className="text-primary/60 text-lg mb-12 leading-relaxed">
                We know what service based businesses need. We have created an all in one software which is simple, affordable and based in the Philippines.
              </p>

              <div className="space-y-8">
                <div className="flex items-start gap-6 group">
                  <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="label-atelier text-[10px] mb-1">Phone</p>
                    <p className="text-primary font-medium">+63 9XX XXX XXXX</p>
                  </div>
                </div>

                <div className="flex items-start gap-6 group">
                  <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="label-atelier text-[10px] mb-1">Office</p>
                    <p className="text-primary font-medium">Makati City, Metro Manila, Philippines</p>
                  </div>
                </div>

                <div className="flex items-start gap-6 group">
                  <div className="w-12 h-12 bg-cream-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/5 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="label-atelier text-[10px] mb-1">Email</p>
                    <p className="text-primary font-medium">hello@studiovaultph.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
