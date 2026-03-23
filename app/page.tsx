import LandingClientWrapper from '@/components/landing/LandingClientWrapper'
import FeaturesSection from '@/components/landing/FeaturesSection'
import MethodologySection from '@/components/landing/MethodologySection'
import PhilosophySection from '@/components/landing/PhilosophySection'
import AudienceSection from '@/components/landing/AudienceSection'
import Footer from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <LandingClientWrapper
      features={<FeaturesSection />}
      methodology={<MethodologySection />}
      philosophy={<PhilosophySection />}
      audience={<AudienceSection />}
      footer={<Footer />}
    />
  )
}
