import { getStudioBySlug } from '@/lib/studio/website'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { Playfair_Display, Inter, Roboto, DM_Sans } from 'next/font/google'
import { clsx } from 'clsx'
import '@/app/globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import SetStudioCookie from '@/components/shared/SetStudioCookie'
import { createClient } from '@/lib/supabase/server'
import StorefrontChatWidget from '@/components/ai/StorefrontChatWidget'

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const roboto = Roboto({
  weight: ['400', '700', '900'],
  subsets: ['latin'],
  variable: '--font-roboto',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params
  const studio = await getStudioBySlug(slug)
  if (!studio) return {}

  const description = studio.bio || `Welcome to ${studio.name}. Experience movement and wellness at our studio.`
  const logo = studio.logo_url

  return {
    title: {
        default: studio.name,
        template: `%s | ${studio.name}`
    },
    description,
    openGraph: {
      title: studio.name,
      description,
      images: logo ? [logo] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: studio.name,
      description,
      images: logo ? [logo] : [],
    },
  }
}

export default async function StorefrontLayout(props: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await props.params
  const studio = await getStudioBySlug(slug)

  if (!studio) notFound()

  // ── Plan Selection Gate (Mandatory for Marketplace-originated studios) ──
  const ownerProfile = studio.profiles as any
  const isFreeTier = !studio.subscription_tier || studio.subscription_tier === 'free'
  
  if (ownerProfile?.origin_portal === 'marketplace' && isFreeTier) {
      // We must redirect the owner to pick a plan.
      // For visitors, we redirect them to the marketplace.
      const supabase = await createClient()
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const { redirect } = await import('next/navigation')

      if (currentUser?.id === studio.owner_id) {
          redirect('/studio/onboarding/plan')
      } else {
          redirect('/')
      }
  }

  // Legacy/Standard Gating check for SaaS model
  if (studio.subscription_status !== 'active' && process.env.NODE_ENV === 'production') {
      return (
          <html lang="en" suppressHydrationWarning>
              <body className="min-h-screen flex items-center justify-center bg-cream-50 font-serif p-8" suppressHydrationWarning>
                  <div className="text-center space-y-4">
                      <h1 className="text-4xl text-burgundy font-bold">{studio.name}</h1>
                      <p className="text-charcoal-500 italic">This site is currently undergoing maintenance. Please check back soon.</p>
                      <div className="pt-8 border-t border-cream-200">
                          <p className="text-[10px] uppercase tracking-widest text-charcoal-400">Powered by StudioVault</p>
                      </div>
                  </div>
              </body>
          </html>
      )
  }

  const theme = studio.website_config?.theme || { primaryColor: '#4A5D4E' }
  const headingFont = theme.headingFont || 'Playfair Display'
  const bodyFont = theme.bodyFont || 'Inter'

  return (
    <div className={clsx("antialiased font-sans min-h-screen", playfair.variable, inter.variable, roboto.variable, dmSans.variable)}
      style={{ 
        '--primary-brand': theme.primaryColor,
        '--button-color': theme.buttonColor || theme.primaryColor,
        '--button-radius': theme.buttonRadius || '9999px',
        '--section-padding': theme.sectionPadding || '5rem',
        '--card-shadow': theme.cardShadow || '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        '--font-heading': theme.headingFont ? theme.headingFont : (theme.fontFamily === 'Roboto' ? 'var(--font-roboto)' : 'var(--font-playfair)'),
        '--font-body': theme.bodyFont ? theme.bodyFont : (theme.fontFamily === 'DM Sans' ? 'var(--font-dm-sans)' : 'var(--font-inter)'),
        '--global-text': theme.textColor || '#1b1c19',
        '--global-bg': theme.background || '#faf9f6',
        backgroundColor: 'var(--global-bg)',
        color: 'var(--global-text)'
      } as any}
    >
      <SetStudioCookie slug={slug} />
      {/* Dynamic Font Loading from Google Fonts */}
      <link 
          rel="stylesheet" 
          href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(headingFont)}:wght@400;700;900&family=${encodeURIComponent(bodyFont)}:wght@400;700;900&display=swap`} 
      />
      
      {/* Isolated Container: No Global Nav/Footer */}
      <main className="min-h-screen relative overflow-x-hidden">
        {/* Subtle Texture Overlay (Premium Feel) */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply" 
            style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/felt.png")` }} 
        />
        {props.children}
      </main>

      {/* Simple Whitelabel Footer */}
      <footer className="py-12 px-6 border-t border-cream-100 bg-white">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                  <h3 className="text-xl font-serif font-bold text-[var(--primary-brand)] mb-2">{studio.name}</h3>
                  <p className="text-xs text-charcoal-400 max-w-xs">{studio.address}</p>
              </div>
              <div className="flex flex-col items-center md:items-end gap-2">
                   <p className="text-[9px] font-black uppercase tracking-[0.3em] text-charcoal-300">
                      Powered by StudioVault
                   </p>
              </div>
          </div>
      </footer>

      {/* Floating WhatsApp Button */}
      {studio.show_whatsapp_button && studio.whatsapp_number && (
          <a 
            href={`https://wa.me/${studio.whatsapp_number.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-8 right-8 z-[999] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group"
            title="Chat with us on WhatsApp"
          >
              <svg 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                className="w-6 h-6"
              >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.933 3.653 1.427 5.71 1.43h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="absolute right-full mr-4 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                  Chat with us
              </span>
          </a>
      )}

      {/* AI Chat Concierge */}
      {(studio.website_config as any)?.floatingWidgets?.aiChat?.enabled && (
          <StorefrontChatWidget 
            studioSlug={slug}
            studioName={studio.name}
            primaryColor={theme.primaryColor}
          />
      )}
    </div>
  )
}
