'use client'

import Link from 'next/link'
import Image from 'next/image'

interface HeaderProps {
  onSignUpClick: () => void
}

export default function Header({ onSignUpClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full px-4 md:px-8 py-4">
      <nav className="relative max-w-7xl mx-auto glass-nav rounded-2xl px-6 sm:px-10 py-4 flex items-center justify-between shadow-ambient">
        <Link href="/" aria-label="Studio Vault Home" className="group">
          <Image
            src="/logo4.png"
            alt="Studio Vault"
            width={260}
            height={70}
            className="h-12 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
            priority
          />
        </Link>
        <div className="hidden md:flex gap-10 items-center">
          {[
            { name: 'Features', href: '#features' },
            { name: 'Methodology', href: '#methodology' },
            { name: 'Philosophy', href: '#philosophy' },
            { name: 'For Everyone', href: '#audience' }
          ].map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="label-atelier hover:text-primary transition-colors cursor-pointer"
            >
              {link.name}
            </a>
          ))}
        </div>
        <div className="flex gap-8 items-center">
          <Link href="/login" className="label-atelier hover:text-primary transition-colors">
            Log In
          </Link>
          <button
            type="button"
            onClick={onSignUpClick}
            className="btn-outline-atelier"
          >
            Sign Up
          </button>
        </div>
      </nav>
    </header>
  )
}
