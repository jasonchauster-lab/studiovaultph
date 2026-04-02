'use client'

import Image from 'next/image'
import { ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

interface HeroProps {
  onSignUpClick: () => void
}

export default function Hero({ onSignUpClick }: HeroProps) {
  return (
    <section className="relative px-6 md:px-12 py-24 md:py-48 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24 overflow-hidden">
      {/* Left: Content */}
      <div className="flex-1 w-full flex flex-col gap-y-10 relative z-10 lg:pr-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="vault-badge w-fit"
        >
          A Grounded Approach to Movement
        </motion.div>

        <div className="flex flex-col gap-2">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-serif text-primary tracking-tight leading-[1.05]"
          >
            Elevating the <br />
            <em className="not-italic">Studio</em>
          </motion.h1>
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
            className="text-5xl md:text-7xl lg:text-8xl italic font-light font-serif text-primary tracking-tight"
          >
            Experience.
          </motion.span>
        </div>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.7 }}
          className="text-lg md:text-xl text-muted-surface leading-loose max-w-lg"
        >
          The professional marketplace connecting certified instructors with elite boutique studios. Optimized flow, verified networks, and seamless management.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-6 items-center"
        >
          <button
            type="button"
            onClick={onSignUpClick}
            className="btn-primary-atelier w-full sm:w-auto px-12 py-6 text-[11px]"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex items-center gap-5 py-2">
            <div className="flex -space-x-3">
              {[
                { src: "/images/avatars/instructor_1.png", alt: "Instructor" },
                { src: "/images/avatars/client_1.png", alt: "Client" },
                { src: "/images/avatars/instructor_2.png", alt: "Instructor" }
              ].map((avatar, i) => (
                <div key={i} className="w-12 h-12 rounded-full border-4 border-surface bg-primary/10 flex items-center justify-center overflow-hidden shadow-ambient relative">
                  <Image
                    src={avatar.src}
                    alt={avatar.alt}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <p className="label-atelier leading-tight !tracking-[0.3em] text-[8px]">
              Validated by<br />Certified Professionals
            </p>
          </div>
        </motion.div>
      </div>

      {/* Right: Lifestyle Image */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
        className="flex-1 relative w-full lg:h-[700px] lg:-mr-20"
      >
        <div className="w-full h-full min-h-[450px] lg:min-h-[700px] rounded-xl overflow-hidden shadow-ambient group bg-surface-container-low relative">
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 5, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src="/images/homepage/hero_pilates_lifestyle.png"
              alt="Instructor and client using a Pilates reformer together"
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-105"
              sizes="(max-width: 1024px) 100vw, 900px"
              priority
            />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut", delay: 1.2 }}
            className="absolute -bottom-6 -left-6 p-8 bg-white rounded-2xl flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] max-w-sm border border-surface-container-highest"
          >
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-lg shrink-0">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="label-atelier text-primary mb-1 !tracking-[0.3em]">Validated Excellence</p>
              <p className="text-sm text-muted-surface font-medium leading-relaxed">Certified Equipment and Verified Partners.</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
