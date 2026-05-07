'use client'

import Image from 'next/image'
import { ArrowRight, Sparkles, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import HeroBackground from './HeroBackground'

interface HeroProps {
  onSignUpClick: () => void
}

export default function Hero({ onSignUpClick }: HeroProps) {
  const [host, setHost] = useState('')

  useEffect(() => {
    setHost(window.location.hostname)
  }, [])

  const isPortal = host.includes('studiovault.co') || host.includes('studiovault.local')

  return (
    <section className="relative h-screen min-h-[800px] w-full flex items-center overflow-hidden">
      {/* Background Layer */}
      <HeroBackground />

      {/* Content Container */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center justify-between gap-16">
        
        {/* Left: Principal Content */}
        <div className="flex-1 flex flex-col gap-y-8 md:gap-y-12">
          <div className="flex flex-col gap-4">
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className={clsx(
                "text-6xl md:text-8xl lg:text-9xl !text-white tracking-tighter leading-[0.95] drop-shadow-2xl",
                isPortal ? "font-serif" : "font-sans font-black"
              )}
            >
              {isPortal ? (
                <>Elevating the <br /><em className="italic font-light">Studio</em></>
              ) : (
                <>The Heart <br />of Pilates</>
              )}
            </motion.h1>
            <motion.span 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              className={clsx(
                "text-6xl md:text-8xl lg:text-9xl italic font-light !text-white/90 tracking-tighter drop-shadow-2xl",
                isPortal ? "font-serif" : "font-sans"
              )}
            >
              {isPortal ? "Experience." : "Marketplace."}
            </motion.span>
          </div>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.7 }}
            className="text-lg md:text-2xl text-white/70 leading-relaxed max-w-xl font-light"
          >
            {isPortal 
              ? "The professional marketplace connecting certified instructors with elite boutique studios. Optimized flow and seamless management."
              : "Discover the Philippines' most elite Pilates studios and certified instructors. Your journey to movement starts here."
            }
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-8 items-center"
          >
            <button
              type="button"
              onClick={onSignUpClick}
              className={clsx(
                "w-full sm:w-auto px-12 py-6 text-[11px] !shadow-2xl flex items-center gap-3 justify-center transition-all active:scale-95",
                isPortal ? "btn-primary-atelier" : "bg-[#2D3282] text-white rounded-2xl hover:bg-indigo-700 font-bold uppercase tracking-widest"
              )}
            >
              Get Started Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center gap-5 py-2">
              <div className="flex -space-x-4">
                {[
                  { src: "/images/avatars/instructor_1.png", alt: "Instructor" },
                  { src: "/images/avatars/client_1.png", alt: "Client" },
                  { src: "/images/avatars/instructor_2.png", alt: "Instructor" }
                ].map((avatar, i) => (
                  <div key={i} className="w-14 h-14 rounded-full border-4 border-white/10 bg-white/5 flex items-center justify-center overflow-hidden shadow-2xl relative">
                    <Image
                      src={avatar.src}
                      alt={avatar.alt}
                      fill
                      sizes="100px"
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
              <p className="label-atelier leading-tight !tracking-[0.4em] text-[9px] text-white/50">
                Validated by<br /><span className="text-white/80">Certified Professionals</span>
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right: Floating Info Card (Glassmorphism) */}
        <motion.div
           initial={{ opacity: 0, scale: 0.9, x: 20 }}
           animate={{ opacity: 1, scale: 1, x: 0 }}
           transition={{ duration: 1, ease: "easeOut", delay: 1.2 }}
           className="hidden lg:block relative"
        >
          <div className="glass-card p-10 max-w-xs border border-white/20 shadow-2xl bg-white/10">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8 shadow-inner">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <p className="label-atelier text-white mb-3 !tracking-[0.5em] text-[10px]">Validated Excellence</p>
            <p className="text-base text-white/70 font-light leading-relaxed">
              Every instructor and studio on our platform is hand-verified for certified quality and equipment standards.
            </p>
            <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Sparkles key={i} className="w-3 h-3 text-white/40" />
                ))}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Verified Tier</span>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-white/5 blur-3xl rounded-full" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/20 blur-3xl rounded-full" />
        </motion.div>
      </div>

      {/* Scroll Hint */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 cursor-pointer group"
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
      >
        <span className="label-atelier text-white/30 group-hover:text-white/60 transition-colors !tracking-[0.6em]">Discover More</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-6 h-6 text-white/20 group-hover:text-white/50 transition-colors" />
        </motion.div>
      </motion.div>
    </section>
  )
}
