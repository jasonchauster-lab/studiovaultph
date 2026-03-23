'use client'

import { useState } from 'react'
import Header from './Header'
import Hero from './Hero'
import RoleSelectionModal from '@/components/auth/RoleSelectionModal'

interface LandingClientWrapperProps {
  features: React.ReactNode
  methodology: React.ReactNode
  philosophy: React.ReactNode
  audience: React.ReactNode
  footer: React.ReactNode
}

export default function LandingClientWrapper({
  features,
  methodology,
  philosophy,
  audience,
  footer
}: LandingClientWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openModal = () => setIsModalOpen(true)
  const closeModal = () => setIsModalOpen(false)

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/10 selection:text-primary relative font-sans">
      <RoleSelectionModal isOpen={isModalOpen} onClose={closeModal} />
      
      <Header onSignUpClick={openModal} />
      
      <main>
        <Hero onSignUpClick={openModal} />
        {features}
        {methodology}
        {philosophy}
        {audience}
      </main>

      {footer}
    </div>
  )
}
