'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

const images = [
  {
    src: '/images/homepage/hero_lifestyle_reformer.png',
    alt: 'Pilates Reformer Session'
  },
  {
    src: '/images/builder/v_yoga.png',
    alt: 'Yoga Practice'
  },
  {
    src: '/images/builder/v_dance.png',
    alt: 'Dance Movement'
  },
  {
    src: '/images/builder/v_pilates.png',
    alt: 'Pilates Precision'
  }
]

export default function HeroBackground() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length)
    }, 6000) // 6 seconds per image
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-primary">
      <AnimatePresence>
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 2.5, 
            ease: [0.4, 0, 0.2, 1] // Better easing for cinematic feel
          }}
          style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
          className="absolute inset-0"
        >
          <Image
            src={images[index].src}
            alt={images[index].alt}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </motion.div>
      </AnimatePresence>

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-primary/20 z-10" />
      <div className="absolute inset-0 bg-black/20 z-10" />

      {/* Background Preloader - ensures next image is always ready */}
      <div className="hidden">
        <Image
          src={images[(index + 1) % images.length].src}
          alt="Preloader"
          width={1}
          height={1}
          priority
        />
      </div>
    </div>
  )
}
