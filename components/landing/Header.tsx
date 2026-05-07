'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

import ProfileDropdown from '@/components/dashboard/ProfileDropdown'

interface HeaderProps {
  onSignUpClick: () => void
  profile?: any
  avatarUrl?: string
}

export default function Header({ onSignUpClick, profile, avatarUrl }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [host, setHost] = useState('')

  useEffect(() => {
    setHost(window.location.hostname)
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header 
      style={{
        transform: isScrolled ? 'translateY(4px)' : 'translateY(0)'
      }}
      className={`fixed top-0 left-0 right-0 z-[60] px-4 md:px-12 py-2 md:py-4 transition-all duration-700 pointer-events-none flex items-center justify-between`}
    >
      {/* Dynamic Logo & Identity Container */}
      <div className="flex items-center gap-6 pointer-events-auto transition-all duration-700">
        <Link href="/" aria-label="Studio Vault Home" className="group shrink-0">
          <Image
            src="/logo4.png"
            alt="Studio Vault"
            width={800}
            height={240}
            className={`w-auto object-contain transition-all duration-700 group-hover:scale-105 drop-shadow-2xl ${isScrolled ? 'h-14 md:h-16 blur-[0.1px]' : 'h-18 md:h-22'}`}
            priority
          />
        </Link>

        {/* Global Positioning Badge - Only for CMS Portal */}
        {host.includes('studiovault.co') && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
            className="vault-badge hidden lg:block !bg-white/10 !text-white backdrop-blur-md border border-white/20 !py-2 !px-4 !text-[8.5px] whitespace-nowrap"
          >
            A Grounded Approach to Movement
          </motion.div>
        )}
      </div>

      {/* Sleek Navigation Pill - Independent Float */}
      <nav 
        className={`pointer-events-auto glass-nav rounded-full px-10 py-3 flex items-center gap-10 shadow-2xl transition-all duration-700 border border-white/5 ${isScrolled ? 'scale-90 origin-right translate-x-2' : ''}`}
      >
        <div className="hidden md:flex gap-12 items-center">
          {[
            { name: 'Features', href: '/#features' },
            { name: 'Methodology', href: '/#methodology' },
            { name: 'Philosophy', href: '/#philosophy' },
            { name: 'For Everyone', href: '/#audience' },
            { name: 'Contact Us', href: '/contact-us' }
          ].map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="label-atelier hover:text-primary transition-colors cursor-pointer !tracking-[0.5em] text-[10px]"
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex gap-10 items-center">
          {profile ? (
            <ProfileDropdown profile={profile} avatarUrl={avatarUrl || ''} />
          ) : (
            <>
              <Link href="/login" className="label-atelier hover:text-primary transition-colors !tracking-[0.4em] text-[10px]">
                Log In
              </Link>
              <button
                type="button"
                onClick={onSignUpClick}
                className="btn-outline-atelier !py-2.5 !px-6 !text-[9px] !rounded-full border-primary/50 hover:border-primary hover:bg-primary hover:text-white transition-all shadow-md active:scale-95"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
