import LandingClientWrapper from '@/components/landing/LandingClientWrapper'
import FeaturesSection from '@/components/landing/FeaturesSection'
import MethodologySection from '@/components/landing/MethodologySection'
import PhilosophySection from '@/components/landing/PhilosophySection'
import AudienceSection from '@/components/landing/AudienceSection'
import Footer from '@/components/landing/Footer'

import { createClient } from '@/lib/supabase/server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function LandingPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  const query = await searchParams
  const code = query.code as string

  // If we land here with a code, it means Supabase fell back to the Site URL.
  // We redirect to the callback route which now knows how to use the 'sb_auth_context' cookie
  // to return the user to their original studio/branch.
  if (code) {
    redirect(`/auth/callback?code=${code}`)
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  
  let profile = null
  let avatarUrl = ''

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    profile = profileData
    avatarUrl = profileData?.avatar_url || ''
  }

  return (
    <LandingClientWrapper
      features={<FeaturesSection />}
      methodology={<MethodologySection />}
      philosophy={<PhilosophySection />}
      audience={<AudienceSection />}
      footer={<Footer />}
      profile={profile}
      avatarUrl={avatarUrl}
    />
  )
}
