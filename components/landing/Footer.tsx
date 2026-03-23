import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
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
            <Link
              key={link}
              href={`/${link.toLowerCase().replace(/ /g, '-')}`}
              className="label-atelier hover:text-primary transition-colors underline decoration-primary/0 hover:decoration-primary/20 underline-offset-8"
            >
              {link}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
